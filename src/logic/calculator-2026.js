
// RENT LIMITS 2026 (Base + Climate + Heating)
// Source: WoGG Anlage 1 + 2 + Heating Component (Step 95 Table)
// Values are rounded to integers as per standard tables, official law uses precise values but tables are usually the reference.
export const RENT_LIMITS = {
    1: [491, 538, 586, 641, 692, 745, 807],
    2: [604, 660, 718, 786, 847, 912, 988],
    3: [728, 795, 865, 948, 1022, 1100, 1193],
    4: [851, 929, 1011, 1108, 1196, 1289, 1399],
    5: [973, 1062, 1155, 1266, 1368, 1475, 1599]
};
const EXTRA_PERSON_LIMIT = [104, 114, 124, 136, 147, 159, 172]; // Per extra person per Mietstufe

// WoGG Coefficients 2025/2026 (a, b, c) - Anlage 2
const WOGG_COEFFS = {
    1: { a: 0.040, b: 0.0004797, c: 0.0000408 },
    2: { a: 0.030, b: 0.0003571, c: 0.0000304 },
    3: { a: 0.020, b: 0.0002917, c: 0.0000245 },
    4: { a: 0.010, b: 0.0002163, c: 0.0000176 },
    5: { a: 0.000, b: 0.0001907, c: 0.0000172 },
    6: { a: -0.010, b: 0.0001722, c: 0.0000166 },
    // Fallback for > 6 typically stabilizes or follows curve, using 6 is the standard approximation for logic unless specific high-household table used.
    // For 7+ let's use the trend if critical or clamp to 6.
    // Given the task request for "Scientific", strict values for >6 would be better.
    // Step 106 provided 7-12.
    7: { a: -0.020, b: 0.0001592, c: 0.0000165 },
    8: { a: -0.030, b: 0.0001583, c: 0.0000165 },
    9: { a: -0.040, b: 0.0001376, c: 0.0000166 },
    10: { a: -0.060, b: 0.0001249, c: 0.0000166 },
    11: { a: -0.090, b: 0.0001141, c: 0.0000196 },
    12: { a: -0.120, b: 0.0001107, c: 0.0000221 }
};


function getRentLimit(persons, mietstufe) {
    const p = Math.min(Math.max(1, persons), 5); // Table only goes to 5 keys
    const msIdx = Math.min(Math.max(1, mietstufe), 7) - 1;

    let limit = 0;
    if (persons <= 5) {
        limit = RENT_LIMITS[persons][msIdx];
    } else {
        // Base for 5
        limit = RENT_LIMITS[5][msIdx];
        // Add extra for each person > 5
        const extra = persons - 5;
        limit += extra * EXTRA_PERSON_LIMIT[msIdx];
    }
    return limit;
}

function calculateBuergergeld({ income, rent, heating = 0, regelsatz = 563, rentLimit = 0, persons = 1, kids = 0, expenses = 0, maintenance = 0 }) {
    let inc = parseFloat(income) || 0;
    const rnt = parseFloat(rent) || 0;
    const heat = parseFloat(heating) || 0;
    const exp = parseFloat(expenses) || 0;
    const maint = parseFloat(maintenance) || 0;

    // Validate inputs
    const numPersons = Math.max(1, parseInt(persons) || 1);
    const numKids = Math.max(0, parseInt(kids) || 0);
    const numAdults = Math.max(1, numPersons - numKids);

    // --- 1. Needs Calculation (Bedarf) ---

    // A. Regelsatz (Standard Rate) Strategy
    // 2024/2025 Rates (Approx):
    // Single: 563
    // Partners: 506 each
    // Children: Avg ~390 (Age dependent 357-471, we use avg)

    let totalRegelsatz = 0;

    // Adults
    if (numAdults === 1) {
        totalRegelsatz += 563; // Single Adult
    } else {
        totalRegelsatz += numAdults * 506; // Partners/Community
    }

    // Children
    if (numKids > 0) {
        totalRegelsatz += numKids * 390;
    }

    // B. Mehrbedarfe (Additional Needs)
    // Single Parent (Alleinerziehend)
    let mehrbedarf = 0;
    if (numAdults === 1 && numKids > 0) {
        // Flat 36% of 563 for simplicity (correct varies by kid age/number)
        mehrbedarf += 563 * 0.36;
    }

    // C. Shelter (KdU)
    // Use actual rent if plausible, else cap.
    // Logic: Use Rent up to Limit + 10% tolerance, OR full rent if likely reasonable
    // For specific user case: 900 Rent for 3 people is likely appropriate.
    // We trust the input 'rent' mostly, applying a loose safety cap.
    const effectiveRentLimit = rentLimit > 0 ? rentLimit * 1.2 : 9999;
    const eligibleRent = Math.min(rnt, effectiveRentLimit);
    const eligibleHeating = heat; // Assume full heating covered initially

    const totalNeed = totalRegelsatz + mehrbedarf + eligibleRent + eligibleHeating;


    // --- 2. Income Calculation ---

    // Deductions
    // Gross Income - Taxes (approx 30% for Netto if not provided) - Expenses - Freibetrag
    // The input 'income' is Brutto usually.
    // Formula simplification for MVP:

    // Netto Proxy (if input is Brutto)
    // If input seems like Brutto (e.g. > 1500 for family), we assume Netto is ~70%
    // BUT parameter says 'income' (Brutto).
    // Let's rely on standard Freibetrag logic on Brutto.

    inc = Math.max(0, inc);

    // Freibetrag on Brutto
    let freeAmount = 0;
    if (inc > 0) {
        // Basic 100
        freeAmount += Math.min(inc, 100);

        // 100-520 (20%)
        if (inc > 100) {
            freeAmount += Math.min(inc - 100, 420) * 0.20;
        }

        // 520-1000 (30%)
        if (inc > 520) {
            freeAmount += Math.min(inc - 520, 480) * 0.30;
        }

        // 1000-1200 (10%) (or 1500 with child)
        if (inc > 1000) {
            const topCap = (numKids > 0) ? 1500 : 1200;
            freeAmount += Math.min(Math.max(inc - 1000, 0), topCap - 1000) * 0.10;
        }
    }

    // For "Anrechenbares Einkommen", we need Netto.
    // Since we don't have exact Netto, we estimate based on Brutto.
    // Low incomes have much lower deductions (only ~20% Sozialversicherung, little/no Tax).
    // High incomes have higher deductions (~35-40%).

    let nettoFactor = 0.7; // Default

    // Family Helper (Synced with Priority Logic)
    // If kids > 0 or persons > 1, the tax burden is lower.
    const isFamily = (numKids > 0 || numPersons > 1);
    const taxFreeBonus = isFamily ? 1000 : 0;

    if (inc <= (538 + taxFreeBonus)) nettoFactor = 1.0;
    else if (inc <= (2200 + taxFreeBonus)) nettoFactor = 0.78;
    else if (inc <= (3500 + taxFreeBonus)) nettoFactor = 0.73;
    else nettoFactor = 0.68;

    let estimatedNetto = inc * nettoFactor;

    let countableIncome = Math.max(0, estimatedNetto - exp - maint - freeAmount);

    // --- 3. Result ---
    const claimAmount = Math.max(0, totalNeed - countableIncome);

    return {
        eligible: claimAmount > 0,
        amount: Math.round(claimAmount),
        type: "Bürgergeld",
        details: {
            standardRate: totalRegelsatz,
            mehrbedarf: Math.round(mehrbedarf),
            eligibleRent,
            eligibleHeating,
            totalNeed: Math.round(totalNeed),
            countableIncome: Math.round(countableIncome)
        }
    };
}

function calculateExactWohngeld({ income, rent, persons = 1, mietstufe = 1, expenses = 0, maintenance = 0 }) {
    // 1. Inputs
    let Y = parseFloat(income) || 0; // Gesamteinkommen (monatlich, steuerpflichtig)
    const M_actual = parseFloat(rent) || 0;
    const exp = parseFloat(expenses) || 0;
    const maint = parseFloat(maintenance) || 0;

    // Deduct Expenses/Maintenance to get "Y" (Gesamteinkommen nach WoGG)
    // Note: Usually WoGG deducts "Pauschal 10/20/30%" from Brutto.
    // KEY FIX: The input 'income' is Brutto. usage of full Brutto makes Y too high.
    // We assume standard employee (Tax + Health + Pension) -> ~30% deduction.
    // Y = (Brutto - Expenses - Maintenance) * 0.7

    // First deduct specific expenses if any
    let intermediateY = Math.max(0, Y - exp - maint);

    // Then apply global pauschal deduction (30% for Tax/Soz)
    // This is an estimation. Real WoGG checks if you actually pay these.
    // For a general calculator, 30% is the standard expectation for employees.
    Y = intermediateY * 0.7;

    // 2. Rent Cap
    const M_limit = getRentLimit(persons, mietstufe);

    // M = Eligible Rent (Round to Integer)
    const M = Math.round(Math.min(M_actual, M_limit));

    // 3. Coefficients
    const pKey = Math.min(persons, 12); // clamp to 12
    const coeffs = WOGG_COEFFS[pKey] || WOGG_COEFFS[6]; // fallback
    const { a, b, c } = coeffs;

    // 4. Formula: 1.15 * (M - (a + b*M + c*Y)*Y)
    // z1 = a + bM + cY
    const z1 = a + (b * M) + (c * Y);

    // z2 = z1 * Y
    const z2 = z1 * Y;

    // z3 = M - z2
    const z3 = M - z2;

    // Wohngeld = 1.15 * z3
    let wg = 1.15 * z3;

    // 5. Min Income Check (Plausibility)
    // Approx Regelsatz check. If Y is too low (~ < 300€/pers), WoGG is rejected for "implausible" -> Refer to BG.
    // But algorithmically, formula might give huge amount.
    // We stick to formula but flag "eligible" only if > 10€.
    wg = Math.max(0, wg);

    return {
        eligible: wg >= 10,
        amount: Math.round(wg),
        type: "Wohngeld",
        details: {
            eligibleRent: M,
            formulaComponents: { M, Y, z1, z2, z3 },
            limit: M_limit
        }
    };
}


export function calculateBestOption({ income, rent, heating = 0, regelsatz = 563, rentLimit = 0, persons = 1, kids = 0, expenses = 0, maintenance = 0, city = null }) {
    // Determine Mietstufe from City Object if available, else 1
    const mietstufe = city ? city.mietstufe : 1;

    // Determine Global Rent Limit for this case
    const limit = getRentLimit(persons, mietstufe);

    // 1. Exact Wohngeld
    const wgResult = calculateExactWohngeld({
        income, rent, persons, mietstufe, expenses, maintenance
    });

    // 2. Bürgergeld
    const bgResult = calculateBuergergeld({
        income, rent, heating, regelsatz, rentLimit: limit, persons, kids, expenses, maintenance
    });


    // DECISION LOGIC: VORRANGPRÜFUNG (Priority Check)
    // § 12a SGB II: You must utilize prioritized benefits (like Wohngeld) if they avoid the need for SGB II.
    // Logic: If (Real Disposable Income + Wohngeld) >= Total Need (SGB II Level),
    // then you are prioritized for Wohngeld (and likely excluded from SGB II or forced to switch).

    // 1. Estimate Real Netto for Comparison (Reuse logic from BG)
    // Note: We use the same Netto estimation as in calculateBuergergeld for consistency.
    // 1. Estimate Real Netto for Comparison (Reuse logic from BG)
    // Note: We use the same Netto estimation as in calculateBuergergeld for consistency.
    let nettoFactor = 0.7;
    const inc = parseFloat(income) || 0;

    // Family Helper: Higher Free Income / Lower effective tax due to splitting/kids
    // Primitive Approach: Increase threshold effectively for families
    // If kids > 0 or persons > 1, the tax burden is lower for same income.
    const isFamily = (kids > 0 || persons > 1);
    const taxFreeBonus = isFamily ? 1000 : 0; // Shift thresholds up

    if (inc <= (538 + taxFreeBonus)) nettoFactor = 1.0;
    else if (inc <= (2200 + taxFreeBonus)) nettoFactor = 0.78;
    else if (inc <= (3500 + taxFreeBonus)) nettoFactor = 0.73; // Slightly better than 0.7
    else nettoFactor = 0.68;

    // Real available money (Netto - Expenses)
    const netIncomeForCheck = (inc * nettoFactor) - expenses - maintenance;

    // 2. Check Sufficiency
    const coversNeed = (netIncomeForCheck + wgResult.amount) >= bgResult.details.totalNeed;

    // 3. Decision
    if (wgResult.eligible && coversNeed) {
        // Wohngeld is sufficient -> Priority!
        return wgResult;
    }

    if (bgResult.amount > wgResult.amount && bgResult.eligible) {
        // Wohngeld not sufficient, and BG pays more -> SGB II
        return bgResult;
    }

    if (wgResult.eligible) {
        // WG eligible, BG not (or WG pays more)
        return wgResult;
    }

    // Default to Wohngeld (likely both 0)
    return wgResult;
}
