import { calculateBuergergeld, calculateExactWohngeld, RENT_LIMITS } from "./calculator-2026.js";

/**
 * Modular Benefit Engine for Sozialer Navigator 2026
 * Performs all calculations fully client-side in the browser.
 * Covers 30 distinct social benefits, cost exemptions, and tax credits.
 */

// Helper to format currency
const formatEuro = (val) => Math.round(val) + " €";

// Helper to determine Federal State (Bundesland) from PLZ
export function getBundeslandFromPlz(plz) {
    if (!plz) return 'OTH';
    const cleanPlz = String(plz).trim().replace(/\D/g, '');
    if (cleanPlz.length < 2) return 'OTH';
    
    const prefix2 = parseInt(cleanPlz.substring(0, 2), 10);
    
    if (prefix2 >= 10 && prefix2 <= 14) return 'BE'; // Berlin
    if (prefix2 >= 20 && prefix2 <= 22) return 'HH'; // Hamburg
    if (prefix2 === 28 || cleanPlz.startsWith('275')) return 'HB'; // Bremen
    if ((prefix2 >= 80 && prefix2 <= 87) || (prefix2 >= 90 && prefix2 <= 97)) return 'BY'; // Bayern
    if ((prefix2 >= 60 && prefix2 <= 65) || (prefix2 >= 34 && prefix2 <= 36)) return 'HE'; // Hessen
    if (prefix2 === 66) return 'SL'; // Saarland
    if ((prefix2 >= 68 && prefix2 <= 79) || prefix2 === 88 || prefix2 === 89) return 'BW'; // Baden-Württemberg
    if ((prefix2 >= 40 && prefix2 <= 48) || (prefix2 >= 50 && prefix2 <= 53) || (prefix2 >= 57 && prefix2 <= 59) || prefix2 === 32 || prefix2 === 33) return 'NW'; // NRW
    if ((prefix2 >= 54 && prefix2 <= 56) || prefix2 === 67) return 'RP'; // RLP
    if (prefix2 >= 23 && prefix2 <= 25) return 'SH'; // Schleswig-Holstein
    if (prefix2 === 26 || prefix2 === 27 || (prefix2 >= 29 && prefix2 <= 31) || prefix2 === 37 || prefix2 === 38 || prefix2 === 49) return 'NI'; // Niedersachsen
    if (prefix2 === 15 || prefix2 === 16 || prefix2 === 14) return 'BB'; // Brandenburg
    if (prefix2 >= 17 && prefix2 <= 19) return 'MV'; // Meck-Pomm
    if ((prefix2 >= 1 && prefix2 <= 4) || prefix2 === 8 || prefix2 === 9) return 'SN'; // Sachsen
    if (prefix2 === 7) return 'TH'; // Thüringen
    if (prefix2 === 6 || prefix2 === 39) return 'ST'; // Sachsen-Anhalt

    return 'OTH';
}

// -------------------------------------------------------------
// MODULES DEFINITIONS
// -------------------------------------------------------------

/** 1. Kindergeld */
const KindergeldModule = {
    id: "kindergeld",
    name: "Kindergeld",
    category: "Familie",
    isRelevant: (input) => (parseInt(input.kids) || 0) > 0,
    calculate: (input) => {
        const kidsCount = parseInt(input.kids) || 0;
        const amount = 259 * kidsCount;
        return {
            eligible: "probable",
            amount: amount,
            type: "Kindergeld",
            reasoning: `Sie erhalten für Ihre ${kidsCount} ${kidsCount === 1 ? 'Kind' : 'Kinder'} monatlich ${formatEuro(amount)} Kindergeld (259 € pro Kind, Stand 2026).`
        };
    }
};

/** 2. Elterngeld */
const ElterngeldModule = {
    id: "elterngeld",
    name: "Elterngeld",
    category: "Familie",
    isRelevant: (input) => !!input.isPregnantOrNewborn,
    calculate: (input) => {
        const netBefore = parseFloat(input.netIncomeBeforeBirth) || 0;
        if (netBefore <= 0) {
            return {
                eligible: "possible",
                amount: 300,
                type: "Mindestelterngeld",
                reasoning: "Ohne Angabe des Voreinkommens erhalten Sie den gesetzlichen Mindestbetrag von 300 € Elterngeld monatlich."
            };
        }
        let rate = 0.65;
        if (netBefore < 1000) {
            const diff = 1000 - netBefore;
            rate = Math.min(1.0, 0.67 + Math.floor(diff / 2) * 0.001);
        } else if (netBefore <= 1200) {
            rate = 0.67;
        } else if (netBefore <= 1240) {
            const diff = netBefore - 1200;
            rate = Math.max(0.65, 0.67 - Math.floor(diff / 2) * 0.001);
        }
        let basis = Math.max(300, Math.min(1800, netBefore * rate));
        const isPlus = input.elterngeldOption === "plus";
        const finalAmount = isPlus ? basis / 2 : basis;
        return {
            eligible: "probable",
            amount: Math.round(finalAmount),
            type: isPlus ? "Elterngeld Plus" : "Basiselterngeld",
            reasoning: `Basierend auf Ihrem Voreinkommen beträgt Ihr Anspruch ca. ${formatEuro(finalAmount)} monatlich als ${isPlus ? 'Elterngeld Plus' : 'Basiselterngeld'}.`
        };
    }
};

/** 3. Kinderzuschlag */
const KinderzuschlagModule = {
    id: "kinderzuschlag",
    name: "Kinderzuschlag",
    category: "Familie",
    isRelevant: (input) => (parseInt(input.kids) || 0) > 0,
    calculate: (input) => {
        const kidsCount = parseInt(input.kids) || 0;
        const parentsCount = Math.max(1, (parseInt(input.persons) || 1) - kidsCount);
        const parentGross = parseFloat(input.income) || 0;
        const minGross = parentsCount === 1 ? 600 : 900;
        
        if (parentGross < minGross) {
            return {
                eligible: "none",
                amount: 0,
                type: "Kinderzuschlag",
                reasoning: `Ihr Bruttoeinkommen (${formatEuro(parentGross)}) liegt unter dem Mindesteinkommen von ${formatEuro(minGross)} für den Kinderzuschlag.`
            };
        }
        if (input.hasHighAssets) {
            return {
                eligible: "none",
                amount: 0,
                type: "Kinderzuschlag",
                reasoning: "Ein Anspruch auf Kinderzuschlag ist wegen Überschreitung des Schonvermögens ausgeschlossen."
            };
        }
        
        // Countable parent income estimate (75% net approximation)
        const parentNet = parentGross * 0.75;
        const totalPersons = parseInt(input.persons) || 1;
        const parentRentShare = (parseFloat(input.rent) || 400) * (parentsCount / totalPersons);
        const parentNeeds = (parentsCount === 1 ? 563 : 1012) + parentRentShare;
        const exceedingParentIncome = Math.max(0, parentNet - parentNeeds);
        const parentIncomeReduction = exceedingParentIncome * 0.45;
        const childOwnIncome = parseFloat(input.childOwnIncome) || 0;
        
        const maxKiZ = 297 * kidsCount;
        const finalKiZ = Math.max(0, maxKiZ - childOwnIncome - parentIncomeReduction);
        
        if (finalKiZ <= 0) {
            return {
                eligible: "none",
                amount: 0,
                type: "Kinderzuschlag",
                reasoning: "Aufgrund des Familieneinkommens ist der Kinderzuschlag rechnerisch auf 0 € reduziert."
            };
        }
        return {
            eligible: "probable",
            amount: Math.round(finalKiZ),
            type: "Kinderzuschlag",
            reasoning: `Sie haben Anspruch auf bis zu ${formatEuro(finalKiZ)} monatlich zusätzlich zum Kindergeld. Dies befreit Sie zudem von Kita-Gebühren.`
        };
    }
};

/** 4. Wohngeld Mietzuschuss */
const WohngeldModule = {
    id: "wohngeld",
    name: "Wohngeld (Mietzuschuss)",
    category: "Wohnen",
    isRelevant: (input) => input.housingType !== "Eigentum" && input.status !== "student",
    calculate: (input) => {
        if (input.hasHighAssets) {
            return { eligible: "none", amount: 0, type: "Wohngeld", reasoning: "Aufgrund Ihres Schonvermögens (>60k €) besteht kein Anspruch." };
        }
        const wg = calculateExactWohngeld({
            income: parseFloat(input.income) || 0,
            rent: parseFloat(input.rent) || 0,
            persons: parseInt(input.persons) || 1,
            kids: parseInt(input.kids) || 0,
            mietstufe: input.selectedCity ? input.selectedCity.mietstufe : 4,
            expenses: parseFloat(input.expenses) || 0,
            maintenance: parseFloat(input.maintenance) || 0,
            status: input.status || 'employee',
            hasDisability: !!input.hasDisability,
            disabilityGdb: parseFloat(input.disabilityGdb) || 0,
            hasCareDependent: !!input.hasCareDependent,
            careDependentGrad: input.careDependentGrad
        });
        if (!wg.eligible || wg.amount < 10) {
            return { eligible: "none", amount: 0, type: "Wohngeld", reasoning: "Ihr Einkommen überschreitet die maßgebliche Wohngeldgrenze." };
        }
        return {
            eligible: "probable",
            amount: wg.amount,
            type: "Wohngeld (Mietzuschuss)",
            reasoning: `Sie haben voraussichtlich Anspruch auf ${formatEuro(wg.amount)} monatlichen Mietzuschuss.`
        };
    }
};

/** 5. Lastenzuschuss (Wohngeld für Eigentümer) */
const LastenzuschussModule = {
    id: "lastenzuschuss",
    name: "Lastenzuschuss",
    category: "Wohnen",
    isRelevant: (input) => input.housingType === "Eigentum" && input.status !== "student",
    calculate: (input) => {
        if (input.hasHighAssets) {
            return { eligible: "none", amount: 0, type: "Lastenzuschuss", reasoning: "Aufgrund Ihres Schonvermögens (>60k €) besteht kein Anspruch." };
        }
        const mietstufe = input.selectedCity ? input.selectedCity.mietstufe : 4;
        const size = parseInt(input.persons) || 1;
        const interest = parseFloat(input.interest) || 0;
        const opCosts = parseFloat(input.operatingCosts) || 0;
        const propTax = parseFloat(input.propertyTax) || 0;
        
        let housingCosts = interest + opCosts + propTax;
        
        // Auto-estimate if interest is missing
        if (interest === 0) {
            const limit = RENT_LIMITS[Math.min(size, 5)][mietstufe - 1] || 500;
            housingCosts = limit * 0.8;
        }
        
        const wg = calculateExactWohngeld({
            income: parseFloat(input.income) || 0,
            rent: housingCosts,
            persons: size,
            kids: parseInt(input.kids) || 0,
            mietstufe: mietstufe,
            expenses: parseFloat(input.expenses) || 0,
            maintenance: parseFloat(input.maintenance) || 0,
            status: input.status || 'employee',
            hasDisability: !!input.hasDisability,
            disabilityGdb: parseFloat(input.disabilityGdb) || 0,
            hasCareDependent: !!input.hasCareDependent,
            careDependentGrad: input.careDependentGrad
        });
        
        if (!wg.eligible || wg.amount < 10) {
            return { eligible: "none", amount: 0, type: "Lastenzuschuss", reasoning: "Ihr Einkommen überschreitet die Einkommensgrenze für Lastenzuschuss." };
        }
        return {
            eligible: interest === 0 ? "possible" : "probable",
            amount: wg.amount,
            type: "Lastenzuschuss",
            reasoning: `Sie haben voraussichtlich Anspruch auf ${formatEuro(wg.amount)} monatlichen Lastenzuschuss für Ihre Eigentumswohnung/Ihr Eigenheim.`
        };
    }
};

/** 6. GEZ Rundfunkbeitragsbefreiung */
const GezExemptModule = {
    id: "gez_exempt",
    name: "Rundfunkbeitragsbefreiung (GEZ)",
    category: "Wohnen",
    isRelevant: (input) => true,
    calculate: (input) => {
        // Linked to SGB II, XII or BAföG
        return {
            eligible: "possible",
            amount: 18.36,
            type: "Kostenbefreiung",
            reasoning: "Wenn Sie Bürgergeld, Grundsicherung, Sozialhilfe oder BAföG erhalten, können Sie sich vom Rundfunkbeitrag (18,36 €/Monat) befreien lassen."
        };
    }
};

/** 7. Kita-Gebührenbefreiung */
const KitaExemptModule = {
    id: "kita_exempt",
    name: "Kita-Gebührenbefreiung",
    category: "Wohnen",
    isRelevant: (input) => (parseInt(input.kids) || 0) > 0,
    calculate: (input) => {
        return {
            eligible: "possible",
            amount: 150, // estimated average saving
            type: "Kostenersparnis",
            reasoning: "Bei Bezug von Wohngeld, Kinderzuschlag oder Bürgergeld haben Sie einen gesetzlichen Anspruch auf Erlass der Kita-Gebühren."
        };
    }
};

/** 8. Telekom Sozialtarif */
const TelekomSocialModule = {
    id: "telekom_social",
    name: "GEZ Sozialtarif (Telekom)",
    category: "Wohnen",
    isRelevant: (input) => true,
    calculate: (input) => {
        return {
            eligible: "possible",
            amount: 6.94,
            type: "Kostenrabatt",
            reasoning: "Empfänger von Sozialleistungen erhalten bei der Telekom einen monatlichen Rabatt von bis zu 6,94 € auf den Telefonanschluss."
        };
    }
};

/** 9. Bürgergeld (SGB II) */
const BuergergeldModule = {
    id: "buergergeld",
    name: "Bürgergeld",
    category: "Grundsicherung",
    isRelevant: (input) => input.status !== "student" && input.status !== "pensioner" && input.age < 65,
    calculate: (input) => {
        if (input.hasHighAssets) {
            return { eligible: "none", amount: 0, type: "Bürgergeld", reasoning: "Bürgergeld ist wegen Überschreitung der Vermögensgrenze (40k €) ausgeschlossen." };
        }
        const mietstufe = input.selectedCity ? input.selectedCity.mietstufe : 4;
        const persons = Math.max(1, parseInt(input.persons) || 1);
        const limit = RENT_LIMITS[Math.min(persons, 5)][mietstufe - 1] || 500;
        
        const bg = calculateBuergergeld({
            income: parseFloat(input.income) || 0,
            rent: parseFloat(input.rent) || 0,
            heating: parseFloat(input.heating) || 0,
            regelsatz: 563,
            rentLimit: limit,
            persons: persons,
            kids: parseInt(input.kids) || 0,
            expenses: parseFloat(input.expenses) || 0,
            maintenance: parseFloat(input.maintenance) || 0,
            status: input.status || "employee"
        });
        if (!bg.eligible || bg.amount <= 0) {
            return { eligible: "none", amount: 0, type: "Bürgergeld", reasoning: "Ihr Einkommen reicht aus, um Ihren Bedarf nach SGB II zu decken." };
        }
        return {
            eligible: "probable",
            amount: bg.amount,
            type: "Bürgergeld",
            reasoning: `Sie haben voraussichtlich Anspruch auf ${formatEuro(bg.amount)} Bürgergeld zur Sicherung des Lebensunterhalts.`
        };
    }
};

/** 10. Grundsicherung im Alter / Erwerbsminderung (SGB XII Chapter 4) */
const GrundsicherungAlterModule = {
    id: "grundsicherung_alter",
    name: "Grundsicherung im Alter / Erwerbsminderung",
    category: "Grundsicherung",
    isRelevant: (input) => input.status === "pensioner" || input.age >= 65 || !!input.isPermanentlyDisabled,
    calculate: (input) => {
        const hasHighAssets = parseFloat(input.assets) > 10000 || input.hasHighAssets;
        if (hasHighAssets) {
            return { eligible: "none", amount: 0, type: "Grundsicherung", reasoning: "SGB XII Grundsicherung schließt Schonvermögen über 10.000 € pro Person aus." };
        }
        const mietstufe = input.selectedCity ? input.selectedCity.mietstufe : 4;
        const size = Math.max(1, parseInt(input.persons) || 1);
        const limit = RENT_LIMITS[Math.min(size, 5)][mietstufe - 1] || 500;
        
        const bg = calculateBuergergeld({
            income: parseFloat(input.income) || 0,
            rent: parseFloat(input.rent) || 0,
            heating: parseFloat(input.heating) || 0,
            regelsatz: 563,
            rentLimit: limit,
            persons: size,
            kids: parseInt(input.kids) || 0,
            expenses: parseFloat(input.expenses) || 0,
            maintenance: parseFloat(input.maintenance) || 0,
            status: "pensioner"
        });
        if (!bg.eligible || bg.amount <= 0) {
            return { eligible: "none", amount: 0, type: "Grundsicherung", reasoning: "Ihr Einkommen deckt den Grundsicherungsbedarf im Alter." };
        }
        return {
            eligible: "probable",
            amount: bg.amount,
            type: "Grundsicherung im Alter (SGB XII)",
            reasoning: `Sie haben Anspruch auf ${formatEuro(bg.amount)} Grundsicherung im Alter zur Aufstockung Ihrer geringen Rente.`
        };
    }
};

/** 11. Sozialhilfe (SGB XII Chapter 3) */
const SozialhilfeModule = {
    id: "sozialhilfe",
    name: "Sozialhilfe (Hilfe zum Lebensunterhalt)",
    category: "Grundsicherung",
    isRelevant: (input) => input.status === "student" || (input.age < 65 && input.status !== "pensioner"),
    calculate: (input) => {
        if (input.hasHighAssets) {
            return { eligible: "none", amount: 0, type: "Sozialhilfe", reasoning: "Sozialhilfe (SGB XII) erfordert ein Schonvermögen von unter 10.000 €." };
        }
        // General screening
        return {
            eligible: "possible",
            amount: 0,
            type: "Sozialhilfe",
            reasoning: "Bei vorübergehender voller Erwerbsminderung besteht ein Anspruch auf Sozialhilfe nach SGB XII Kapitel 3."
        };
    }
};

/** 12. Asylbewerberleistungen */
const AsylblgModule = {
    id: "asylblg",
    name: "Asylbewerberleistungen",
    category: "Grundsicherung",
    isRelevant: (input) => input.status === "asylum_seeker",
    calculate: (input) => {
        return {
            eligible: "probable",
            amount: 518, // 92% of standard rate
            type: "AsylbLG Regelsatz",
            reasoning: "Als Asylbewerber erhalten Sie Leistungen zur Deckung des notwendigen Bedarfs nach dem AsylbLG."
        };
    }
};

/** 13. Bayerisches Familiengeld */
const BYFamiliengeldModule = {
    id: "bay_familiengeld",
    name: "Bayerisches Familiengeld",
    category: "Familie",
    isRelevant: (input) => (parseInt(input.kids) || 0) > 0 && getBundeslandFromPlz(input.plz) === 'BY',
    calculate: (input) => {
        // Bayerisches Familiengeld: nur für Kinder geboren vor dem 01.01.2025 
        // (Ministerratsbeschluss 12.11.2024, Streichung für ab 2025 geborene Kinder)
        const ages = input.kidsAges || [];
        const birthYears = input.kidsBirthYears || [];
        
        let probableCount = 0;
        let possibleCount = 0;
        let excludedCount = 0;
        let fallbackWarning = false;
        
        if (ages.length > 0) {
            for (let i = 0; i < ages.length; i++) {
                const age = ages[i];
                const birthYear = birthYears[i] || 0;
                
                // Explicit AND connection: child must be in the age window (1 or 2 years old)
                // AND born before 1.1.2025.
                if (age === 1 || age === 2) {
                    if (birthYear > 0) {
                        if (birthYear < 2025) {
                            probableCount++;
                        } else {
                            excludedCount++;
                        }
                    } else {
                        // Fallback: age is inside window, but birth year is unknown
                        possibleCount++;
                        fallbackWarning = true;
                    }
                } else if (age === 0) {
                    // Age 0 children in 2026 are born in 2025/2026, thus always excluded
                    excludedCount++;
                }
            }
        } else {
            // Fallback: age of kids is unknown but they have kids
            possibleCount = 1;
            fallbackWarning = true;
        }
        
        const eligibleKidsCount = probableCount + possibleCount;
        
        if (eligibleKidsCount <= 0) {
            if (excludedCount > 0) {
                return { 
                    eligible: "none", 
                    amount: 0, 
                    type: "Familiengeld", 
                    reasoning: "Das Bayerische Familiengeld wurde für ab 2025 geborene Kinder ersatzlos gestrichen (Beschluss vom 12.11.2024)." 
                };
            }
            return { 
                eligible: "none", 
                amount: 0, 
                type: "Familiengeld", 
                reasoning: "Familiengeld wird nur für Kinder im Alter von 13 bis 36 Monaten gezahlt. Ihre Kinder haben dieses Alter nicht." 
            };
        }
        
        const totalAmount = eligibleKidsCount * 250;
        let reasoning = `Sie erhalten in Bayern für ${eligibleKidsCount} Kind(er) monatlich ${formatEuro(totalAmount)} Familiengeld (einkommensunabhängig).`;
        if (fallbackWarning) {
            reasoning += " Hinweis: Der genaue Anspruch hängt vom Geburtsdatum ab. Die Leistung wurde für ab dem 01.01.2025 geborene Kinder gestrichen.";
        }
        
        return {
            eligible: (fallbackWarning && probableCount === 0) ? "possible" : "probable",
            amount: totalAmount,
            type: "Landesleistung (Bavaria)",
            reasoning: reasoning
        };
    }
};

/** 14. Bayerisches/Hessisches Krippengeld */
const KrippengeldModule = {
    id: "krippengeld",
    name: "Landeskrippengeld",
    category: "Familie",
    isRelevant: (input) => {
        const bl = getBundeslandFromPlz(input.plz);
        return (parseInt(input.kids) || 0) > 0 && (bl === 'BY' || bl === 'HE');
    },
    calculate: (input) => {
        const bl = getBundeslandFromPlz(input.plz);
        const parentGross = parseFloat(input.income) || 0;
        const threshold = bl === 'BY' ? 60000 : 45000;
        
        if (parentGross > threshold) {
            return { eligible: "none", amount: 0, type: "Krippengeld", reasoning: `Ihr Einkommen liegt über der Landesgrenze von ${formatEuro(threshold)}.` };
        }
        
        const ages = input.kidsAges || [];
        const birthYears = input.kidsBirthYears || [];
        let eligibleKidsCount = 0;
        let hasWarning = false;
        let age2Count = 0;
        let excludedCount = 0;
        
        if (bl === 'BY') {
            // In Bayern gilt die Stichtagsregelung analog zum Familiengeld (geboren vor 1.1.2025)
            // Explicit AND connection: age window (1 or 2 years) AND born before 1.1.2025
            let probableCount = 0;
            let possibleCount = 0;
            
            if (ages.length > 0) {
                for (let i = 0; i < ages.length; i++) {
                    const age = ages[i];
                    const birthYear = birthYears[i] || 0;
                    
                    if (age === 1 || age === 2) {
                        if (birthYear > 0) {
                            if (birthYear < 2025) {
                                probableCount++;
                                if (age === 2) age2Count++;
                            } else {
                                excludedCount++;
                            }
                        } else {
                            possibleCount++;
                            hasWarning = true;
                        }
                    } else if (age === 0) {
                        excludedCount++;
                    }
                }
                eligibleKidsCount = probableCount + possibleCount;
            } else {
                eligibleKidsCount = 1;
                hasWarning = true;
            }
        } else {
            // Hessen: normal 1-2 years without birth year cutoff
            if (ages.length > 0) {
                eligibleKidsCount = ages.filter(age => age >= 1 && age <= 2).length;
            } else {
                eligibleKidsCount = 1;
            }
        }
        
        if (eligibleKidsCount <= 0) {
            if (bl === 'BY' && excludedCount > 0) {
                return { eligible: "none", amount: 0, type: "Krippengeld", reasoning: "Das bayerische Krippengeld wurde für ab 2025 geborene Kinder ersatzlos gestrichen (Beschluss vom 12.11.2024)." };
            }
            return { eligible: "none", amount: 0, type: "Krippengeld", reasoning: "Krippengeld wird nur für Kinder im Alter von 12 bis 36 Monaten gezahlt." };
        }
        
        const finalAmount = 100 * eligibleKidsCount;
        let reasoning = `Zuschuss von bis zu ${formatEuro(finalAmount)} monatlich pro Kind zur Entlastung bei den Krippen-Gebühren.`;
        if (bl === 'BY' && hasWarning) {
            reasoning += " Hinweis: In Bayern gilt dies nur noch für vor dem 01.01.2025 geborene Kinder (Bestandsschutz).";
        }
        
        return {
            eligible: (bl === 'BY' && hasWarning && age2Count === 0) ? "possible" : "probable",
            amount: finalAmount,
            type: `Krippengeld (${bl === 'BY' ? 'Bayern' : 'Hessen'})`,
            reasoning: reasoning
        };
    }
};

/** 15. Erstausstattung bei Schwangerschaft & Geburt */
const ErstausstattungModule = {
    id: "erstausstattung",
    name: "Baby-Erstausstattung",
    category: "Familie",
    isRelevant: (input) => !!input.isPregnantOrNewborn,
    calculate: (input) => {
        const income = parseFloat(input.income) || 0;
        if (income > 3500) {
            return { eligible: "none", amount: 0, type: "Erstausstattung", reasoning: "Aufgrund Ihres Haushaltseinkommens ist ein Zuschuss zur Erstausstattung unwahrscheinlich." };
        }
        return {
            eligible: "possible",
            amount: 800, // average one-off grant
            type: "Einmalbeihilfe",
            reasoning: "Bei geringerem Einkommen erhalten Sie finanzielle Hilfen (z.B. über die Bundesstiftung Mutter und Kind) von bis zu 1.000 € für Kinderwagen, Babybett und Kleidung."
        };
    }
};

/** 16. Unterhaltsvorschuss */
const UnterhaltsvorschussModule = {
    id: "unterhaltsvorschuss",
    name: "Unterhaltsvorschuss",
    category: "Familie",
    isRelevant: (input) => !!input.isSingleParent && (parseInt(input.kids) || 0) > 0,
    calculate: (input) => {
        const ages = input.kidsAges || [4]; // Default to one child of age 4 if unknown
        let total = 0;
        for (const age of ages) {
            if (age <= 5) total += 227;
            else if (age <= 11) total += 299;
            else if (age <= 17) total += 394;
        }
        return {
            eligible: input.childSupportReceived === "none" ? "probable" : "possible",
            amount: total,
            type: "Unterhaltsersatz",
            reasoning: `Als Alleinerziehende(r) erhalten Sie bei ausbleibendem Unterhalt des anderen Elternteils bis zu ${formatEuro(total)} monatlich.`
        };
    }
};

/** 17. BAföG */
const BafoegModule = {
    id: "bafoeg",
    name: "BAföG (Schüler/Studierende)",
    category: "Bildung",
    isRelevant: (input) => input.status === "student" || input.status === "trainee",
    calculate: (input) => {
        const isLowParentIncome = input.parentIncomeBracket === "low";
        const livesAway = !input.livesWithParents;
        const selfInsured = !!input.bafoegSelfInsured;
        
        let amount = livesAway ? 855 : 534;
        if (selfInsured) {
            amount += 137;
        }
        
        const typeDesc = livesAway ? 'auswärts wohnend' : 'bei den Eltern wohnend';
        const insuranceDesc = selfInsured ? 'inkl. Zuschlag für eigene Kranken-/Pflegeversicherung' : 'familienversichert (ohne KV/PV-Zuschlag)';
        
        return {
            eligible: isLowParentIncome ? "probable" : "possible",
            amount: amount,
            type: "Ausbildungsförderung",
            reasoning: `Sie erhalten voraussichtlich bis zu ${formatEuro(amount)} monatlich (Halb Zuschuss, halb zinsloses Darlehen). Satz für ${typeDesc}, ${insuranceDesc}.`
        };
    }
};

/** 18. Berufsausbildungsbeihilfe (BAB) */
const BabModule = {
    id: "bab",
    name: "Berufsausbildungsbeihilfe (BAB)",
    category: "Bildung",
    isRelevant: (input) => input.status === "trainee" && !input.livesWithParents,
    calculate: (input) => {
        return {
            eligible: "possible",
            amount: 750, // Average BAB Need
            type: "Ausbildungsbeihilfe (Arbeitsagentur)",
            reasoning: "Auszubildende in betrieblicher Ausbildung können bei eigener Wohnung einen Zuschuss der Bundesagentur für Arbeit erhalten."
        };
    }
};

/** 19. Bildung und Teilhabe (BuT) */
const ButModule = {
    id: "but",
    name: "Bildung und Teilhabe (Bildungspaket)",
    category: "Bildung",
    isRelevant: (input) => (parseInt(input.kids) || 0) > 0,
    calculate: (input) => {
        return {
            eligible: "possible",
            amount: 195, // School supplies allowance (one-off per year)
            type: "Schulbedarf & Kultur",
            reasoning: "Wenn Sie Wohngeld, Kinderzuschlag oder Bürgergeld beziehen, erhält jedes Schulkind jährlich 195 € für Schulbedarf sowie Zuschüsse für Mittagessen und Ausflüge."
        };
    }
};

/** 20. Bildungsgutschein */
const BildungsgutscheinModule = {
    id: "bildungsgutschein",
    name: "Bildungsgutschein (100% Weiterbildung)",
    category: "Bildung",
    isRelevant: (input) => input.status === "unemployed_sgb2" || input.status === "unemployed_sgb3" || input.status === "seeking_work",
    calculate: (input) => {
        return {
            eligible: "possible",
            amount: 0,
            type: "Förderung von Umschulung/Coaching",
            reasoning: "Die Bundesagentur für Arbeit übernimmt bei Arbeitslosigkeit oder drohender Arbeitslosigkeit bis zu 100% der Kosten für Umschulungen oder Karriere-Coaching."
        };
    }
};

/** 21. Pflegegeld */
const PflegegeldModule = {
    id: "pflegegeld",
    name: "Pflegegeld",
    category: "Pflege",
    isRelevant: (input) => !!input.hasCareDependent && input.careOrganization === "private",
    calculate: (input) => {
        const grad = input.careDependentGrad || "PG 2";
        let amount = 0;
        if (grad.includes("2")) amount = 347;
        else if (grad.includes("3")) amount = 599;
        else if (grad.includes("4")) amount = 800;
        else if (grad.includes("5")) amount = 990;
        
        if (amount === 0) return { eligible: "none", amount: 0, type: "Pflegegeld", reasoning: "Pflegegrad 1 berechtigt nicht zum Bezug von Pflegegeld." };
        
        return {
            eligible: "probable",
            amount: amount,
            type: `Pflegegeld (${grad})`,
            reasoning: `Bei Pflege durch Angehörige oder Nachbarn erhalten Sie monatlich ${formatEuro(amount)} von der Pflegekasse.`
        };
    }
};

/** 22. Pflegesachleistung */
const PflegesachleistungModule = {
    id: "pflegesachleistung",
    name: "Pflegesachleistung (Pflegedienst)",
    category: "Pflege",
    isRelevant: (input) => !!input.hasCareDependent && input.careOrganization === "service",
    calculate: (input) => {
        const grad = input.careDependentGrad || "PG 2";
        let amount = 0;
        if (grad.includes("2")) amount = 796;
        else if (grad.includes("3")) amount = 1497;
        else if (grad.includes("4")) amount = 1859;
        else if (grad.includes("5")) amount = 2299;
        
        if (amount === 0) return { eligible: "none", amount: 0, type: "Pflegesachleistung", reasoning: "Pflegegrad 1 berechtigt nicht zum Bezug von Pflegesachleistungen." };
        
        return {
            eligible: "probable",
            amount: amount,
            type: `Pflegesachleistung (${grad})`,
            reasoning: `Die Pflegekasse übernimmt Kosten für einen professionellen Pflegedienst direkt bis zu ${formatEuro(amount)} monatlich.`
        };
    }
};

/** 23. Pflege-Entlastungsbetrag */
const EntlastungsbetragModule = {
    id: "entlastungsbetrag",
    name: "Pflege-Entlastungsbetrag",
    category: "Pflege",
    isRelevant: (input) => !!input.hasCareDependent,
    calculate: (input) => {
        return {
            eligible: "probable",
            amount: 131,
            type: "Rückerstattungs-Budget",
            reasoning: "Jede pflegebedürftige Person (ab Pflegegrad 1) hat Anspruch auf 131 € monatlich für Haushaltshilfen oder Alltagsbegleiter."
        };
    }
};

/** 24. Landespflegegeld (Bayern/Berlin) */
const LandespflegegeldModule = {
    id: "landespflegegeld",
    name: "Landespflegegeld",
    category: "Pflege",
    isRelevant: (input) => {
        const bl = getBundeslandFromPlz(input.plz);
        return !!input.hasCareDependent && (bl === 'BY' || bl === 'BE');
    },
    calculate: (input) => {
        const bl = getBundeslandFromPlz(input.plz);
        if (bl === 'BY') {
            const grad = input.careDependentGrad || "PG 2";
            if (grad.includes("1")) {
                return { eligible: "none", amount: 0, type: "Landespflegegeld", reasoning: "In Bayern setzt Landespflegegeld mindestens Pflegegrad 2 voraus." };
            }
            return {
                eligible: "probable",
                amount: 42, // 500 € / year = ~42 € / month (halved for 2026)
                type: "Landespflegegeld (Bayern)",
                reasoning: "In Bayern erhalten Pflegebedürftige ab Pflegegrad 2 jährlich eine Einmalzahlung von 500 € (ca. 42 €/Monat, Stand 2026)."
            };
        }
        // Berlin blind/deaf
        return {
            eligible: "possible",
            amount: 150,
            type: "Landespflegegeld (Berlin)",
            reasoning: "Für sehbehinderte, blinde und gehörlose Menschen zahlt das Land Berlin ein monatliches Landespflegegeld."
        };
    }
};

/** 25. Zuschuss barrierefreier Umbau */
const WohnUmbauModule = {
    id: "wohneigentum_umbau",
    name: "Zuschuss barrierefreier Umbau",
    category: "Pflege",
    isRelevant: (input) => !!input.hasCareDependent,
    calculate: (input) => {
        return {
            eligible: "possible",
            amount: 4000, // one-off limit
            type: "Kassenzuschuss (Einmalig)",
            reasoning: "Für Anpassungen des Wohnraums (z. B. Bad-Umbau zu ebenerdiger Dusche) zahlt die Pflegekasse bis zu 4.000 € einmaligen Zuschuss."
        };
    }
};

/** 26. Pflegeunterstützungsgeld */
const PflegeUnterstuetzungModule = {
    id: "pflegeunterstuetzungsgeld",
    name: "Pflegeunterstützungsgeld",
    category: "Pflege",
    isRelevant: (input) => input.status === "employee" && !!input.hasCareDependent,
    calculate: (input) => {
        return {
            eligible: "possible",
            amount: 0,
            type: "Lohnersatzleistung",
            reasoning: "Lohnersatz bei akuter Pflegebedürftigkeit eines nahen Angehörigen für bis zu 10 Arbeitstage zur Organisation der Pflege."
        };
    }
};

/** 27. Kurzarbeitergeld */
const KurzarbeitergeldModule = {
    id: "kurzarbeitergeld",
    name: "Kurzarbeitergeld",
    category: "Arbeit",
    isRelevant: (input) => input.status === "employee" && !!input.isKurzarbeit,
    calculate: (input) => {
        const net = parseFloat(input.income) * 0.70 || 1500; // estimated net
        const kidsCount = parseInt(input.kids) || 0;
        const rate = kidsCount > 0 ? 0.67 : 0.60;
        const estimatedDifference = net * 0.30; // assume 30% reduction in hours
        const finalAmt = estimatedDifference * rate;
        
        return {
            eligible: "probable",
            amount: Math.round(finalAmt),
            type: "Lohnersatz",
            reasoning: `Sie erhalten ca. ${formatEuro(finalAmt)} Ausgleichszahlung für Ihren krisenbedingten Arbeitsausfall (Lohnersatzrate von ${rate * 100}% des Nettoausfalls).`
        };
    }
};

/** 28. Eingliederungszuschuss */
const EingliederungszuschussModule = {
    id: "eingliederungszuschuss",
    name: "Eingliederungszuschuss (Arbeitgeber)",
    category: "Arbeit",
    isRelevant: (input) => input.status === "unemployed_sgb2" || input.status === "unemployed_sgb3" || input.status === "seeking_work",
    calculate: (input) => {
        return {
            eligible: "possible",
            amount: 0,
            type: "Arbeitgeber-Zuschuss",
            reasoning: "Ein potenzieller Arbeitgeber kann bei Ihrer Einstellung einen Lohnkostenzuschuss von bis zu 50% für Vermittlungshemmnisse erhalten."
        };
    }
};

/** 29. Hinterbliebenenrente (Witwen-/Waisenrente) */
const HinterbliebenenrenteModule = {
    id: "hinterbliebenenrente",
    name: "Witwen- / Waisenrente",
    category: "Rente",
    isRelevant: (input) => !!input.isBereaved,
    calculate: (input) => {
        return {
            eligible: "possible",
            amount: 450, // average Witwenrente top-up
            type: "Rente",
            reasoning: "Hinterbliebenenrente sichert den Ehepartner (Witwenrente) oder Kinder (Waisenrente) nach dem Tod des Versicherten ab."
        };
    }
};

/** 30. Behinderten-Pauschbetrag & Nachteilsausgleiche */
const SchwerbehinderungModule = {
    id: "schwerbehinderung",
    name: "Schwerbehinderten-Nachteilsausgleiche",
    category: "Behinderung",
    isRelevant: (input) => !!input.hasDisability || (parseFloat(input.disabilityGdb) || 0) >= 20,
    calculate: (input) => {
        const gdb = parseFloat(input.disabilityGdb) || 50;
        let taxAllowance = 1140;
        if (gdb >= 100) taxAllowance = 2840;
        else if (gdb >= 90) taxAllowance = 2460;
        else if (gdb >= 80) taxAllowance = 2120;
        else if (gdb >= 70) taxAllowance = 1780;
        else if (gdb >= 60) taxAllowance = 1440;
        else if (gdb >= 50) taxAllowance = 1140;
        else if (gdb >= 40) taxAllowance = 860;
        else if (gdb >= 30) taxAllowance = 620;
        else if (gdb >= 20) taxAllowance = 384;
        
        return {
            eligible: "probable",
            amount: Math.round(taxAllowance / 12), // monthly tax value equivalent
            type: "Steuerfreibetrag & Nachteilsausgleich",
            reasoning: `Sie erhalten einen steuerlichen Pauschbetrag von ${formatEuro(taxAllowance)} im Jahr. Zudem erhalten Sie Vergünstigungen im Nahverkehr.`
        };
    }
};

// -------------------------------------------------------------
// ENGINE REGISTRATION & PIPELINE
// -------------------------------------------------------------

const modules = [
    KindergeldModule,
    ElterngeldModule,
    KinderzuschlagModule,
    WohngeldModule,
    LastenzuschussModule,
    GezExemptModule,
    KitaExemptModule,
    TelekomSocialModule,
    BuergergeldModule,
    GrundsicherungAlterModule,
    SozialhilfeModule,
    AsylblgModule,
    BYFamiliengeldModule,
    KrippengeldModule,
    ErstausstattungModule,
    UnterhaltsvorschussModule,
    BafoegModule,
    BabModule,
    ButModule,
    BildungsgutscheinModule,
    PflegegeldModule,
    PflegesachleistungModule,
    EntlastungsbetragModule,
    LandespflegegeldModule,
    WohnUmbauModule,
    PflegeUnterstuetzungModule,
    KurzarbeitergeldModule,
    EingliederungszuschussModule,
    HinterbliebenenrenteModule,
    SchwerbehinderungModule
];

export function evaluateAllBenefits(input) {
    const results = [];

    // 1. Run all Modules
    for (const mod of modules) {
        if (mod.isRelevant(input)) {
            try {
                const res = mod.calculate(input);
                results.push({
                    id: mod.id,
                    name: mod.name,
                    category: mod.category,
                    ...res
                });
            } catch (err) {
                console.error(`Error calculating ${mod.name}:`, err);
            }
        } else {
            results.push({
                id: mod.id,
                name: mod.name,
                category: mod.category,
                eligible: "none",
                amount: 0,
                type: mod.name,
                reasoning: `Diese Förderung ist für Ihre Lebenssituation aktuell nicht relevant.`
            });
        }
    }

    // 2. Conflict Resolution Layers

    // Layer 1: Student / Trainee Exclusions
    if (input.status === "student" || input.status === "trainee") {
        const buergergeldResult = results.find(r => r.id === "buergergeld");
        const wohngeldResult = results.find(r => r.id === "wohngeld");
        const bafoegResult = results.find(r => r.id === "bafoeg");
        
        if (bafoegResult && bafoegResult.eligible !== "none") {
            if (buergergeldResult) {
                buergergeldResult.eligible = "none";
                buergergeldResult.reasoning = "Studierende mit BAföG-Anspruch sind grundsätzlich vom Bürgergeld ausgeschlossen.";
            }
            if (wohngeldResult && (!input.kids || input.kids === 0)) {
                wohngeldResult.eligible = "none";
                wohngeldResult.reasoning = "Ein Wohngeld-Anspruch besteht für Studenten nur in Ausnahmefällen (z. B. wenn Sie mit Kindern zusammenleben).";
            }
        }
    }

    // Layer 2: Bürgergeld vs. Wohngeld+KiZ Optimization
    const buergergeldResult = results.find(r => r.id === "buergergeld");
    const wohngeldResult = results.find(r => r.id === "wohngeld");
    const kizResult = results.find(r => r.id === "kinderzuschlag");

    if (buergergeldResult && buergergeldResult.eligible === "probable" && buergergeldResult.amount > 0) {
        const wgAmt = (wohngeldResult && wohngeldResult.eligible !== "none" ? wohngeldResult.amount : 0);
        const kizAmt = (kizResult && kizResult.eligible !== "none" ? kizResult.amount : 0);
        const priorityAmt = wgAmt + kizAmt;

        if (buergergeldResult.amount > priorityAmt + 50) {
            if (wohngeldResult && wohngeldResult.eligible === "probable") {
                wohngeldResult.eligible = "possible";
                wohngeldResult.reasoning = `Möglich, aber Bürgergeld bietet Ihnen voraussichtlich eine höhere monatliche Unterstützung (+${formatEuro(buergergeldResult.amount - priorityAmt)}).`;
            }
            if (kizResult && kizResult.eligible === "probable") {
                kizResult.eligible = "possible";
                kizResult.reasoning = `Kinderzuschlag ist nachrangig gegenüber Bürgergeld, da Bürgergeld Ihren Bedarf vollständiger deckt.`;
            }
        } else {
            buergergeldResult.eligible = "possible";
            buergergeldResult.reasoning = `Möglich, aber die vorrangige Kombination aus Wohngeld und ggf. Kinderzuschlag deckt Ihren Bedarf bereits ab (Vorteil: Keine Jobcenter-Auflagen).`;
        }
    }

    // Layer 3: Link GEZ / Kita Exemptions to Social Benefits Receipt
    const gezResult = results.find(r => r.id === "gez_exempt");
    const kitaResult = results.find(r => r.id === "kita_exempt");
    
    const isSocialBenefitRecipient = results.some(r => 
        (r.id === "buergergeld" || r.id === "wohngeld" || r.id === "kinderzuschlag" || r.id === "bafoeg" || r.id === "grundsicherung_alter") &&
        r.eligible === "probable" && r.amount > 0
    );

    if (gezResult && isSocialBenefitRecipient) {
        gezResult.eligible = "probable";
        gezResult.reasoning = "Da Sie Anspruch auf existenzsichernde Leistungen haben, ist eine vollständige Befreiung vom Rundfunkbeitrag (18,36 €/Monat) sehr wahrscheinlich.";
    }
    if (kitaResult && isSocialBenefitRecipient) {
        kitaResult.eligible = "probable";
        kitaResult.reasoning = "Als Empfänger von Mietzuschuss oder Kinderzuschlag können Sie sich vollständig von den Kita-Gebühren befreien lassen.";
    }

    return results;
}
