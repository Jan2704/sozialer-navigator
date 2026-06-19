import { evaluateAllBenefits } from "../src/logic/benefit-engine.js";

// Dummy selectedCity representing Leipzig (Mietstufe 4)
const dummyCity = {
    plz: "04109",
    stadt: "Leipzig",
    mietstufe: 4
};

console.log("====================================================");
console.log("RUNNING BENEFIT ENGINE TESTS FOR 2026 PROFILES");
console.log("====================================================\n");

// --- PROFILE 1: Familie mit 2 Kindern und geringem Einkommen ---
console.log("--- TESTCASE 1: Familie (2 Erwachsene, 2 Kinder) ---");
const profile1 = {
    income: 1600,             // Gross income of parent 1
    rent: 640,               // Kaltmiete (80% of 800)
    heating: 160,            // Heizkosten (20% of 800)
    selectedCity: dummyCity,
    persons: 4,              // 2 adults, 2 kids
    kids: 2,                 // 2 kids
    status: "employee",
    expenses: 100,           // Werbungskosten
    maintenance: 0,
    hasDisability: false,
    isPregnantOrNewborn: false,
    netIncomeBeforeBirth: 0,
    elterngeldOption: "basis",
    childOwnIncome: 0,
    hasHighAssets: false
};

const results1 = evaluateAllBenefits(profile1);
printResults(results1);

// --- PROFILE 2: Alleinerziehende mit Neugeborenem ---
console.log("--- TESTCASE 2: Alleinerziehende mit Neugeborenem (1 Erwachsener, 1 Kind < 14m) ---");
const profile2 = {
    income: 0,               // Current income (during Elternzeit)
    rent: 480,               // Kaltmiete (80% of 600)
    heating: 120,            // Heizkosten (20% of 600)
    selectedCity: dummyCity,
    persons: 2,              // 1 adult, 1 newborn
    kids: 1,                 // 1 kid
    status: "employee",
    expenses: 0,
    maintenance: 0,
    hasDisability: false,
    isPregnantOrNewborn: true,  // Newborn under 14 months
    netIncomeBeforeBirth: 1200, // Net income before birth
    elterngeldOption: "basis",
    childOwnIncome: 0,
    hasHighAssets: false
};

const results2 = evaluateAllBenefits(profile2);
printResults(results2);

// --- PROFILE 3: Single ohne Kinder ---
console.log("--- TESTCASE 3: Single ohne Kinder ---");
const profile3 = {
    income: 3200,            // Gross income
    rent: 560,               // Kaltmiete (80% of 700)
    heating: 140,            // Heizkosten (20% of 700)
    selectedCity: dummyCity,
    persons: 1,
    kids: 0,
    status: "employee",
    expenses: 100,
    maintenance: 0,
    hasDisability: false,
    isPregnantOrNewborn: false,
    netIncomeBeforeBirth: 0,
    elterngeldOption: "basis",
    childOwnIncome: 0,
    hasHighAssets: false
};

const results3 = evaluateAllBenefits(profile3);
printResults(results3);

function printResults(results) {
    const groups = { probable: [], possible: [], none: [] };
    for (const r of results) {
        groups[r.eligible].push(r);
    }
    
    console.log("Probable Claims (Anspruch wahrscheinlich):");
    if (groups.probable.length === 0) console.log("  None");
    for (const r of groups.probable) {
        console.log(`  - [${r.name}] Amount: ${r.amount} € | Reasoning: ${r.reasoning}`);
    }
    
    console.log("\nPossible Claims (Eventuell anspruchsberechtigt - prüfen lohnt sich):");
    if (groups.possible.length === 0) console.log("  None");
    for (const r of groups.possible) {
        console.log(`  - [${r.name}] Amount: ${r.amount} € | Reasoning: ${r.reasoning}`);
    }
    
    console.log("\nNo Claim (Kein Anspruch):");
    if (groups.none.length === 0) console.log("  None");
    for (const r of groups.none) {
        console.log(`  - [${r.name}] Amount: ${r.amount} € | Reasoning: ${r.reasoning}`);
    }
    console.log("----------------------------------------------------\n");
}
