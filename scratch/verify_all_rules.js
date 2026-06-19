import { calculateExactWohngeld } from '../src/logic/calculator-2026.js';
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

console.log("=== Running Verification Tests ===");

// 1. Wohngeld Case 1 & 3
const case1 = calculateExactWohngeld({
    income: 1200,
    rent: 400,
    persons: 1,
    kids: 0,
    mietstufe: 4,
    status: 'employee'
});
assert("Case 1 (1 Person Wohngeld)", case1.amount, 307);

const case3 = calculateExactWohngeld({
    income: 3000,
    rent: 1000,
    persons: 6,
    kids: 4,
    mietstufe: 4,
    status: 'employee'
});
assert("Case 3 (6 Persons Wohngeld)", case3.amount, 969);

// 2. BAföG Scenario Matrix
const checkBafoeg = (parents, selfInsured, expected) => {
    const res = evaluateAllBenefits({
        status: 'student',
        livesWithParents: parents,
        bafoegSelfInsured: selfInsured,
        parentIncomeBracket: 'low',
        persons: 1,
        kids: 0
    });
    const b = res.find(r => r.id === 'bafoeg');
    assert(`BAföG (parents=${parents}, selfInsured=${selfInsured})`, b.amount, expected);
};
checkBafoeg(false, false, 855);
checkBafoeg(false, true, 992);
checkBafoeg(true, false, 534);
checkBafoeg(true, true, 671);

// 3. Wohngeld Disability Allowance
const checkWohngeldAllowance = (desc, gdb, care, grad, expectedAllowance) => {
    const res = calculateExactWohngeld({
        income: 1500,
        rent: 500,
        persons: 2,
        kids: 0,
        mietstufe: 4,
        status: 'employee',
        hasDisability: gdb > 0,
        disabilityGdb: gdb,
        hasCareDependent: care,
        careDependentGrad: grad
    });
    // We can extract recognized allowance from the returned details
    assert(`Wohngeld Disability Allowance: ${desc}`, res.details.allowance, expectedAllowance);
};
checkWohngeldAllowance("GdB 50 without care", 50, false, "", 0);
checkWohngeldAllowance("GdB 100 without care", 100, false, "", 150);
checkWohngeldAllowance("GdB 50 + care PG 2", 50, true, "PG 2", 150);
checkWohngeldAllowance("PG 4 shortcut (no GdB input)", 0, true, "PG 4", 150);
checkWohngeldAllowance("PG 2 shortcut (no GdB input)", 0, true, "PG 2", 150);
checkWohngeldAllowance("PG 1 without GdB (not eligible)", 0, true, "PG 1", 0);

// 4. Pflegegeld, Pflegesachleistung, Entlastungsbetrag
const checkPflege = (grad, org, expectedAmount, expectedEntlastung) => {
    const res = evaluateAllBenefits({
        hasCareDependent: true,
        careDependentGrad: grad,
        careOrganization: org,
        persons: 2,
        kids: 0
    });
    const mainBenefit = res.find(r => r.id === (org === 'private' ? 'pflegegeld' : 'pflegesachleistung'));
    const entlastung = res.find(r => r.id === 'entlastungsbetrag');
    assert(`Care (${grad}, ${org})`, mainBenefit.amount, expectedAmount);
    assert(`Entlastungsbetrag (${grad}, ${org})`, entlastung.amount, expectedEntlastung);
};
checkPflege("PG 2", "private", 347, 131);
checkPflege("PG 3", "service", 1497, 131);
checkPflege("PG 4", "private", 800, 131);
checkPflege("PG 5", "service", 2299, 131);

// 5. Bavarian Landespflegegeld
const checkLandespflege = (plz, grad, expected) => {
    const res = evaluateAllBenefits({
        plz: plz,
        hasCareDependent: true,
        careDependentGrad: grad,
        persons: 2,
        kids: 0
    });
    const l = res.find(r => r.id === 'landespflegegeld');
    assert(`Landespflegegeld (${plz}, ${grad})`, l ? l.amount : 0, expected);
};
checkLandespflege("80331", "PG 2", 42); // Bayern PG 2 -> 42 €
checkLandespflege("80331", "PG 1", 0);  // Bayern PG 1 -> 0 €
checkLandespflege("10115", "PG 2", 150); // Berlin PG 2 -> 150 € (blind/deaf)

// 6. Bavarian Familiengeld/Krippengeld age cutoff
const checkBYCutoff = (ages, expectedFam, expectedKrippen, expectedFamEligible, expectedKripEligible) => {
    const res = evaluateAllBenefits({
        plz: "80331",
        kids: ages.length,
        kidsAges: ages,
        persons: 2 + ages.length,
        income: 2000
    });
    const fam = res.find(r => r.id === 'bay_familiengeld');
    const krip = res.find(r => r.id === 'krippengeld');
    assert(`Familiengeld amount for ages [${ages.join(', ')}]`, fam.amount, expectedFam);
    assert(`Familiengeld eligibility for ages [${ages.join(', ')}]`, fam.eligible, expectedFamEligible);
    assert(`Krippengeld amount for ages [${ages.join(', ')}]`, krip.amount, expectedKrippen);
    assert(`Krippengeld eligibility for ages [${ages.join(', ')}]`, krip.eligible, expectedKripEligible);
};
checkBYCutoff([0], 0, 0, 'none', 'none');
checkBYCutoff([1], 250, 100, 'possible', 'possible');
checkBYCutoff([2], 250, 100, 'probable', 'probable');
checkBYCutoff([3], 0, 0, 'none', 'none');
checkBYCutoff([1, 2], 500, 200, 'probable', 'probable'); // Krippengeld is probable because of age 2!

console.log(`\n=== Verification Finished with ${errors} error(s) ===`);
if (errors > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
