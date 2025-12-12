class SocialRuleEngine:
    def __init__(self):
        # BASISWERTE 2025
        self.REGELSATZ = {
            "single": 563.00,
            "partner": 506.00,
            "u25": 451.00,
            "kid_14_17": 471.00,
            "kid_6_13": 390.00,
            "kid_0_5": 357.00
        }
        self.MEHRBEDARF_ALLEINERZIEHEND = 0.36
        
    def _calculate_freibetrag(self, brutto, has_child_in_hh):
        if brutto <= 0: return 0.0
        freibetrag = 100.00
        if brutto > 100:
            step1_base = min(brutto, 520.00) - 100.00
            freibetrag += step1_base * 0.20
        if brutto > 520:
            step2_base = min(brutto, 1000.00) - 520.00
            freibetrag += step2_base * 0.30
        cap = 1500.00 if has_child_in_hh else 1200.00
        if brutto > 1000:
            step3_base = min(brutto, cap) - 1000.00
            freibetrag += max(0, step3_base * 0.10)
        return round(freibetrag, 2)

    def calculate_sgb2(self, request):
        total_need = 0.0
        total_income_anrechenbar = 0.0
        has_child = any(m.role == "child" for m in request.members)

        for member in request.members:
            if member.role == "main":
                rate = self.REGELSATZ["single"] if len(request.members) == 1 else self.REGELSATZ["partner"]
            elif member.role == "partner": rate = self.REGELSATZ["partner"]
            elif member.role == "child":
                if member.age < 6: rate = self.REGELSATZ["kid_0_5"]
                elif member.age < 14: rate = self.REGELSATZ["kid_6_13"]
                elif member.age < 18: rate = self.REGELSATZ["kid_14_17"]
                else: rate = self.REGELSATZ["u25"]
            else: rate = self.REGELSATZ["single"]
            
            total_need += rate
            if member.role == "main" and member.is_single_parent:
                total_need += self.REGELSATZ["single"] * self.MEHRBEDARF_ALLEINERZIEHEND

            for inc in member.incomes:
                if inc.amount_brutto > 0:
                    freibetrag = self._calculate_freibetrag(inc.amount_brutto, has_child)
                    anrechenbar = max(0, inc.amount_net - freibetrag)
                    total_income_anrechenbar += anrechenbar

        total_need += (request.rent_cold + request.rent_utility + request.rent_heating)
        main_regelsatz = self.REGELSATZ["single"] if len(request.members) == 1 else self.REGELSATZ["partner"]
        sanction_amount = 0.0
        if request.termination_reason in ["self_termination", "mutual_agreement"]:
            sanction_amount = round(main_regelsatz * 0.30, 2)
        
        raw_diff = total_need - total_income_anrechenbar
        
        if raw_diff <= 0:
            return {
                "amount": 0.00,
                "details": "Einkommen deckt Bedarf",
                "sanction_applied": 0.00,
                "type": "REJECTED_INCOME"
            }
        
        final_amount = max(0.00, raw_diff - sanction_amount)
        return {
            "amount": round(final_amount, 2),
            "details": "Anspruch ermittelt",
            "sanction_applied": sanction_amount if final_amount > 0 else 0.00,
            "type": "SGB2"
        }

    def calculate_wohngeld(self, request):
        total_netto = sum([sum([i.amount_net for i in m.incomes]) for m in request.members])
        warm_miete = request.rent_cold + request.rent_utility
        mindest_bedarf = sum([400 for m in request.members]) + (warm_miete * 0.8)
        if total_netto > mindest_bedarf and total_netto < 3000:
             return {"amount": round(min(600, warm_miete * 0.5), 2), "reason": "eligible"}
        return {"amount": 0.00, "reason": "ineligible"}