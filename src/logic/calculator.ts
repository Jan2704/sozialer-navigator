// src/logic/calculators.ts

export interface CalcResult {
  eligible: boolean;
  amount: string;
  type: 'wohngeld' | 'grundsicherung';
  recommendation: string;
}

export const calculateBenefit = (
  type: string,
  income: number,
  rent: number,
  persons: number,
  regelsatz: number
): CalcResult => {
  if (type === 'wohngeld') {
    // Näherungsformel Wohngeld 2026
    const estimate = Math.max(0, (rent * 0.45) - (income * 0.12) + (persons * 50));
    return {
      eligible: estimate > 10,
      amount: estimate.toFixed(2),
      type: 'wohngeld',
      recommendation: "Ihr Einkommen liegt im Bereich für Wohngeld. Dies ist vorrangig vor Grundsicherung."
    };
  } else {
    // Näherungsformel Grundsicherung 2026 (Regelsatz + Miete - Einkommen)
    const demand = (persons * regelsatz) + rent;
    const estimate = Math.max(0, demand - income);
    return {
      eligible: estimate > 0,
      amount: estimate.toFixed(2),
      type: 'grundsicherung',
      recommendation: "Sie haben voraussichtlich Anspruch auf Grundsicherung zur Existenzsicherung."
    };
  }
};