import { evaluateAllBenefits } from '../src/logic/benefit-engine.js';

console.log("--- Testing BY Familiengeld & Krippengeld cutoff ---");

const testCutoff = (ages) => {
    const input = {
        plz: "80331", // Munich (Bayern)
        kids: ages.length,
        kidsAges: ages,
        income: 2000,
        persons: 2 + ages.length
    };
    const results = evaluateAllBenefits(input);
    const fam = results.find(r => r.id === "bay_familiengeld");
    const krip = results.find(r => r.id === "krippengeld");
    console.log(`Kids ages: [${ages.join(', ')}]`);
    console.log(`  Familiengeld: eligible=${fam.eligible}, amount=${fam.amount}, reasoning=${fam.reasoning}`);
    console.log(`  Krippengeld:  eligible=${krip.eligible}, amount=${krip.amount}, reasoning=${krip.reasoning}`);
};

testCutoff([0]);
testCutoff([1]);
testCutoff([2]);
testCutoff([3]);
testCutoff([1, 2]);
