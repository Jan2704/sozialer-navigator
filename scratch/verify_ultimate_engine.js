/**
 * Verification Script for Sozialer Navigator 2026 Ultimate Engine
 * Tests all 30 social benefits across various citizen profiles.
 */
import { evaluateAllBenefits } from "../src/logic/benefit-engine.js";

const testProfiles = [
  {
    name: "Scenario A: Low-Income Renting Family in Bavaria (Eligible for Familiengeld, Kinderzuschlag)",
    input: {
      age: 32,
      plz: "80331", // Munich, Bavaria
      selectedCity: { stadt: "München", plz: "80331", mietstufe: 7 },
      status: "employee",
      persons: 4,
      kids: 2,
      kidsAges: [2, 7], // Baby (24 months) triggers BY Familiengeld
      isPregnantOrNewborn: false,
      hasCareDependent: false,
      housingType: "Miete",
      rent: 950,
      heating: 120,
      income: 2600, // Gross
      expenses: 120, // Werbungskosten
      maintenance: 0,
      hasDisability: false,
      hasHighAssets: false
    }
  },
  {
    name: "Scenario B: Single Mother (Renting, child 8, other parent pays no support)",
    input: {
      age: 28,
      plz: "10117", // Berlin
      selectedCity: { stadt: "Berlin", plz: "10117", mietstufe: 4 },
      status: "employee",
      persons: 2,
      kids: 1,
      kidsAges: [8],
      isPregnantOrNewborn: false,
      hasCareDependent: false,
      isSingleParent: true,
      childSupportReceived: "none",
      housingType: "Miete",
      rent: 550,
      heating: 80,
      income: 1200, // Gross
      expenses: 102,
      maintenance: 0,
      hasDisability: false,
      hasHighAssets: false
    }
  },
  {
    name: "Scenario C: Pensioner in Hesse (Low pension, homeowner, Pflegegrad 3)",
    input: {
      age: 72,
      plz: "60311", // Frankfurt, Hesse
      selectedCity: { stadt: "Frankfurt", plz: "60311", mietstufe: 6 },
      status: "pensioner",
      persons: 2,
      kids: 0,
      hasCareDependent: true,
      careDependentGrad: "PG 3",
      careOrganization: "private",
      housingType: "Eigentum",
      interest: 200,
      operatingCosts: 180,
      propertyTax: 30,
      housingArea: 75,
      income: 1100, // Pension
      hasDisability: true,
      disabilityGdb: 80,
      hasHighAssets: false,
      grundrenteYears: "35+"
    }
  },
  {
    name: "Scenario D: Student living alone in Berlin (Eligible for BAföG)",
    input: {
      age: 21,
      plz: "14195", // Berlin
      selectedCity: { stadt: "Berlin", plz: "14195", mietstufe: 4 },
      status: "student",
      schoolType: "Universität",
      livesWithParents: false,
      parentIncomeBracket: "normal",
      persons: 1,
      kids: 0,
      housingType: "Miete",
      rent: 400,
      heating: 50,
      income: 0,
      hasHighAssets: false
    }
  }
];

console.log("=== RUNNING BENEFIT ENGINE VERIFICATION TEST SUITE ===");

for (const profile of testProfiles) {
  console.log(`\n---------------------------------------------------------`);
  console.log(`Running Profile: ${profile.name}`);
  console.log(`---------------------------------------------------------`);
  try {
    const results = evaluateAllBenefits(profile.input);
    const activeBenefits = results.filter(r => r.eligible !== "none" || r.amount > 0);
    
    console.log("Active Benefits:");
    for (const b of activeBenefits) {
      console.log(`- [${b.eligible.toUpperCase()}] ${b.name}: ${b.amount} € (${b.type})`);
      console.log(`  Reason: ${b.reasoning}`);
    }
  } catch (err) {
    console.error(`ERROR running test for ${profile.name}:`, err);
  }
}
