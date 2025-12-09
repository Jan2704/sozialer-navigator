import json
import os
from models import HouseholdRequest, IncomeType

class SocialRuleEngine:
    def __init__(self, year="2025"):
        # Lädt die Regeln relativ zum aktuellen Ordner
        base_path = os.path.dirname(os.path.abspath(__file__))
        path = os.path.join(base_path, "rules", f"{year}.json")
        
        with open(path, "r") as f:
            self.rules = json.load(f)

    def _calculate_freibetrag_sgb2(self, gross: float, type: IncomeType) -> float:
        """ Ermittelt SGB II Freibetrag """
        if type == IncomeType.NONE or gross == 0: return 0
        if type == IncomeType.CHILD_BENEFIT: return 0 

        cfg = self.rules["sgb2"]
        free = 0
        
        # Erwerbstätigenfreibetrag
        if type in [IncomeType.EMPLOYMENT, IncomeType.MINIJOB, IncomeType.SELF_EMPLOYED]:
            if gross <= cfg["freibetrag_min"]: return gross
            free += cfg["freibetrag_min"]
            
            if gross > cfg["freibetrag_min"]:
                step1 = min(gross, cfg["freibetrag_step1_limit"]) - cfg["freibetrag_min"]
                free += step1 * cfg["freibetrag_step1_percent"]
            if gross > cfg["freibetrag_step1_limit"]:
                step2 = min(gross, cfg["freibetrag_step2_limit"]) - cfg["freibetrag_step1_limit"]
                free += step2 * cfg["freibetrag_step2_percent"]
            if gross > cfg["freibetrag_step2_limit"]:
                step3 = min(gross, 1200) - cfg["freibetrag_step2_limit"]
                free += step3 * cfg["freibetrag_step3_percent"]
        return free

    def calculate_sgb2(self, request: HouseholdRequest):
        cfg = self.rules["sgb2"]
        total_need = 0
        total_income_anrechenbar = 0
        
        for p in request.members:
            base = 0
            # Regelsatz
            if p.role == "main":
                has_partner = any(m.role == "partner" for m in request.members)
                base = cfg["rbs_2"] if has_partner else cfg["rbs_1"]
            elif p.role == "partner": base = cfg["rbs_2"]
            elif p.role == "child":
                if p.age < 6: base = cfg["rbs_6"]
                elif p.age < 14: base = cfg["rbs_5"]
                elif p.age < 18: base = cfg["rbs_4"]
                else: base = cfg["rbs_3"]
            
            if p.is_single_parent: base += base * cfg["single_parent_percent"]
            if p.is_pregnant: base += base * cfg["pregnancy_percent"]
            
            total_need += base
            
            # Einkommen
            for inc in p.incomes:
                freibetrag = self._calculate_freibetrag_sgb2(inc.amount_brutto, inc.source_type)
                total_income_anrechenbar += max(0, inc.amount_net - freibetrag)

        # Kosten der Unterkunft
        actual_rent = request.rent_cold + request.rent_utility + request.rent_heating
        total_need += actual_rent
        
        claim = total_need - total_income_anrechenbar
        
        # Sperrzeit Check
        sanction = 0
        if request.termination_reason in ["self_termination", "mutual_agreement"]:
            sanction = cfg["rbs_1"] * 0.30
            claim -= sanction
            
        return {
            "eligible": claim > 0,
            "amount": max(0, round(claim, 2)),
            "sanction_applied": round(sanction, 2)
        }

    def calculate_wohngeld(self, request: HouseholdRequest):
        """ Echte Berechnung nach § 19 WoGG """
        cfg = self.rules["wogg"]
        
        # 1. Haushaltsmitglieder zählen
        hh_members = len(request.members)
        if hh_members == 0: return {"amount": 0}
        
        # 2. Gesamteinkommen (Brutto minus Pauschalen)
        total_income_wogg = 0
        for p in request.members:
            for inc in p.incomes:
                # Pauschaler Abzug 30% (Steuer, KV, RV)
                if inc.source_type == IncomeType.EMPLOYMENT:
                    total_income_wogg += inc.amount_brutto * 0.7
                elif inc.source_type == IncomeType.PENSION:
                    total_income_wogg += inc.amount_brutto * 0.9 
                else:
                    total_income_wogg += inc.amount_brutto * 0.8 

        # Monatliches Einkommen
        Y = total_income_wogg 

        # 3. Zuschussfähige Miete (M)
        # Nur Kaltmiete + Kalte Nebenkosten (KEINE Heizung!)
        rent_cold_gross = request.rent_cold + request.rent_utility
        
        # Mietstufe ermitteln (Fallback Stufe 1 wenn keine Datenbank)
        tier = str(request.city_tier) if request.city_tier else "1"
        
        # Obergrenze aus Tabelle
        idx = min(hh_members - 1, 5) # Max Index 5 für 6 Personen
        # Sicherstellen, dass rent_caps existiert (Fallback Logik)
        caps = cfg.get("rent_caps", {})
        current_cap_list = caps.get(tier, caps.get("1", [359, 434, 517, 603, 691, 779]))
        
        cap = current_cap_list[idx]
        
        M = min(rent_cold_gross, cap)
        
        # 4. Die Formel nach § 19 WoGG
        # Koeffizienten laden
        c_key = str(min(hh_members, 5))
        coeffs_map = cfg.get("coefficients", {})
        # Falls Koeffizienten fehlen, nutze Default (Fallback)
        default_coeffs = {"a": 6.3e-2, "b": 1.64e-4, "c": 2.22e-4}
        coeffs = coeffs_map.get(c_key, default_coeffs)
        
        a, b, c = coeffs.get("a", 0.063), coeffs.get("b", 0.000164), coeffs.get("c", 0.000222)
        
        # Formel: 1.15 * (M - (a + b*M + c*Y) * Y)
        z = a + (b * M) + (c * Y)
        wohngeld = 1.15 * (M - (z * Y))
        
        return {
            "eligible": wohngeld > 10,
            "amount": max(0, round(wohngeld, 2)),
            "details": f"Miete (gedeckelt): {M}€, Einkommen (bereinigt): {round(Y,2)}€"
        }