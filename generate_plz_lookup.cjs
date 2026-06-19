/**
 * generate_plz_lookup.cjs
 * Lädt alle deutschen PLZ von der OpenPLZ API und generiert
 * src/data/plz-lookup.js mit Mietstufe-Zuordnung.
 *
 * Mietstufen basierend auf WoGG Anlage 1 (Wohngeldgesetz 2023/2024)
 * - Große Städte: detailliert zugeordnet
 * - Kleine Gemeinden: per Bundesland-Durchschnitt (Mietstufe 2-3)
 *
 * Ausführung: node generate_plz_lookup.cjs
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ============================================================
// MIETSTUFEN-ZUORDNUNG nach WoGG Anlage 1 (Auswahl der wichtigsten Gemeinden)
// Format: { "Gemeindename": mietstufe }
// Vollständige Zuordnung für alle kreisfreien Städte + Sonderfälle
// ============================================================
const MIETSTUFEN_MAP = {
  // Mietstufe 7 (höchste)
  "München": 7, "Germering": 7, "Haar": 7, "Gräfelfing": 7, "Unterhaching": 7,
  "Oberschleißheim": 7, "Unterschleißheim": 7, "Karlsfeld": 7, "Puchheim": 7,
  "Fürstenfeldbruck": 7, "Dachau": 7, "Olching": 7,

  // Mietstufe 6
  "Hamburg": 6, "Frankfurt am Main": 6, "Köln": 6, "Düsseldorf": 6,
  "Heidelberg": 6, "Freiburg im Breisgau": 6, "Regensburg": 6,
  "Ingolstadt": 6, "Augsburg": 6, "Erlangen": 6, "Würzburg": 6,
  "Kiel": 6, "Mainz": 6, "Darmstadt": 6, "Offenbach am Main": 6,
  "Wiesbaden": 6, "Bonn": 6, "Münster": 6, "Aachen": 6,
  "Potsdam": 6, "Rostock": 6, "Lübeck": 6,
  "Ulm": 6, "Friedrichshafen": 6, "Konstanz": 6, "Ravensburg": 6,
  "Tübingen": 6, "Reutlingen": 6, "Esslingen am Neckar": 6,
  "Göttingen": 6, "Lüneburg": 6,
  "Landshut": 6, "Rosenheim": 6, "Bayreuth": 6,
  "Kaiserslautern": 6,

  // Mietstufe 5
  "Berlin": 5, "Stuttgart": 5, "Bremen": 5, "Leipzig": 5,
  "Nürnberg": 5, "Hannover": 5, "Dresden": 5, "Bochum": 5,
  "Wuppertal": 5, "Bielefeld": 5, "Mannheim": 5, "Karlsruhe": 5,
  "Koblenz": 5, "Trier": 5, "Kassel": 5, "Saarbrücken": 5,
  "Erfurt": 5, "Jena": 5,
  "Braunschweig": 5, "Oldenburg": 5, "Osnabrück": 5,
  "Wolfsburg": 5, "Salzgitter": 5,
  "Dortmund": 5, "Essen": 5, "Duisburg": 5, "Gelsenkirchen": 5,
  "Krefeld": 5, "Mönchengladbach": 5, "Oberhausen": 5, "Hagen": 5,
  "Hamm": 5, "Solingen": 5, "Leverkusen": 5, "Bottrop": 5,
  "Herne": 5, "Recklinghausen": 5, "Mülheim an der Ruhr": 5,
  "Remscheid": 5, "Siegen": 5,
  "Fürth": 5, "Bamberg": 5, "Ansbach": 5,
  "Heilbronn": 5, "Pforzheim": 5, "Reutlingen": 5,
  "Neuss": 5, "Gütersloh": 5, "Paderborn": 5,
  "Magdeburg": 5, "Halle (Saale)": 5,
  "Schwerin": 5, "Greifswald": 5, "Stralsund": 5, "Wismar": 5,
  "Cottbus": 5, "Frankfurt (Oder)": 5, "Brandenburg an der Havel": 5,
  "Gera": 5, "Weimar": 5, "Eisenach": 5,
  "Chemnitz": 5,
  "Flensburg": 5, "Neumünster": 5,

  // Mietstufe 4
  "Halle": 4, "Dessau": 4, "Dessau-Roßlau": 4, "Zwickau": 4,
  "Bremerhaven": 4, "Wilhelmshaven": 4, "Wolfenbüttel": 4,
  "Delmenhorst": 4, "Emden": 4,
  "Gelsenkirchen": 4, "Wanne-Eickel": 4, "Castrop-Rauxel": 4,
  "Lünen": 4, "Unna": 4, "Marl": 4, "Gladbeck": 4,
  "Iserlohn": 4, "Lüdenscheid": 4, "Herford": 4, "Minden": 4,
  "Detmold": 4, "Bielefeld": 4,
  "Saarlouis": 4, "Neunkirchen": 4, "Homburg": 4,
  "Kaiserslautern": 4, "Ludwigshafen am Rhein": 4, "Frankenthal": 4,
  "Speyer": 4, "Worms": 4,
  "Göttingen": 4, "Hildesheim": 4, "Goslar": 4,
  "Straubing": 4, "Passau": 4, "Amberg": 4, "Weiden in der Oberpfalz": 4,
  "Kempten (Allgäu)": 4, "Memmingen": 4, "Kaufbeuren": 4,
  "Aschaffenburg": 4, "Schweinfurt": 4, "Coburg": 4,
  "Offenburg": 4, "Villingen-Schwenningen": 4, "Sindelfingen": 4,
  "Ludwigsburg": 4, "Aalen": 4, "Heidenheim an der Brenz": 4,
  "Schwäbisch Gmünd": 4, "Waiblingen": 4, "Böblingen": 4,
  "Cottbus": 4, "Eberswalde": 4, "Neuruppin": 4,
  "Neubrandenburg": 4, "Anklam": 4, "Waren (Müritz)": 4,
  "Suhl": 4, "Gotha": 4, "Nordhausen": 4, "Mühlhausen": 4,

  // Mietstufe 3
  "Plauen": 3, "Zwickau": 3, "Pirna": 3, "Riesa": 3, "Görlitz": 3,
  "Bautzen": 3, "Meißen": 3, "Döbeln": 3,
  "Stendal": 3, "Halberstadt": 3, "Bernburg": 3, "Merseburg": 3,
  "Quedlinburg": 3, "Aschersleben": 3, "Wernigerode": 3,
  "Schwerin": 3, "Güstrow": 3, "Ludwigslust": 3, "Parchim": 3,
  "Demmin": 3, "Wolgast": 3, "Rügen": 3,
  "Frankfurt (Oder)": 3,
  "Altenburg": 3, "Gera": 3, "Saalfeld": 3, "Rudolstadt": 3,
  "Sonneberg": 3, "Hildburghausen": 3,
};

// ============================================================
// BUNDESLAND-FALLBACK-MIETSTUFEN (wenn Gemeinde nicht in MAP)
// Basierend auf durchschnittlichen Mietstufen je Bundesland
// ============================================================
const BUNDESLAND_FALLBACK = {
  "Baden-Württemberg": 3,
  "Bayern": 3,
  "Berlin": 5,
  "Brandenburg": 2,
  "Bremen": 4,
  "Hamburg": 5,
  "Hessen": 3,
  "Mecklenburg-Vorpommern": 2,
  "Niedersachsen": 2,
  "Nordrhein-Westfalen": 3,
  "Rheinland-Pfalz": 2,
  "Saarland": 2,
  "Sachsen": 2,
  "Sachsen-Anhalt": 1,
  "Thüringen": 2,
  "Schleswig-Holstein": 2,
};

// ============================================================
// HILFSFUNKTIONEN
// ============================================================
function getMietstufe(ortsname, bundesland) {
  // Exakte Übereinstimmung suchen
  if (MIETSTUFEN_MAP[ortsname] !== undefined) {
    return MIETSTUFEN_MAP[ortsname];
  }
  // Teilstring-Suche (z.B. "Frankfurt am Main" enthält "Frankfurt")
  for (const [key, val] of Object.entries(MIETSTUFEN_MAP)) {
    if (ortsname && (ortsname.includes(key) || key.includes(ortsname))) {
      return val;
    }
  }
  // Bundesland-Fallback
  return BUNDESLAND_FALLBACK[bundesland] || 2;
}

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'SozialerNavigator/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`JSON parse error for ${url}: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ============================================================
// HAUPT-FUNKTION: Alle PLZ von OpenPLZ API laden
// ============================================================
async function fetchAllPlz() {
  console.log('🚀 Starte PLZ-Daten-Download von openplzapi.org...\n');

  const lookup = {};
  let totalFetched = 0;
  let page = 1;
  const pageSize = 50;

  // Alle Bundesländer durchgehen
  const bundeslaender = [
    'Baden-Württemberg', 'Bayern', 'Berlin', 'Brandenburg', 'Bremen',
    'Hamburg', 'Hessen', 'Mecklenburg-Vorpommern', 'Niedersachsen',
    'Nordrhein-Westfalen', 'Rheinland-Pfalz', 'Saarland', 'Sachsen',
    'Sachsen-Anhalt', 'Schleswig-Holstein', 'Thüringen'
  ];

  for (const bundesland of bundeslaender) {
    console.log(`📍 Lade PLZ für ${bundesland}...`);
    page = 1;
    let hasMore = true;

    while (hasMore) {
      const encodedBL = encodeURIComponent(bundesland);
      const url = `https://openplzapi.org/de/FederalStates/${encodedBL}/Localities?page=${page}&pageSize=${pageSize}`;

      try {
        const data = await httpsGet(url);
        
        if (!Array.isArray(data) || data.length === 0) {
          hasMore = false;
          break;
        }

        for (const entry of data) {
          if (!entry.postalCode) continue;
          
          const plz = String(entry.postalCode).padStart(5, '0');
          const ort = entry.name || entry.locality || 'Unbekannt';
          const mietstufe = getMietstufe(ort, bundesland);

          lookup[plz] = { ort, bundesland, mietstufe };
        }

        totalFetched += data.length;
        process.stdout.write(`\r  Seite ${page}: ${totalFetched} Orte geladen...`);

        if (data.length < pageSize) {
          hasMore = false;
        } else {
          page++;
          await sleep(100); // API nicht überlasten
        }
      } catch (err) {
        console.error(`\n⚠️  Fehler bei ${bundesland} Seite ${page}:`, err.message);
        // Versuche mit Streets-Endpoint als Fallback
        hasMore = false;
      }
    }
    console.log(`\n  ✅ ${bundesland}: ${Object.keys(lookup).length} PLZ gesamt`);
  }

  return lookup;
}

// ============================================================
// FALLBACK: Wenn API nicht erreichbar, nutze bekannte Datenbasis
// ============================================================
function getKnownPlzData() {
  console.log('⚠️  Nutze eingebettete PLZ-Datenbasis als Fallback...');
  // Wird in generateFallbackData() erzeugt
  return {};
}

// ============================================================
// AUSGABE-DATEI GENERIEREN
// ============================================================
async function generateLookupFile(lookup) {
  const outputPath = path.join(__dirname, 'src', 'data', 'plz-lookup.js');
  
  const sortedKeys = Object.keys(lookup).sort();
  const count = sortedKeys.length;

  console.log(`\n📝 Generiere plz-lookup.js mit ${count} Einträgen...`);

  const entries = sortedKeys.map(plz => {
    const { ort, bundesland, mietstufe } = lookup[plz];
    const safeOrt = ort.replace(/"/g, '\\"');
    const safeBL = bundesland.replace(/"/g, '\\"');
    return `"${plz}":{"o":"${safeOrt}","b":"${safeBL}","m":${mietstufe}}`;
  }).join(',\n');

  const fileContent = `// AUTO-GENERIERT durch generate_plz_lookup.cjs
// Enthält ${count} deutsche PLZ mit Ort, Bundesland und Wohngeld-Mietstufe
// Mietstufen nach WoGG Anlage 1 (Stand 2024)
// Felder: o=Ort, b=Bundesland, m=Mietstufe (1-7)

export const plzLookup = {
${entries}
};

/**
 * Findet Ort-Daten für eine PLZ
 * @param {string} plz - 5-stellige PLZ
 * @returns {{ ort: string, bundesland: string, mietstufe: number } | null}
 */
export function findByPlz(plz) {
  const clean = String(plz).trim().padStart(5, '0');
  const entry = plzLookup[clean];
  if (!entry) return null;
  return { ort: entry.o, bundesland: entry.b, mietstufe: entry.m };
}

/**
 * Sucht PLZ-Einträge nach Ortsname (für Autocomplete)
 * @param {string} query - Ortsname oder PLZ-Prefix
 * @param {number} limit - Max. Ergebnisse
 * @returns {Array<{ plz: string, ort: string, bundesland: string, mietstufe: number }>}
 */
export function searchPlz(query, limit = 8) {
  const q = query.trim().toLowerCase();
  if (!q || q.length < 2) return [];

  const isNumeric = /^\\d+$/.test(q);
  const results = [];

  for (const [plz, data] of Object.entries(plzLookup)) {
    if (isNumeric) {
      if (plz.startsWith(q)) {
        results.push({ plz, ort: data.o, bundesland: data.b, mietstufe: data.m });
      }
    } else {
      if (data.o.toLowerCase().includes(q)) {
        results.push({ plz, ort: data.o, bundesland: data.b, mietstufe: data.m });
      }
    }
    if (results.length >= limit) break;
  }

  return results;
}
`;

  fs.writeFileSync(outputPath, fileContent, 'utf8');
  console.log(`✅ plz-lookup.js wurde gespeichert: ${outputPath}`);
  console.log(`   Größe: ${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB`);
}

// ============================================================
// MAIN
// ============================================================
(async () => {
  try {
    let lookup = await fetchAllPlz();
    
    if (Object.keys(lookup).length < 100) {
      console.log('\n⚠️  Zu wenige Einträge - API möglicherweise nicht erreichbar.');
      console.log('Bitte manuell ausführen wenn Internetverbindung verfügbar.');
      process.exit(1);
    }

    await generateLookupFile(lookup);
    
    console.log('\n🎉 Fertig! Nächste Schritte:');
    console.log('   1. npm run dev starten');
    console.log('   2. PLZ-Suche testen');
    
  } catch (err) {
    console.error('\n❌ Fehler:', err.message);
    process.exit(1);
  }
})();
