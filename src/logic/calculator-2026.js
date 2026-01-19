/**
 * Sozialer Navigator - Berechnungs-Engine 2026
 * Stand: 01.01.2026
 * Logik: Absolute Ausschöpfung (Bürgergeld vs. Wohngeld + KiZ)
 */

export function calculateBestOption(data) {
    // --- KONSTANTEN 2026 ---
    const REGELSATZ_SINGLE = 563.00; // Bürgergeld Regelsatz
    const MINJOB_LIMIT = 603.00;     // Neue Grenze ab 01.01.2026
    const KIZ_MAX = 292.00;         // Maximaler Kinderzuschlag 2026 pro Kind
    const HEIZ_PAUSCHALE_QM = 1.20; // Heizkostenkomponente Wohngeld
    const KLIMA_PAUSCHALE_QM = 0.40; // Klimakomponente Wohngeld

    // Hilfswerte aus User-Input
    const { personen, mieteWarm, brutto, netto, kinderAnzahl, quadratmeter } = data;

    // --- 1. PFAD: BÜRGERGELD (SGB II) ---
    // Bedarf = Regelsatz (vereinfacht) + Miete
    const bgBedarf = (personen * REGELSATZ_SINGLE * 0.9) + mieteWarm; // 0.9 als Durchschnittsfaktor für Mehrpersonen
    
    // Einkommensanrechnung Bürgergeld
    let bgFreibetrag = 100; // Grundfreibetrag
    if (brutto > 100) {
        // 20% Freibetrag zwischen 100€ und 603€ (Minijob-Grenze)
        const teil1 = Math.min(brutto, MINJOB_LIMIT) - 100;
        bgFreibetrag += teil1 * 0.20;
    }
    const bgAnrechenbar = Math.max(0, netto - bgFreibetrag);
    const bgAnspruch = Math.max(0, bgBedarf - bgAnrechenbar);

    // --- 2. PFAD: WOHNGELD + KIZ (DAS MAXIMUM) ---
    // Wohngeld-Schätzung inkl. 2026er Boni
    // Hinweis: Basis-Wohngeld ist eine komplexe Formel, wir nutzen hier eine 
    // realistische Annäherung für die Vergleichslogik.
    const wgBasis = (mieteWarm * 0.45) - (netto * 0.15); // Approximations-Formel
    const wgHeizBonus = quadratmeter * HEIZ_PAUSCHALE_QM;
    const wgKlimaBonus = quadratmeter * KLIMA_PAUSCHALE_QM;
    
    const wgGesamt = Math.max(0, wgBasis + wgHeizBonus + wgKlimaBonus);
    const kizGesamt = kinderAnzahl * KIZ_MAX;
    
    const summeWohngeldPfad = wgGesamt + kizGesamt;

    // --- 3. DER "BEST-CHOICE" VERGLEICH ---
    const vorteilWG = summeWohngeldPfad > bgAnspruch;
    const differenz = Math.abs(summeWohngeldPfad - bgAnspruch);

    return {
        bestOption: vorteilWG ? 'WG_KIZ' : 'BUERGERGELD',
        empfehlung: vorteilWG 
            ? "Wohngeld + Kinderzuschlag ist lukrativer!" 
            : "Bürgergeld bietet aktuell die höhere Absicherung.",
        gewinn: differenz.toFixed(2),
        details: {
            buergergeld: bgAnspruch.toFixed(2),
            wohngeld: wgGesamt.toFixed(2),
            kiz: kizGesamt.toFixed(2),
            mietstufeRelevant: true,
            heizBonus: wgHeizBonus.toFixed(2)
        },
        rechtlicherHinweis: vorteilWG 
            ? "Du bist nicht auf das Jobcenter angewiesen. Wohngeld ist eine vorrangige Leistung."
            : "Aufgrund deines geringen Einkommens ist Bürgergeld die sicherste Wahl."
    };
}