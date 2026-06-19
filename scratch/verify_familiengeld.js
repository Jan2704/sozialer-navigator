import { evaluateAllBenefits } from '../src/logic/benefit-engine.js';

let errors = 0;

function assert(description, actual, expected) {
    if (actual === expected) {
        console.log(`✅ PASS: ${description} (got ${actual})`);
    } else {
        console.log(`❌ FAIL: ${description} (expected ${expected}, got ${actual})`);
        errors++;
    }
}

function assertContains(description, actualStr, substring) {
    if (actualStr && actualStr.includes(substring)) {
        console.log(`✅ PASS: ${description} (contains "${substring}")`);
    } else {
        console.log(`❌ FAIL: ${description} (expected to contain "${substring}", got "${actualStr}")`);
        errors++;
    }
}

console.log("=== Running Familiengeld Cutoff Verification Tests ===");

// Helper to run engine with BY PLZ and kids
const checkFamiliengeld = (ages, years) => {
    return evaluateAllBenefits({
        plz: "80331", // Munich (Bayern)
        kids: ages.length,
        kidsAges: ages,
        kidsBirthYears: years,
        persons: 2 + ages.length,
        income: 2000
    });
};

// Case 1: Born Dec 2024 (year 2024), age 1 -> probable, 250 €
const case1 = checkFamiliengeld([1], [2024]);
const fam1 = case1.find(r => r.id === 'bay_familiengeld');
const krip1 = case1.find(r => r.id === 'krippengeld');
assert("Case 1 (BY Familiengeld, born 2024, age 1): eligible", fam1.eligible, "probable");
assert("Case 1 (BY Familiengeld, born 2024, age 1): amount", fam1.amount, 250);
assert("Case 1 (BY Krippengeld, born 2024, age 1): eligible", krip1.eligible, "probable");
assert("Case 1 (BY Krippengeld, born 2024, age 1): amount", krip1.amount, 100);

// Case 2: Born Feb 2025 (year 2025), age 1 -> none, 0 €
const case2 = checkFamiliengeld([1], [2025]);
const fam2 = case2.find(r => r.id === 'bay_familiengeld');
const krip2 = case2.find(r => r.id === 'krippengeld');
assert("Case 2 (BY Familiengeld, born 2025, age 1): eligible", fam2.eligible, "none");
assert("Case 2 (BY Familiengeld, born 2025, age 1): amount", fam2.amount, 0);
assertContains("Case 2 (BY Familiengeld, born 2025, age 1): reasoning cutoff note", fam2.reasoning, "ersatzlos gestrichen");
assert("Case 2 (BY Krippengeld, born 2025, age 1): eligible", krip2.eligible, "none");
assert("Case 2 (BY Krippengeld, born 2025, age 1): amount", krip2.amount, 0);
assertContains("Case 2 (BY Krippengeld, born 2025, age 1): reasoning cutoff note", krip2.reasoning, "ersatzlos gestrichen");

// Case 3: Only age 1, no birth year -> possible, 250 €
const case3 = checkFamiliengeld([1], [0]);
const fam3 = case3.find(r => r.id === 'bay_familiengeld');
const krip3 = case3.find(r => r.id === 'krippengeld');
assert("Case 3 (BY Familiengeld, unknown year, age 1): eligible", fam3.eligible, "possible");
assert("Case 3 (BY Familiengeld, unknown year, age 1): amount", fam3.amount, 250);
assertContains("Case 3 (BY Familiengeld, unknown year, age 1): warning note", fam3.reasoning, "hängt vom Geburtsdatum ab");
assert("Case 3 (BY Krippengeld, unknown year, age 1): eligible", krip3.eligible, "possible");
assert("Case 3 (BY Krippengeld, unknown year, age 1): amount", krip3.amount, 100);
assertContains("Case 3 (BY Krippengeld, unknown year, age 1): warning note", krip3.reasoning, "Bestandsschutz");

// Case 4: Born 2024 (year 2024), but age 3 -> none, 0 €
const case4 = checkFamiliengeld([3], [2024]);
const fam4 = case4.find(r => r.id === 'bay_familiengeld');
const krip4 = case4.find(r => r.id === 'krippengeld');
assert("Case 4 (BY Familiengeld, born 2024, but age 3): eligible", fam4.eligible, "none");
assert("Case 4 (BY Familiengeld, born 2024, but age 3): amount", fam4.amount, 0);
assertContains("Case 4 (BY Familiengeld, born 2024, but age 3): reasoning age-out/in note", fam4.reasoning, "Alter von 13 bis 36 Monaten");
assert("Case 4 (BY Krippengeld, born 2024, but age 3): eligible", krip4.eligible, "none");
assert("Case 4 (BY Krippengeld, born 2024, but age 3): amount", krip4.amount, 0);
assertContains("Case 4 (BY Krippengeld, born 2024, but age 3): reasoning age-out/in note", krip4.reasoning, "Alter von 12 bis 36 Monaten");

console.log(`\n=== Verification Finished with ${errors} error(s) ===`);
if (errors > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
