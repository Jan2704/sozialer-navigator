import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Minus, ChevronRight, Sparkles, Calculator, AlertTriangle, TrendingUp, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// =========================================================
// BRAIN v3.0 — Konstanten & Datentabellen
// =========================================================

/** Mietstufen der großen deutschen Städte (Wohngeldgesetz 2023) */
const CITY_MIETSTUFE = {
  'münchen': 7, 'munich': 7,
  'berlin': 6, 'hamburg': 6, 'frankfurt': 6, 'stuttgart': 6,
  'köln': 5, 'cologne': 5, 'düsseldorf': 5, 'wiesbaden': 5,
  'heidelberg': 5, 'freiburg': 5, 'münchen': 7,
  'dortmund': 4, 'essen': 4, 'bremen': 4, 'hannover': 4,
  'nürnberg': 4, 'bonn': 4, 'mannheim': 4, 'karlsruhe': 4,
  'augsburg': 4, 'mainz': 4, 'münster': 4, 'aachen': 4,
  'kiel': 4, 'potsdam': 4, 'lübeck': 3, 'erfurt': 3,
  'rostock': 3, 'magdeburg': 3, 'chemnitz': 3, 'halle': 3,
  'bielefeld': 3, 'wuppertal': 3, 'bochum': 3, 'duisburg': 3,
  'krefeld': 3, 'oberhausen': 3, 'hagen': 3, 'kassel': 3,
  'saarbrücken': 3, 'osnabrück': 3, 'leverkusen': 3,
};

/**
 * Wohngeld-Tabelle 2026: Höchstbeträge für berücksichtigungsfähige Miete
 * Index: [Personenanzahl-1][Mietstufe-1]  (Stufen I–VII)
 */
const WG_MAX_RENT = [
  [392, 426, 469, 512, 562, 619, 711],  // 1 Person
  [477, 520, 577, 629, 694, 763, 880],  // 2 Personen
  [574, 626, 693, 756, 833, 918, 1059], // 3 Personen
  [671, 732, 810, 884, 973, 1071, 1236],// 4 Personen
  [751, 820, 908, 990, 1090, 1201, 1384],// 5+ Personen
];

/**
 * Wohngeld-Formel-Koeffizienten 2026 (§ 19 WoGG)
 * WG = M − (a + b·Y + c·M) · Y   mit M = Mindestmiete, Y = Jahreseinkommen
 */
const WG_COEFF = [
  { a: 0.04, b: 0.000321, c: 0.000127 }, // 1 P
  { a: 0.04, b: 0.000261, c: 0.000104 }, // 2 P
  { a: 0.04, b: 0.000220, c: 0.000088 }, // 3 P
  { a: 0.04, b: 0.000190, c: 0.000076 }, // 4 P
  { a: 0.04, b: 0.000168, c: 0.000067 }, // 5+ P
];

/** Bürgergeld Regelbedarfsstufen 2026 (§ 28 SGB XII) */
const BG_SÄTZE = {
  adult_single:   563,
  adult_partner:  506,
  youth_14_17:    471,
  youth_6_13:     390,
  child_0_5:      357,
};

const KIZ_MAX_PER_CHILD = 297; // Kinderzuschlag 2026 (max. pro Kind/Monat)

// =========================================================
// BRAIN v3.0 — NER (Named Entity Recognition)
// =========================================================

function extractEntities(text) {
  const ent = {};
  const lower = text.toLowerCase();

  // --- Einkommen ---
  const incomeRgx = [
    /(?:netto|verdien(?:e|t)?|einkomm(?:en)?|lohn|gehalt|rente)\s*(?:von\s+)?(\d{1,4}(?:[.,]\d{2,3})?)\s*(?:€|euro|eur)?/i,
    /(\d{1,4}(?:[.,]\d{2,3})?)\s*(?:€|euro|eur)\s*(?:netto|im\s+monat|monatlich)/i,
    /^(\d{3,4})\s*(?:€|euro|eur)?$/i,
    /(\d{1,4}[.,]\d{3})\s*(?:€|euro)/i,
  ];
  for (const r of incomeRgx) {
    const m = text.match(r);
    if (m) { ent.income = parseFloat(m[1].replace(/\./g, '').replace(',', '.')); break; }
  }
  // einfacher Fallback: Zahl gefolgt von € oder Euro
  if (!ent.income) {
    const fb = text.match(/(\d{3,4})\s*(?:€|euro)/i);
    if (fb) ent.income = parseFloat(fb[1]);
  }

  // --- Kinder ---
  if (/keine?\s*kind(?:er)?/i.test(text)) {
    ent.children = 0;
  } else {
    const cm = text.match(/(\d+)\s*kind(?:er)?/i) || text.match(/ein(?:em?)?\s+kind/i);
    if (cm) ent.children = cm[1] ? parseInt(cm[1]) : 1;
  }

  // --- Haushaltsgröße ---
  if (/allein(?:stehend)?|single|nur\s+ich/i.test(text)) ent.householdSize = 1;
  else if (/zu\s+zweit|wir\s+sind\s+2|2\s+personen/i.test(text)) ent.householdSize = 2;
  else if (/zu\s+dritt|wir\s+sind\s+3|3\s+personen/i.test(text)) ent.householdSize = 3;
  else if (/zu\s+viert|wir\s+sind\s+4|4\s+personen/i.test(text)) ent.householdSize = 4;
  else if (/zu\s+fünft|wir\s+sind\s+5|5\s+personen/i.test(text)) ent.householdSize = 5;

  // --- Miete ---
  // Reihenfolge: spezifischste Patterns zuerst, € optional überall
  const rentRgx = [
    /(?:zahle|bezahle)\s+(\d{2,4})\s*(?:€|euro)?\s+(?:miete|kaltmiete|kalt)/i,
    /(\d{2,4})\s*(?:€|euro)\s+(?:miete|kaltmiete)/i,
    /(?:miete|kaltmiete)\s*(?:von\s+|beträgt\s+|ist\s+|:)?\s*(\d{2,4})\s*(?:€|euro)?/i,
    /(\d{2,4})\s+(?:miete|kaltmiete)/i,
  ];
  for (const r of rentRgx) {
    const m = text.match(r);
    if (m) { ent.rent = parseFloat(m[1]); break; }
  }

  // --- Stadt ---
  for (const city of Object.keys(CITY_MIETSTUFE)) {
    if (lower.includes(city)) { ent.city = city; break; }
  }

  // --- Lebenssituation ---
  if (/arbeitslos|jobcenter|gekündigt|entlassen|kein\s+job|ohne\s+arbeit/i.test(text)) ent.situation = 'unemployed';
  if (/rentner(?:in)?|rente|im\s+ruhestand|pension/i.test(text)) ent.situation = 'retired';
  if (/student(?:in)?|studium|uni(?:versität)?|hochschule|bafög/i.test(text)) ent.situation = 'student';
  if (/azubi|ausbildung|lehrling|bab/i.test(text)) ent.situation = 'apprentice';

  // --- Krisenmarker ---
  ent.isCrisis = /strom\s+abg(?:eschaltet)?|wasser\s+abg(?:estellt)?|obdachlos|delogier|räumungsklage|pfändung|gerichtsvollzieher|wohnungslos/i.test(text);

  return ent;
}

// =========================================================
// BRAIN v3.0 — Intent-Scoring
// =========================================================

const INTENT_RULES = [
  { id: 'crisis',           kw: [['strom abgeschaltet',10],['wasser abgestellt',10],['obdachlos',10],['räumungsklage',10],['pfändung',8],['gerichtsvollzieher',8],['notsituation',7],['delogier',9]] },
  { id: 'ablehnung',        kw: [['abgelehnt',8],['ablehnung',8],['widerspruch',7],['bescheid',5],['einspruch',5],['klage',4],['nicht genehmigt',6],['widerspruch einlegen',9]] },
  { id: 'antrag_hilfe',     kw: [['antrag',4],['beantragen',5],['formular',4],['unterlagen',4],['dokumente',3],['nachweise',3],['ausfüllen',4],['einreichen',3],['wie beantrage',6]] },
  { id: 'anspruch_check',   kw: [['anspruch',5],['berechtigt',5],['zustehen',5],['bekomme ich',4],['habe ich anspruch',7],['darf ich',3],['anrecht',4]] },
  { id: 'berechnung',       kw: [['wie viel',5],['wieviel',5],['betrag',4],['höhe',4],['berechnen',4],['wie hoch',3],['schätzen',3],['ungefähr',2]] },
  { id: 'wohngeld',         kw: [['wohngeld',9],['mietzuschuss',6],['wohnzuschuss',6],['mietbonus',5]] },
  { id: 'buergergeld',      kw: [['bürgergeld',9],['hartz',6],['alg2',6],['alg ii',6],['jobcenter',5],['arbeitslosengeld',5],['grundsicherung',4]] },
  { id: 'kinderzuschlag',   kw: [['kinderzuschlag',9],['kiz',9],['kindergeld',4],['kinder',2]] },
  { id: 'rentner',          kw: [['rente',5],['rentner',8],['rentnerin',8],['grundsicherung im alter',9],['altersrente',6],['pension',4],['im ruhestand',7]] },
  { id: 'student',          kw: [['student',6],['studium',5],['bafög',8],['uni ',4],['hochschule',4],['studieren',5]] },
  { id: 'azubi',            kw: [['azubi',8],['ausbildung',6],['lehrling',7],['bab',8],['berufsausbildungsbeihilfe',9]] },
  { id: 'wbs',              kw: [['wbs',9],['wohnberechtigungsschein',10],['sozialwohnung',7]] },
  { id: 'vermoegen',        kw: [['vermögen',7],['sparbuch',6],['erspartes',6],['ersparnisse',6],['schonvermögen',8],['guthaben',5]] },
  { id: 'greeting',         kw: [['hallo',5],['hi',5],['guten morgen',5],['guten abend',5],['moin',5],['hey',4],['servus',4]] },
  { id: 'danke',            kw: [['danke',8],['vielen dank',9],['super',5],['toll',4],['perfekt',5]] },
  // Dateneingabe ohne explizite Frage – Nutzer liefert Einkommens-/Mietdaten
  { id: 'data_provision',   kw: [['verdiene',4],['netto',3],['gehalt',4],['lohn',4],['miete',3],['zahle',3],['wohne in',4],['wohn',2]] },
];

function detectIntent(text) {
  const lower = text.toLowerCase();
  const scores = {};
  for (const rule of INTENT_RULES) {
    let score = 0;
    for (const [word, w] of rule.kw) { if (lower.includes(word)) score += w; }
    if (score > 0) scores[rule.id] = score;
  }
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return sorted.length > 0 ? sorted[0][0] : 'fallback';
}

// =========================================================
// BRAIN v3.0 — Berechnungen
// =========================================================

function calcWohngeld(income, rent, persons, city) {
  const stufe   = CITY_MIETSTUFE[city] || 3;
  const pIdx    = Math.min(Math.max(persons, 1), 5) - 1;
  const sIdx    = stufe - 1;
  const maxM    = WG_MAX_RENT[pIdx][sIdx];
  const M       = Math.min(rent, maxM);
  const { a, b, c } = WG_COEFF[pIdx];
  // Jahreseinkommen aus monatlichem Netto (Pauschal × 12, da WoGG Jahreseinkommen)
  const Y       = income * 12;
  const wg      = M - (a + b * Y + c * M) * Y;
  return Math.max(0, Math.round(wg));
}

function calcBuergergeld(income, persons, children, rent) {
  const adults = Math.max(persons - children, 1);
  let bedarf   = adults === 1 ? BG_SÄTZE.adult_single : adults * BG_SÄTZE.adult_partner;
  bedarf      += children * BG_SÄTZE.youth_6_13;

  // Angemessene Miete (Näherungswert)
  const pIdx    = Math.min(persons, 5) - 1;
  const maxMiete = WG_MAX_RENT[pIdx][3] * 1.2; // Mietstufe IV als Durchschnitt, +20%
  bedarf       += Math.min(rent || 650, maxMiete);

  // Einkommensfreibetrag (vereinfachtes Modell)
  let frei = 100;
  if (income > 100) frei += Math.min(income - 100, 900) * 0.2;
  if (income > 1000) frei += Math.min(income - 1000, 200) * 0.1;
  const anrechenbar = Math.max(0, income - frei);

  return Math.max(0, Math.round(bedarf - anrechenbar));
}

// =========================================================
// BRAIN v3.0 — Response-Generator
// =========================================================

function generateResponse(intent, entities, ctx) {
  // Vollständigen Kontext zusammenführen
  const c = {
    income:        entities.income        ?? ctx.income,
    householdSize: entities.householdSize ?? ctx.householdSize ?? 1,
    children:      entities.children      ?? ctx.children ?? 0,
    city:          entities.city          ?? ctx.city,
    rent:          entities.rent          ?? ctx.rent,
    situation:     entities.situation     ?? ctx.situation,
  };

  // ── KRISE (höchste Priorität) ───────────────────────────
  if (intent === 'crisis' || entities.isCrisis) {
    return {
      text: '🚨 **Das klingt nach einer akuten Notlage** – bitte kämpf nicht alleine dagegen!\n\n**Sofort-Hilfe:**\n• Jobcenter / Sozialamt anrufen und „Notfall" signalisieren\n• Schuldnerberatung (kostenlos): **0800 1 10 11 10**\n• Mieterverein bei Wohnungsgefährdung\n\nUnsere Experten können dir blitzschnell den richtigen Antrag vorbereiten.',
      actions: [{ label: '🚨 Jetzt Notfall-Hilfe anfordern', action: 'open_lead_modal' }],
      type: 'crisis',
    };
  }

  // ── DANKESCHÖN ─────────────────────────────────────────
  if (intent === 'danke') {
    return {
      text: 'Gerne! 😊 Wenn du noch Fragen hast oder beim Antrag Unterstützung brauchst – ich bin da.',
      actions: [{ label: 'Antrag stellen lassen', action: 'open_lead_modal' }],
      type: 'info',
    };
  }

  // ── BEGRÜSSUNG ─────────────────────────────────────────
  if (intent === 'greeting') {
    return {
      text: 'Hallo! 👋 Schön, dass du hier bist.\n\nIch bin ein KI-Assistent für Sozialleistungen. Ich **merke mir, was du mir sagst**, kann direkt **berechnen** ob du Anspruch hast, und erkläre, wie du den **Antrag** stellst.\n\nWas beschäftigt dich?',
      actions: [
        { label: 'Anspruch prüfen', action: 'open_calculator' },
        { label: 'Beratung anfordern', action: 'open_lead_modal' },
      ],
      type: 'info',
    };
  }

  // ── ABLEHNUNG ──────────────────────────────────────────
  if (intent === 'ablehnung') {
    return {
      text: 'Ein abgelehnter Antrag ist **nicht das letzte Wort**! Du hast klare Rechte:\n\n**① Widerspruch** (Frist: 1 Monat ab Bescheid)\n**② Untätigkeitsklage** (wenn Amt monatelang nicht antwortet)\n**③ Sozialgericht** als letzte Instanz\n\n⚠️ Die **Widerspruchsfrist läuft!** Handl schnell.',
      actions: [{ label: '✍️ Widerspruch-Hilfe anfordern', action: 'open_lead_modal' }],
      type: 'urgent',
    };
  }

  // ── ANTRAGSHELFE ───────────────────────────────────────
  if (intent === 'antrag_hilfe') {
    return {
      text: 'Beim Antrag gibt\'s 3 Wege:\n\n**① Online** – schnell, aber viele machen unbewusst Fehler\n**② Persönlich** beim Amt – Termin oft erst in Wochen\n**③ Mit Experten-Hilfe** – vollständig, fehlerfrei, maximal ✅\n\n80% unserer Nutzer bekommen so **mehr** als durch Selbst-Antrag – weil das Amt nicht automatisch alles berechnet.',
      actions: [{ label: 'Antrag mit Experten stellen', action: 'open_lead_modal' }],
      type: 'info',
    };
  }

  // ── WOHNGELD ───────────────────────────────────────────
  if (intent === 'wohngeld') {
    // Alle Daten vorhanden → direkt berechnen
    if (c.income && c.city && c.rent) {
      const wg = calcWohngeld(c.income, c.rent, c.householdSize, c.city);
      if (wg > 0) {
        return {
          text: null,
          calcResult: {
            benefit:  'Wohngeld',
            amount:   wg,
            label:    `Monatl. Zuschuss`,
            details:  `${c.income}€ Einkommen · ${c.rent}€ Miete · ${c.city} (Mietstufe ${CITY_MIETSTUFE[c.city] || 3})`,
            note:     'Geschätzte Förderung nach WoGG. Genaue Prüfung im Rechner.',
            color:    'blue',
          },
          actions: [
            { label: 'Genau berechnen', action: 'open_calculator' },
            { label: 'Antrag stellen lassen', action: 'open_lead_modal' },
          ],
          type: 'calculation',
        };
      } else {
        return {
          text: `Mit **${c.income}€** Einkommen und **${c.rent}€** Miete in **${c.city}** ergibt sich leider kein Wohngeld-Anspruch (Einkommen zu hoch).\n\n**Mögliche Alternativen:**\n• Bürgergeld, falls Einkommen den Bedarf nicht deckt\n• Kinderzuschlag, falls Kinder im Haushalt\n• Grundsicherung im Alter (für Rentner)`,
          actions: [{ label: 'Alternative prüfen', action: 'open_calculator' }],
          type: 'info',
        };
      }
    }
    // Einkommensinfo fehlt
    if (!c.income) {
      return {
        text: 'Ich kann dir eine **Wohngeld-Schätzung** machen! 🏠\n\nErste Frage: **Wie hoch ist dein monatliches Nettoeinkommen** (alle Personen im Haushalt zusammen)?',
        actions: [],
        type: 'question',
      };
    }
    // Stadt fehlt
    if (!c.city) {
      return {
        text: `Einkommen **${c.income}€** – notiert ✅\n\nIn welcher **Stadt** wohnst du? (Die Mietstufe variiert stark zwischen Städten)`,
        actions: [],
        type: 'question',
      };
    }
    // Miete fehlt
    if (!c.rent) {
      return {
        text: `Super! Letzte Frage: **Wie hoch ist deine monatliche Kaltmiete?**`,
        actions: [],
        type: 'question',
      };
    }
  }

  // ── BÜRGERGELD ─────────────────────────────────────────
  if (intent === 'buergergeld') {
    if (c.income != null) {
      const bg = calcBuergergeld(c.income, c.householdSize, c.children, c.rent);
      if (bg > 0) {
        return {
          text: null,
          calcResult: {
            benefit:  'Bürgergeld',
            amount:   bg,
            label:    `Monatl. Anspruch (inkl. Miete)`,
            details:  `${c.householdSize} Person(en) · ${c.income}€ Einkommen`,
            note:     'Enthält Regelbedarf + geschätzte Unterkunftskosten.',
            color:    'green',
          },
          actions: [
            { label: 'Genau berechnen', action: 'open_calculator' },
            { label: 'Antrag stellen lassen', action: 'open_lead_modal' },
          ],
          type: 'calculation',
        };
      }
    }
    return {
      text: '**Bürgergeld** sichert deinen Grundbedarf, wenn das Einkommen nicht reicht.\n\n**Regelsätze 2026:**\n• Alleinstehend: **563€/Monat**\n• Partner: je **506€/Monat**\n• Kinder (6–13 J.): **390€/Monat**\n\nDazu kommen **Miete & Heizung** komplett übernommen (angemessene Höhe).\n\nWie viel verdienst du monatlich?',
      actions: [{ label: 'Berechnen lassen', action: 'open_calculator' }],
      type: 'info',
    };
  }

  // ── KINDERZUSCHLAG ─────────────────────────────────────
  if (intent === 'kinderzuschlag') {
    const kinder = c.children || 0;
    if (kinder > 0) {
      const kizMax = kinder * KIZ_MAX_PER_CHILD;
      return {
        text: null,
        calcResult: {
          benefit: 'Kinderzuschlag (Maximum)',
          amount:  kizMax,
          label:   `${kinder} Kind${kinder > 1 ? 'er' : ''} × max. ${KIZ_MAX_PER_CHILD}€`,
          details: 'Einkommensabhängig – tatsächlicher Betrag kann niedriger sein.',
          note:    'Kombinierbar mit Wohngeld! Getrennte Antragstellung notwendig.',
          color:   'purple',
        },
        actions: [
          { label: 'KiZ genau prüfen', action: 'open_calculator' },
          { label: 'KiZ beantragen lassen', action: 'open_lead_modal_kiz' },
        ],
        type: 'calculation',
      };
    }
    return {
      text: '**Kinderzuschlag (KiZ)** – für Eltern, die selbst genug verdienen, aber nicht genug für die Kinder:\n\n• Bis zu **297€ pro Kind** (2026)\n• Zusätzlich zu Kindergeld\n• **Kombinierbar mit Wohngeld!**\n\nVoraussetzung: Dein Einkommen reicht für dich selbst (ohne Kinder-Mehrbedarf).\n\nWie viele Kinder leben bei euch?',
      actions: [],
      type: 'question',
    };
  }

  // ── RENTNER ────────────────────────────────────────────
  if (intent === 'rentner') {
    if (c.income && c.rent && c.city) {
      const wg = calcWohngeld(c.income, c.rent, c.householdSize, c.city);
      if (wg > 0) {
        return {
          text: null,
          calcResult: {
            benefit: 'Wohngeld für Rentner',
            amount:  wg,
            label:   'Monatl. Mietzuschuss',
            details: `${c.income}€ Rente · ${c.rent}€ Miete · ${c.city}`,
            note:    'Sehr liberale Vermögensgrenze: 60.000€ für die erste Person.',
            color:   'amber',
          },
          actions: [
            { label: 'Genau berechnen', action: 'open_calculator' },
            { label: 'Antrag stellen lassen', action: 'open_lead_modal' },
          ],
          type: 'calculation',
        };
      }
    }
    return {
      text: 'Für Rentnerinnen und Rentner gibt\'s oft **mehr als bekannt**:\n\n🏠 **Wohngeld** (Mietzuschuss)\n• Sehr hohe Vermögensgrenze: **60.000€** (1. Person) + 30.000€ je weitere\n• Oft vorteilhafter als Grundsicherung!\n\n👴 **Grundsicherung im Alter**\n• Wenn Rente + Vermögen den Lebensunterhalt nicht sichert\n\nWie hoch ist deine monatliche Rente?',
      actions: [{ label: 'Rentner-Check starten', action: 'open_calculator' }],
      type: 'info',
    };
  }

  // ── STUDENT ────────────────────────────────────────────
  if (intent === 'student') {
    return {
      text: 'Als Student gilt eine wichtige Sonderregel:\n\n✅ **BAföG → kein Wohngeld** (BAföG enthält Wohnkostenanteil)\n✅ **Kein BAföG-Anspruch?** → Wohngeld möglich!\n\n**Kein BAföG-Anspruch** z.B. bei:\n• Zweitstudium\n• Zu alte Studierende\n• Masterstudium nach Auslandsabschluss\n\nBürgergeld gibt\'s für Studenten nur in Ausnahmefällen (Krankheit, Kinder).',
      actions: [{ label: 'Meinen Anspruch prüfen', action: 'open_calculator' }],
      type: 'info',
    };
  }

  // ── AZUBI ──────────────────────────────────────────────
  if (intent === 'azubi') {
    return {
      text: 'Als Auszubildende/r hast du besondere Optionen:\n\n**① BAB (Berufsausbildungsbeihilfe)**\n→ Für Azubis, die auswärts wohnen müssen\n\n**② Wohngeld**\n→ Wenn BAB nicht reicht oder abgelehnt wurde\n\n**③ Bürgergeld**\n→ Wenn Ausbildungsvergütung + BAB zusammen nicht zum Leben reichen\n\nWelche Situation trifft auf dich zu?',
      actions: [{ label: 'Anspruch prüfen', action: 'open_calculator' }],
      type: 'info',
    };
  }

  // ── WBS ────────────────────────────────────────────────
  if (intent === 'wbs') {
    return {
      text: 'Den **Wohnberechtigungsschein (WBS)** stellst du beim Wohnungsamt:\n\n**Einkommensgrenzen (ca.):**\n• 1 Person: max. 14.000€/Jahr (≈ 1.167€/Monat netto)\n• 2 Personen: max. 21.000€/Jahr\n• +5.000€ pro weitere Person\n\nMit WBS hast du Zugang zu günstigeren **Sozialwohnungen**.',
      actions: [],
      type: 'info',
    };
  }

  // ── VERMÖGEN ───────────────────────────────────────────
  if (intent === 'vermoegen') {
    return {
      text: '**Vermögensgrenzen 2026 im Vergleich:**\n\n🏠 **Wohngeld** – sehr liberal:\n• **60.000€** für die 1. Person\n• +30.000€ pro weitere Person\n\n💼 **Bürgergeld** – strenger:\n• **15.000€** Schonvermögen (nach Karenzzeit)\n• Im 1. Jahr: kein Vermögen angerechnet!\n\n👴 **Grundsicherung** – ähnlich wie Bürgergeld',
      actions: [],
      type: 'info',
    };
  }

  // ── ANSPRUCH CHECK (generisch) ─────────────────────────
  if (intent === 'anspruch_check') {
    if (!c.income) {
      return {
        text: 'Ich helfe dir beim **Anspruchs-Check!** 🔍\n\nFür eine erste Einschätzung: **Wie hoch ist dein monatliches Nettoeinkommen** (alle Haushaltsmitglieder)?',
        actions: [],
        type: 'question',
      };
    }
    return {
      text: `Mit **${c.income}€/Monat** kommen diese Leistungen in Frage:\n\n🏠 **Wohngeld** – wenn du zur Miete wohnst\n👶 **Kinderzuschlag** – wenn Kinder im Haushalt\n💼 **Bürgergeld** – wenn der Bedarf nicht gedeckt ist\n\nWelche interessiert dich?`,
      actions: [{ label: 'Alle prüfen lassen', action: 'open_calculator' }],
      type: 'info',
    };
  }

  // ── BERECHNUNG (generisch) ─────────────────────────────
  if (intent === 'berechnung') {
    if (!c.income) {
      return {
        text: 'Sehr gerne! Für eine Berechnung brauche ich ein paar Eckdaten.\n\n**Was ist dein monatliches Nettoeinkommen** (alle Personen im Haushalt zusammen)?',
        actions: [],
        type: 'question',
      };
    }
    return {
      text: `Einkommen **${c.income}€** – notiert ✅\n\nWas soll ich berechnen?`,
      actions: [
        { label: 'Wohngeld', action: 'quick_wohngeld' },
        { label: 'Bürgergeld', action: 'quick_buergergeld' },
        { label: 'Kinderzuschlag', action: 'quick_kiz' },
      ],
      type: 'question',
    };
  }

  // ── DATA PROVISION — Nutzer gibt Daten an ohne explizite Frage ──
  // Auch als Fallback wenn ausreichend Kontext vorhanden ist
  if (intent === 'data_provision' || intent === 'fallback') {

    // Alle drei Kerndaten vorhanden → Wohngeld sofort berechnen
    if (c.income && c.city && c.rent) {
      const wg = calcWohngeld(c.income, c.rent, c.householdSize, c.city);
      const cityLabel = c.city.charAt(0).toUpperCase() + c.city.slice(1);
      if (wg > 0) {
        return {
          text: null,
          calcResult: {
            benefit: 'Wohngeld',
            amount:  wg,
            label:   'Monatl. Zuschuss',
            details: `${c.income}€ Einkommen · ${c.rent}€ Miete · ${cityLabel} (Mietstufe ${CITY_MIETSTUFE[c.city] || 3})`,
            note:    'Geschätzte Förderung nach WoGG §19. Genaue Prüfung im Rechner.',
            color:   'blue',
          },
          actions: [
            { label: 'Genau berechnen', action: 'open_calculator' },
            { label: 'Antrag stellen lassen', action: 'open_lead_modal' },
          ],
          type: 'calculation',
        };
      } else {
        // Kein Wohngeld → Bürgergeld prüfen
        const bg = calcBuergergeld(c.income, c.householdSize, c.children, c.rent);
        if (bg > 0) {
          return {
            text: `Mit **${c.income}€** Einkommen und **${c.rent}€** Miete in **${cityLabel}** hast du keinen Wohngeld-Anspruch (Einkommen zu hoch).\n\n✅ Du könntest aber Anspruch auf **Bürgergeld** haben:`,
            calcResult: {
              benefit: 'Bürgergeld',
              amount:  bg,
              label:   'Monatl. Anspruch (inkl. Miete)',
              details: `${c.householdSize} Person(en) · ${c.income}€ Einkommen`,
              note:    'Enthält Regelbedarf + geschätzte Unterkunftskosten.',
              color:   'green',
            },
            actions: [
              { label: 'Genau berechnen', action: 'open_calculator' },
              { label: 'Antrag stellen lassen', action: 'open_lead_modal' },
            ],
            type: 'calculation',
          };
        }
        return {
          text: `Mit **${c.income}€** Einkommen und **${c.rent}€** Miete in **${cityLabel}** ergibt sich leider kein Anspruch auf Wohngeld oder Bürgergeld.\n\n**Mögliche Alternativen:**\n• 👶 **Kinderzuschlag** – wenn Kinder im Haushalt\n• 🏠 **WBS** – für günstigere Sozialwohnungen\n• 📋 Lass uns alles genau prüfen:`,
          actions: [{ label: 'Alle Leistungen prüfen', action: 'open_calculator' }],
          type: 'info',
        };
      }
    }

    // Einkommen vorhanden, aber Stadt fehlt
    if (c.income && c.rent && !c.city) {
      return {
        text: `Einkommen **${c.income}€** und Miete **${c.rent}€** – notiert ✅\n\nNur noch: In welcher **Stadt** wohnst du? (Die Mietstufe beeinflusst das Wohngeld stark)`,
        actions: [],
        type: 'question',
      };
    }

    // Einkommen und Stadt, aber Miete fehlt
    if (c.income && c.city && !c.rent) {
      return {
        text: `Einkommen **${c.income}€** und Stadt notiert ✅\n\nLetzte Frage: **Wie hoch ist deine monatliche Kaltmiete?**`,
        actions: [],
        type: 'question',
      };
    }

    // Nur Einkommen bekannt
    if (c.income && !c.city && !c.rent) {
      return {
        text: `**${c.income}€/Monat** – notiert ✅\n\nFür eine Berechnung brauche ich noch:\n→ **In welcher Stadt** wohnst du?`,
        actions: [],
        type: 'question',
      };
    }

    // Nur Stadt oder Miete, kein Einkommen
    if (!c.income) {
      return {
        text: `Um dir eine Schätzung zu geben, fehlt mir noch eine Info:\n\n**Wie hoch ist dein monatliches Nettoeinkommen?** (alle Haushaltsmitglieder zusammen)`,
        actions: [],
        type: 'question',
      };
    }
  }

  // ── FALLBACK (echtes Fallback wenn nichts passt) ────────
  return {
    text: 'Das ist eine sehr spezifische Frage 🤔\n\nAm besten nutz unseren **Smart-Calculator** – er kennt alle aktuellen Gesetze und gibt in 2 Minuten eine genaue Antwort. Alternativ kann ein Experte direkt mit dir prüfen.',
    actions: [
      { label: 'Smart-Calculator öffnen', action: 'open_calculator' },
      { label: 'Experten fragen', action: 'open_lead_modal' },
    ],
    type: 'info',
  };
}


// =========================================================
// Quick-Suggestion Chips (Startansicht)
// =========================================================

const QUICK_QUESTIONS = [
  { label: '🏠 Wohngeld-Anspruch prüfen', text: 'Habe ich Anspruch auf Wohngeld?' },
  { label: '💼 Bürgergeld berechnen',      text: 'Wie viel Bürgergeld bekomme ich?' },
  { label: '👶 Kinderzuschlag',            text: 'Wie viel Kinderzuschlag bekomme ich?' },
  { label: '❌ Antrag abgelehnt',          text: 'Mein Antrag wurde abgelehnt – was jetzt?' },
  { label: '👴 Rentner-Leistungen',        text: 'Ich bin Rentner – was steht mir zu?' },
];

// =========================================================
// Farbschema für Calculation-Cards
// =========================================================

const CARD_COLORS = {
  blue:   { bg: 'from-blue-800 to-blue-950',     accent: '#60a5fa' },
  green:  { bg: 'from-emerald-700 to-emerald-950', accent: '#34d399' },
  purple: { bg: 'from-purple-800 to-purple-950', accent: '#a78bfa' },
  amber:  { bg: 'from-amber-700 to-amber-900',   accent: '#fbbf24' },
  default:{ bg: 'from-brand-navy to-slate-800',  accent: '#C5A67C' },
};

// =========================================================
// Hilfsfunktion: Markdown-ähnliches Rendering (sicher)
// =========================================================

function renderText(text) {
  if (!text) return null;
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>');
}

// =========================================================
// HAUPTKOMPONENTE
// =========================================================

const ChatWidget = () => {
  const [isOpen,      setIsOpen]      = useState(false);
  const [hasStarted,  setHasStarted]  = useState(false);
  const [inputValue,  setInputValue]  = useState('');
  const [isTyping,    setIsTyping]    = useState(false);

  /** Gesprächskontext – persistiert über alle Nachrichten */
  const [context, setContext] = useState({
    income:        null,
    householdSize: 1,
    children:      0,
    city:          null,
    rent:          null,
    situation:     null,
  });

  const [messages, setMessages] = useState([
    {
      id: 1,
      sender:  'bot',
      text:    'Hallo! Ich bin der **KI-Assistent** vom Sozialen Navigator.\n\nIch verstehe natürliche Sprache, merke mir Infos aus unserem Gespräch und kann direkt berechnen, ob du Anspruch hast. Was beschäftigt dich?',
      actions: [],
      type:    'info',
      timestamp: new Date(),
    },
  ]);

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

  const toggleChat = () => setIsOpen(v => !v);

  const startChat = () => {
    setHasStarted(true);
    setTimeout(() => inputRef.current?.focus(), 120);
  };

  // --- Action-Handler ---
  const executeAction = useCallback((actionType) => {
    switch (actionType) {
      case 'open_calculator': {
        const el = document.getElementById('calculator');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
        if (window.innerWidth < 768) setIsOpen(false);
        break;
      }
      case 'open_lead_modal':
        if (window.openLeadModal) window.openLeadModal('application');
        break;
      case 'open_lead_modal_kiz':
        if (window.openLeadModal) window.openLeadModal('kiz');
        break;
      case 'quick_wohngeld':
        dispatchMessage('Wie viel Wohngeld bekomme ich?');
        break;
      case 'quick_buergergeld':
        dispatchMessage('Wie viel Bürgergeld bekomme ich?');
        break;
      case 'quick_kiz':
        dispatchMessage('Wie viel Kinderzuschlag bekomme ich?');
        break;
      default:
        break;
    }
  }, []); // eslint-disable-line

  // --- Kernfunktion: Nachricht verarbeiten ---
  const dispatchMessage = useCallback((textToSend) => {
    if (!textToSend?.trim()) return;

    // User-Nachricht hinzufügen
    const userMsg = {
      id:        Date.now(),
      sender:    'user',
      text:      textToSend,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    // Entitäten extrahieren & Kontext aktualisieren
    const entities = extractEntities(textToSend);
    setContext(prev => {
      const next = { ...prev };
      if (entities.income        != null) next.income        = entities.income;
      if (entities.householdSize != null) next.householdSize = entities.householdSize;
      if (entities.children      != null) next.children      = entities.children;
      if (entities.city          != null) next.city          = entities.city;
      if (entities.rent          != null) next.rent          = entities.rent;
      if (entities.situation     != null) next.situation      = entities.situation;
      return next;
    });

    // Intent bestimmen & Antwort generieren (mit kurzer Denkpause)
    const thinkMs = 500 + Math.random() * 700;
    setTimeout(() => {
      setContext(latestCtx => {
        const intent   = detectIntent(textToSend);
        const decision = generateResponse(intent, entities, latestCtx);

        const botMsg = {
          id:         Date.now() + 1,
          sender:     'bot',
          text:       decision.text,
          calcResult: decision.calcResult,
          actions:    decision.actions || [],
          type:       decision.type || 'info',
          timestamp:  new Date(),
        };
        setMessages(prev => [...prev, botMsg]);
        setIsTyping(false);
        return latestCtx; // Kontext unverändert lassen (nur Lese-Zugriff hier)
      });
    }, thinkMs);
  }, []);

  const handleSendMessage = useCallback((e) => {
    if (e) e.preventDefault();
    if (!inputValue.trim()) return;
    dispatchMessage(inputValue);
    setInputValue('');
  }, [inputValue, dispatchMessage]);

  // --- Auto-Scroll ---
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // --- Kontext-Panel sichtbar? ---
  const hasContext = context.income || context.city || context.rent || context.children > 0;

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="fixed bottom-6 right-6 md:right-24 z-[100] flex flex-col items-end print:hidden">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="chatbox"
            initial={{ opacity: 0, y: 24, scale: 0.93 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{   opacity: 0, y: 24, scale: 0.93 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="mb-4 w-[92vw] md:w-[400px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
            style={{ height: '620px', maxHeight: '82vh', fontFamily: 'inherit' }}
          >
            {/* ── Header ── */}
            <div className="bg-brand-navy px-5 py-3.5 flex justify-between items-center border-b border-brand-gold/20 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-9 h-9 bg-gradient-to-br from-brand-gold/30 to-brand-gold/5 rounded-full flex items-center justify-center border border-brand-gold/40">
                    <Sparkles size={15} className="text-brand-gold" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-brand-navy rounded-full" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm leading-none">KI-Assistent</p>
                  <p className="text-brand-gold/70 text-[11px] mt-0.5">Sozialer Navigator · Online</p>
                </div>
              </div>
              <button
                onClick={toggleChat}
                className="p-2 hover:bg-white/10 rounded-full text-white/50 transition-colors"
                aria-label="Chat schließen"
              >
                <Minus size={18} />
              </button>
            </div>

            {/* ── Kontext-Memory-Bar ── */}
            <AnimatePresence>
              {hasContext && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-slate-50 border-b border-slate-100 px-4 py-2 flex flex-wrap gap-1.5 items-center overflow-hidden flex-shrink-0"
                >
                  <span className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Ich kenne:</span>
                  {context.income   && <Tag color="blue"  label={`${context.income}€/Monat`} />}
                  {context.city     && <Tag color="green" label={context.city.charAt(0).toUpperCase() + context.city.slice(1)} />}
                  {context.rent     && <Tag color="amber" label={`${context.rent}€ Miete`} />}
                  {context.children > 0 && <Tag color="purple" label={`${context.children} Kind${context.children > 1 ? 'er' : ''}`} />}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Nachrichtenliste ── */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-3">
              <p className="text-center text-[9px] text-slate-400 uppercase tracking-widest pb-1">Heute</p>

              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex flex-col w-full ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div className={`flex ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'} items-end gap-2 max-w-[92%]`}>
                    {/* Bot-Avatar */}
                    {msg.sender === 'bot' && (
                      <div className="w-6 h-6 rounded-full bg-brand-navy flex-shrink-0 flex items-center justify-center border border-brand-gold/40">
                        <Sparkles size={11} className="text-brand-gold" />
                      </div>
                    )}

                    <div className="flex flex-col gap-2">
                      {/* Text-Bubble */}
                      {msg.text && (
                        <div
                          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                            msg.sender === 'user'
                              ? 'bg-brand-navy text-white rounded-br-sm'
                              : msg.type === 'crisis'
                                ? 'bg-red-50 text-red-800 border border-red-200 rounded-bl-sm'
                                : msg.type === 'urgent'
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200 rounded-bl-sm'
                                  : msg.type === 'question'
                                    ? 'bg-white text-slate-700 border border-brand-gold/30 rounded-bl-sm'
                                    : 'bg-white text-slate-700 border border-slate-100 rounded-bl-sm'
                          }`}
                          dangerouslySetInnerHTML={{ __html: renderText(msg.text) }}
                        />
                      )}

                      {/* Calculation Card */}
                      {msg.calcResult && <CalcCard result={msg.calcResult} />}
                    </div>
                  </div>

                  {/* Action-Buttons */}
                  {msg.sender === 'bot' && msg.actions?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2 ml-8">
                      {msg.actions.map((act, i) => (
                        <button
                          key={i}
                          onClick={() => executeAction(act.action)}
                          className="px-3 py-1.5 bg-white border border-brand-navy/15 text-brand-navy text-[11px] font-semibold rounded-full hover:bg-brand-navy hover:text-white transition-all shadow-sm flex items-center gap-1 group"
                        >
                          {act.label}
                          <ChevronRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Typing-Indikator */}
              {isTyping && (
                <div className="flex items-end gap-2">
                  <div className="w-6 h-6 rounded-full bg-brand-navy flex-shrink-0 flex items-center justify-center border border-brand-gold/40">
                    <Sparkles size={11} className="text-brand-gold animate-pulse" />
                  </div>
                  <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-sm border border-slate-100 shadow-sm flex items-center gap-1.5">
                    {[0, 150, 300].map(delay => (
                      <div
                        key={delay}
                        className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${delay}ms` }}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* ── Footer / Input ── */}
            <div className="bg-white border-t border-slate-100 flex-shrink-0">
              {!hasStarted ? (
                <div className="p-4">
                  <p className="text-[9px] text-slate-400 uppercase tracking-wider mb-2 font-semibold">Häufige Fragen:</p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {QUICK_QUESTIONS.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => { setHasStarted(true); dispatchMessage(q.text); }}
                        className="text-[11px] bg-slate-50 hover:bg-brand-navy hover:text-white text-slate-600 border border-slate-200 rounded-full px-3 py-1.5 transition-all font-medium"
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={startChat}
                    className="w-full py-3 bg-brand-navy hover:bg-slate-800 text-white rounded-xl font-semibold shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2 border-b-2 border-brand-gold text-sm"
                  >
                    <MessageCircle size={15} className="text-brand-gold" />
                    Eigene Frage stellen
                  </button>
                </div>
              ) : (
                <div className="p-3">
                  <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={e => setInputValue(e.target.value)}
                      placeholder="Schreib einfach deine Frage…"
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold/50 transition-all text-slate-800 placeholder:text-slate-400"
                    />
                    <button
                      type="submit"
                      disabled={!inputValue.trim() || isTyping}
                      className="p-2.5 bg-brand-navy text-brand-gold rounded-xl hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                      <Send size={15} />
                    </button>
                  </form>
                </div>
              )}
              <p className="text-center text-[8px] text-slate-300 uppercase tracking-widest pb-2">
                Sozialer Navigator KI · 2026
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating Action Button ── */}
      <motion.button
        onClick={toggleChat}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        className={`p-4 rounded-full shadow-2xl transition-all duration-300 flex items-center justify-center border-2 ${
          isOpen
            ? 'bg-white text-brand-navy border-slate-200'
            : 'bg-brand-navy border-brand-gold/30'
        }`}
        aria-label="Chat öffnen"
      >
        {isOpen ? (
          <X size={22} className="text-brand-navy" />
        ) : (
          <div className="relative">
            <MessageCircle size={26} className="text-brand-gold" strokeWidth={1.5} />
            {!hasStarted && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border border-brand-navy" />
              </span>
            )}
          </div>
        )}
      </motion.button>
    </div>
  );
};

// =========================================================
// Sub-Components
// =========================================================

/** Kleines Kontext-Tag-Badge */
function Tag({ color, label }) {
  const styles = {
    blue:   'bg-blue-50 text-blue-700 border-blue-200',
    green:  'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber:  'bg-amber-50 text-amber-700 border-amber-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
  };
  return (
    <span className={`text-[10px] border px-2 py-0.5 rounded-full font-semibold ${styles[color] || styles.blue}`}>
      {label}
    </span>
  );
}

/** Hochwertige Calculation-Ergebnis-Karte */
function CalcCard({ result }) {
  const color = CARD_COLORS[result.color] || CARD_COLORS.default;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`bg-gradient-to-br ${color.bg} text-white rounded-2xl rounded-bl-sm p-4 shadow-lg border border-white/10 w-[260px]`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Calculator size={13} style={{ color: color.accent }} />
        <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: color.accent }}>
          Schätzung
        </span>
      </div>

      <div className="flex items-baseline gap-1 mb-0.5">
        <span className="text-3xl font-bold">~{result.amount.toLocaleString('de-DE')}€</span>
        <span className="text-sm text-white/50">/Monat</span>
      </div>

      <p className="text-xs text-white/70 font-medium mb-1">{result.benefit}</p>
      {result.label && <p className="text-[10px] text-white/50">{result.label}</p>}

      <div className="border-t border-white/10 mt-3 pt-2">
        <p className="text-[10px] text-white/40 leading-snug">{result.note}</p>
      </div>
    </motion.div>
  );
}

export default ChatWidget;
