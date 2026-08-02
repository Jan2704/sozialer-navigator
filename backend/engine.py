import os
import json
from typing import List, Dict, Any
from models import HouseholdRequest, Person, IncomeSource, TerminationReason

class SocialRuleEngine:
    # Einkommensarten, für die der gestaffelte Erwerbstätigenfreibetrag (§ 11b Abs. 3 SGB II) gilt.
    # Andere Einkommensarten (Rente, Unterhalt, Kindergeld, ...) erhalten nur die Versicherungspauschale.
    ERWERBSEINKOMMEN_TYPES = ("employment", "minijob", "self_employed")

    def __init__(self):
        # Dynamically load the JSON rules from the rules directory
        rules_dir = os.path.join(os.path.dirname(__file__), 'rules')
        
        with open(os.path.join(rules_dir, 'sgb2.json'), 'r', encoding='utf-8') as f:
            self.sgb2_rules = json.load(f)
            
        with open(os.path.join(rules_dir, 'wohngeld.json'), 'r', encoding='utf-8') as f:
            self.wohngeld_rules = json.load(f)
            
        with open(os.path.join(rules_dir, 'kindergeld.json'), 'r', encoding='utf-8') as f:
            self.kindergeld_rules = json.load(f)
            
        with open(os.path.join(rules_dir, 'kinderzuschlag.json'), 'r', encoding='utf-8') as f:
            self.kinderzuschlag_rules = json.load(f)
            
        with open(os.path.join(rules_dir, 'elterngeld.json'), 'r', encoding='utf-8') as f:
            self.elterngeld_rules = json.load(f)

    def _calculate_freibetrag(self, brutto: float, has_child_in_hh: bool) -> float:
        """
        Calculates SGB II Freibetrag based on § 11b SGB II rules.
        """
        if brutto <= 0: return 0.0
        
        # 1. Grundfreibetrag
        freibetrag = self.sgb2_rules["freibetrag_min"]
        
        # 2. Step 1: 20% (100-538€)
        if brutto > 100:
            step1_base = min(brutto, self.sgb2_rules["freibetrag_step1_limit"]) - 100.00
            freibetrag += step1_base * self.sgb2_rules["freibetrag_step1_percent"]
            
        # 3. Step 2: 30% (538-1000€)
        if brutto > self.sgb2_rules["freibetrag_step1_limit"]:
            step2_base = min(brutto, self.sgb2_rules["freibetrag_step2_limit"]) - self.sgb2_rules["freibetrag_step1_limit"]
            freibetrag += step2_base * self.sgb2_rules["freibetrag_step2_percent"]
            
        # 4. Step 3: 10% (1000 - Cap)
        cap = self.sgb2_rules["freibetrag_step3_limit"]
        if has_child_in_hh:
            # Higher limit if children live in household (1500€ instead of 1200€)
            cap = 1500.00
            
        if brutto > self.sgb2_rules["freibetrag_step2_limit"]:
            step3_base = min(brutto, cap) - self.sgb2_rules["freibetrag_step2_limit"]
            freibetrag += max(0.0, step3_base * self.sgb2_rules["freibetrag_step3_percent"])
            
        return round(freibetrag, 2)

    # Vereinfachte Regelaltersgrenze (variiert je nach Geburtsjahrgang zwischen 65 und 67; 67 als
    # konservativer Näherungswert für aktuelle/zukünftige Renteneintritte).
    REGELALTERSGRENZE = 67

    # Für Asylbewerber/innen im laufenden Asylverfahren gilt statt Bürgergeld/Wohngeld/
    # Kinderzuschlag das AsylbLG (Asylbewerberleistungsgesetz) - die Systeme schließen sich
    # gegenseitig aus. Ohne diese Prüfung würde ihnen fälschlich ein regulärer Anspruch
    # angezeigt, obwohl sie rechtlich auf das gesonderte AsylbLG-Verfahren beim Sozialamt
    # verwiesen sind.
    ASYLBLG_INELIGIBLE_REASON = (
        "Während des laufenden Asylverfahrens besteht in der Regel kein Anspruch auf diese "
        "Leistung, sondern auf Leistungen nach dem Asylbewerberleistungsgesetz (AsylbLG) - "
        "ein eigenes Verfahren beim Sozialamt."
    )
    ASYLBLG_APPLICATION_LINK = "https://www.bamf.de/"

    def _is_asylum_seeker(self, request: HouseholdRequest) -> bool:
        main_person = next((m for m in request.members if m.role == "main"), None)
        return main_person is not None and getattr(main_person, 'is_asylum_seeker', False)

    def calculate_sgb2(self, request: HouseholdRequest) -> dict:
        main_person = next((m for m in request.members if m.role == "main"), None)

        if self._is_asylum_seeker(request):
            return {
                "status": "ineligible",
                "amount": 0.00,
                "reason": self.ASYLBLG_INELIGIBLE_REASON,
                "application_link": self.ASYLBLG_APPLICATION_LINK
            }

        # Personen ab Regelaltersgrenze bzw. bereits im Ruhestand fallen nicht unter SGB II,
        # sondern unter die Grundsicherung im Alter (SGB XII) - ein eigenes Verfahren, das dieser
        # Rechner nicht abbildet. Ohne diese Prüfung würde ihnen fälschlich ein Bürgergeld-Betrag
        # angezeigt. Betrifft nur den Fall, dass die Hauptperson selbst im Rentenalter ist; gemischte
        # Bedarfsgemeinschaften (z.B. ein noch erwerbsfähiger Partner) werden hier nicht gesondert behandelt.
        if main_person is not None and (getattr(main_person, 'is_retired', False) or main_person.age >= self.REGELALTERSGRENZE):
            return {
                "status": "ineligible",
                "amount": 0.00,
                "reason": "Ab der Regelaltersgrenze besteht kein Anspruch auf Bürgergeld (SGB II), sondern ggf. auf Grundsicherung im Alter (SGB XII) - ein eigenes Verfahren beim Sozialamt. Bitte lass das separat prüfen.",
                "application_link": "https://www.deutsche-rentenversicherung.de/DRV/DE/Rente/Allgemeine-Informationen/Grundsicherung/grundsicherung.html"
            }

        # Vollzeit-Studierende in einer grundsätzlich BAföG-/BAB-förderfähigen Ausbildung sind nach
        # § 27 SGB II grundsätzlich vom Bürgergeld ausgeschlossen (unabhängig vom tatsächlichen Bezug).
        # Bekannte Ausnahmen bestehen u.a. für Alleinerziehende und Schwangere (§ 27 Abs. 3 SGB II) -
        # diese werden hier bewusst nicht ausgeschlossen. Andere Ausnahmefälle (Urlaubssemester,
        # Studienabbruch, besondere Härtefälle) werden hier nicht erkannt und sollten individuell
        # beim Jobcenter geprüft werden.
        if (main_person is not None and getattr(main_person, 'is_student', False)
                and not getattr(main_person, 'is_single_parent', False)
                and not getattr(main_person, 'is_pregnant', False)):
            return {
                "status": "ineligible",
                "amount": 0.00,
                "reason": "Als Vollzeit-Studierende(r) in einer grundsätzlich BAföG-förderfähigen Ausbildung besteht in der Regel kein Anspruch auf Bürgergeld (§ 27 SGB II), unabhängig vom tatsächlichen BAföG-Bezug. Ausnahmen (z.B. Urlaubssemester, Härtefälle) bitte individuell beim Jobcenter klären lassen.",
                "application_link": self.sgb2_rules["application_link"]
            }

        total_need = 0.0
        total_income_anrechenbar = 0.0

        has_child = any(member.role == "child" for member in request.members)
        has_partner = any(member.role == "partner" for member in request.members)

        # 1. BEDARF & MEHRBEDARF
        for member in request.members:
            # Regelsatz
            if member.role == "main":
                rate = self.sgb2_rules["rbs_2"] if has_partner else self.sgb2_rules["rbs_1"]
            elif member.role == "partner":
                rate = self.sgb2_rules["rbs_2"]
            elif member.role == "child":
                if member.age < 6: rate = self.sgb2_rules["rbs_6"]
                elif member.age < 14: rate = self.sgb2_rules["rbs_5"]
                elif member.age < 18: rate = self.sgb2_rules["rbs_4"]
                else: rate = self.sgb2_rules["rbs_3"]
            else:
                rate = self.sgb2_rules["rbs_1"]
            
            total_need += rate
            
            # Mehrbedarf: Alleinerziehend
            if member.role == "main" and getattr(member, 'is_single_parent', False):
                total_need += self.sgb2_rules["rbs_1"] * self.sgb2_rules["single_parent_percent"]
                
            # Mehrbedarf: Schwangerschaft
            if getattr(member, 'is_pregnant', False):
                total_need += rate * self.sgb2_rules["pregnancy_percent"]
                
            # Mehrbedarf: Behinderung (SGB IX)
            if getattr(member, 'is_disabled', False):
                total_need += rate * 0.35

            # Einkommen berechnen
            for inc in member.incomes:
                if inc.source_type in self.ERWERBSEINKOMMEN_TYPES:
                    # Gestaffelter Erwerbstätigenfreibetrag (§ 11b Abs. 3 SGB II) gilt nur für Erwerbseinkommen.
                    if inc.amount_brutto > 0:
                        freibetrag = self._calculate_freibetrag(inc.amount_brutto, has_child)
                        anrechenbar = max(0.0, inc.amount_net - freibetrag)
                        total_income_anrechenbar += anrechenbar
                elif inc.amount_net > 0:
                    # Nicht-Erwerbseinkommen (Rente, Unterhalt, ...): kein gestaffelter Freibetrag,
                    # nur die pauschale Versicherungspauschale (§ 11b Abs. 1 Nr. 3 SGB II).
                    anrechenbar = max(0.0, inc.amount_net - self.sgb2_rules.get("versicherungspauschale", 30.0))
                    total_income_anrechenbar += anrechenbar

        # 2. WOHNEN (Eigentum vs. Miete)
        owns = getattr(request, 'owns_property', False)
        accommodation = request.rent_cold + request.rent_utility + request.rent_heating
        if owns:
            # Estimate maintenance and interest instead of cold rent
            accommodation = (request.rent_cold * 0.5) + request.rent_utility + request.rent_heating
            
        total_need += accommodation

        # 3. SANKTION (Kündigung)
        main_regelsatz = self.sgb2_rules["rbs_2"] if has_partner else self.sgb2_rules["rbs_1"]
        sanction_amount = 0.0
        if request.termination_reason in [TerminationReason.SELF_TERMINATION, TerminationReason.MUTUAL_AGREEMENT]:
            sanction_amount = round(main_regelsatz * 0.30, 2)
        
        # 4. BILANZ
        raw_diff = total_need - total_income_anrechenbar
        
        if raw_diff <= 0:
            return {
                "status": "ineligible",
                "amount": 0.00,
                "reason": "Dein anrechenbares Einkommen deckt den gesamten berechneten Bedarf von existenzsichernden Leistungen.",
                "application_link": self.sgb2_rules["application_link"]
            }
        
        final_amount = max(0.00, raw_diff - sanction_amount)
        reason = "Berechnung erfolgreich. Anspruch auf Bürgergeld ermittelt."
        if sanction_amount > 0:
            reason += f" Wegen Eigenkündigung/Aufhebungsvertrag wurde eine Sperrzeit-Minderung von {sanction_amount:.2f} € berücksichtigt."
            
        return {
            "status": "eligible",
            "amount": round(final_amount, 2),
            "reason": reason,
            "sanction_applied": sanction_amount if final_amount > 0 else 0.00,
            "application_link": self.sgb2_rules["application_link"]
        }

    def calculate_wohngeld(self, request: HouseholdRequest) -> dict:
        if self._is_asylum_seeker(request):
            return {
                "status": "ineligible",
                "amount": 0.00,
                "reason": self.ASYLBLG_INELIGIBLE_REASON,
                "application_link": self.ASYLBLG_APPLICATION_LINK
            }

        total_netto = sum([sum([i.amount_net for i in m.incomes]) for m in request.members])
        warm_miete = request.rent_cold + request.rent_utility
        hh_size = len(request.members)

        # Minimum income threshold: roughly 80% rent plus SGB II equivalent standard rates
        mindest_bedarf = sum([400.0 for m in request.members]) + (warm_miete * 0.8)

        if total_netto < mindest_bedarf:
            return {
                "status": "possible",
                "amount": 0.00,
                "reason": "Möglicher Anspruch. Da dein Einkommen sehr gering ist, deckt Wohngeld alleine das Existenzminimum wahrscheinlich nicht. Bürgergeld wird empfohlen.",
                "application_link": self.wohngeld_rules["application_link"]
            }

        # Mietstufe (1-7) bestimmt die Mietobergrenze und fließt in die amtliche
        # WoGG-Rasterformel ein. city_tier kann fehlen (altes Frontend/Bestandsdaten) -> Mietstufe 1 als konservativer Default.
        mietstufe = request.city_tier if request.city_tier in range(1, 8) else 1
        rent_caps = self.wohngeld_rules["rent_caps"][str(mietstufe)]
        # rent_caps ist nach Haushaltsgröße 1-6 gestaffelt; größere Haushalte nutzen die Obergrenze für 6 Personen (Näherung).
        size_idx = min(hh_size, len(rent_caps)) - 1
        rent_cap = rent_caps[size_idx]
        # Für die Formel zählt die Bruttokaltmiete (kalt + Nebenkosten, ohne Heizkosten), gedeckelt auf die Mietobergrenze.
        considered_rent = min(warm_miete, rent_cap)

        # Koeffizienten sind nur bis Haushaltsgröße 5 hinterlegt; größere Haushalte nutzen Größe 5 (Näherung).
        coeff_size = min(hh_size, 5)
        coeffs = self.wohngeld_rules["coefficients"][str(coeff_size)]
        a, b, c = coeffs["a"], coeffs["b"], coeffs["c"]

        # Amtliche WoGG-Rasterformel (§19 WoGG): WG = 1,15 * (M - (a + b*M + c*Y) * Y)
        Y = total_netto
        M = considered_rent
        raw_amount = 1.15 * (M - ((a + (b * M) + (c * Y)) * Y))

        # Bagatellgrenze: unter 10€/Monat besteht kein Wohngeldanspruch (wird nicht ausgezahlt).
        if raw_amount < 10.0:
            return {
                "status": "ineligible",
                "amount": 0.00,
                "reason": "Einkommen übersteigt die geschätzte Höchstgrenze für Wohngeld.",
                "application_link": self.wohngeld_rules["application_link"]
            }

        # Wohngeld kann rechnerisch nie die berücksichtigte Miete selbst übersteigen.
        estimated_amount = min(round(raw_amount, 2), round(considered_rent, 2))

        return {
            "status": "eligible",
            "amount": estimated_amount,
            "reason": f"Gute Chancen auf Wohngeld (geschätzt ca. {estimated_amount:.2f} €, Mietstufe {mietstufe}) zur Unterstützung deiner Wohnkosten.",
            "application_link": self.wohngeld_rules["application_link"]
        }

    def calculate_kindergeld(self, request: HouseholdRequest) -> dict:
        eligible_children = 0
        for member in request.members:
            if member.role == "child":
                age = member.age
                is_edu = getattr(member, 'is_student', False) or getattr(member, 'is_in_training', False)
                if age < self.kindergeld_rules["age_limit_standard"]:
                    eligible_children += 1
                elif age < self.kindergeld_rules["age_limit_education"] and is_edu:
                    eligible_children += 1
                    
        amount = eligible_children * self.kindergeld_rules["amount_per_child"]
        status = "eligible" if amount > 0 else "ineligible"
        reason = f"Anspruch auf {amount:.2f} € Kindergeld für {eligible_children} anspruchsberechtigte(s) Kind(er)." if amount > 0 else "Keine anspruchsberechtigten Kinder (unter 18 bzw. unter 25 in Ausbildung) im Haushalt gemeldet."
        
        return {
            "status": status,
            "amount": amount,
            "reason": reason,
            "application_link": self.kindergeld_rules["application_link"]
        }

    def calculate_kinderzuschlag(self, request: HouseholdRequest) -> dict:
        if self._is_asylum_seeker(request):
            return {
                "status": "ineligible",
                "amount": 0.00,
                "reason": self.ASYLBLG_INELIGIBLE_REASON,
                "application_link": self.ASYLBLG_APPLICATION_LINK
            }

        # Eligible children: under 25, lives in household, unmarried
        eligible_children = 0
        for member in request.members:
            if member.role == "child" and member.age < self.kinderzuschlag_rules["age_limit"]:
                eligible_children += 1
                
        if eligible_children == 0:
            return {
                "status": "ineligible",
                "amount": 0.0,
                "reason": "Keine kindergeldberechtigten Kinder unter 25 Jahren im Haushalt.",
                "application_link": self.kinderzuschlag_rules["application_link"]
            }
            
        # Check parents minimum income requirements
        parent_earned_income = 0.0
        has_couple = any(m.role == "partner" for m in request.members)
        
        for member in request.members:
            if member.role in ["main", "partner"]:
                for inc in member.incomes:
                    if inc.source_type in ["employment", "minijob", "self_employed"]:
                        parent_earned_income += inc.amount_net
                        
        min_req = self.kinderzuschlag_rules["min_income_couple"] if has_couple else self.kinderzuschlag_rules["min_income_single"]
        
        if parent_earned_income < min_req:
            return {
                "status": "ineligible",
                "amount": 0.0,
                "reason": f"Das Mindesteinkommen der Eltern von {min_req} € (Erwerbseinkommen) wird nicht erreicht (aktuell: {parent_earned_income:.2f} €). Bürgergeld ist wahrscheinlicher.",
                "application_link": self.kinderzuschlag_rules["application_link"]
            }
            
        # Calculate parent SGB II need to see if parents exceed their own need
        parent_need = 563.00 if not has_couple else 1012.00
        parent_need += (request.rent_cold + request.rent_utility + request.rent_heating) * 0.7
        max_kiz = eligible_children * self.kinderzuschlag_rules["max_amount_per_child"]
        
        if parent_earned_income >= parent_need:
            excess = parent_earned_income - parent_need
            # 50% of parent's excess income is deducted from Kinderzuschlag
            amount = max(0.0, max_kiz - (excess * 0.5))
            if amount > 0:
                return {
                    "status": "eligible",
                    "amount": round(amount, 2),
                    "reason": f"Anspruch auf Kinderzuschlag wahrscheinlich (ca. {amount:.2f} € für {eligible_children} Kinder). Schützt vor Bürgergeld.",
                    "application_link": self.kinderzuschlag_rules["application_link"]
                }
            else:
                return {
                    "status": "ineligible",
                    "amount": 0.0,
                    "reason": "Einkommen ist hoch genug, um den gesamten Bedarf inklusive Kinderzuschlag zu decken.",
                    "application_link": self.kinderzuschlag_rules["application_link"]
                }
        else:
            # Parents income doesn't cover their own SGB II need, but close enough with KiZ + Wohngeld?
            if parent_earned_income + max_kiz >= parent_need:
                return {
                    "status": "possible",
                    "amount": max_kiz,
                    "reason": "Möglicher Anspruch. Kinderzuschlag zusammen mit Wohngeld kann Hilfebedürftigkeit verhindern.",
                    "application_link": self.kinderzuschlag_rules["application_link"]
                }
            else:
                return {
                    "status": "ineligible",
                    "amount": 0.0,
                    "reason": "Das Eltern-Einkommen reicht nicht aus, um durch Kinderzuschlag und Wohngeld die Hilfebedürftigkeit zu vermeiden. Bürgergeld empfohlen.",
                    "application_link": self.kinderzuschlag_rules["application_link"]
                }

    def calculate_elterngeld(self, request: HouseholdRequest) -> dict:
        has_baby = any(member.role == "child" and member.age == 0 for member in request.members)
        expects = getattr(request, 'expects_child', False)
        
        if not (has_baby or expects):
            return {
                "status": "ineligible",
                "amount": 0.0,
                "reason": "Keine Schwangerschaft oder Neugeborenes (unter 1 Jahr) im Haushalt gemeldet.",
                "application_link": self.elterngeld_rules["application_link"]
            }
            
        main_parent = next((m for m in request.members if m.role == "main"), None)
        parent_income = 0.0
        if main_parent:
            parent_income = sum(inc.amount_net for inc in main_parent.incomes if inc.amount_net > 0)
            
        estimated_amount = parent_income * self.elterngeld_rules["standard_percentage"]
        estimated_amount = max(self.elterngeld_rules["min_amount"], min(self.elterngeld_rules["max_amount"], estimated_amount))
        
        reason = f"Anspruch auf ca. {estimated_amount:.2f} € Elterngeld pro Monat."
        if expects:
            reason += " (Prognose basierend auf Angabe Schwangerschaft)"
            
        return {
            "status": "eligible",
            "amount": round(estimated_amount, 2),
            "reason": reason,
            "application_link": self.elterngeld_rules["application_link"]
        }

    def evaluate_all(self, request: HouseholdRequest) -> Dict[str, Any]:
        """
        Evaluate all benefit modules in parallel.
        """
        sgb2 = self.calculate_sgb2(request)
        wohngeld = self.calculate_wohngeld(request)
        kindergeld = self.calculate_kindergeld(request)
        kinderzuschlag = self.calculate_kinderzuschlag(request)
        elterngeld = self.calculate_elterngeld(request)

        # Nachranggrundsatz (§ 12a SGB II): Wohngeld und Kinderzuschlag gehen dem Bürgergeld vor,
        # wenn sie zusammen mit dem Einkommen die Hilfebedürftigkeit beseitigen. Ohne diese Prüfung
        # würden Bürgergeld und Kinderzuschlag nebeneinander als unabhängige Ansprüche angezeigt,
        # obwohl rechtlich meist nur einer von beiden zutrifft. Grobe Näherung: deckt der mögliche
        # Wohngeld- + Kinderzuschlag-Betrag die berechnete Bürgergeld-Lücke, entfällt der Bürgergeld-Anspruch.
        if sgb2["status"] == "eligible" and kinderzuschlag["status"] == "eligible":
            # Nur ein bestätigtes ("eligible") Kinderzuschlag-Ergebnis darf den Bürgergeld-Anspruch
            # verdrängen - "possible" ist ausdrücklich unsicher (siehe Wohngeld-"possible"-Zweig,
            # der bewusst amount=0.0 hält) und soll den Anspruch nicht eigenmächtig aufheben.
            combined_alternative = wohngeld.get("amount", 0.0) + kinderzuschlag.get("amount", 0.0)
            if combined_alternative >= sgb2["amount"]:
                sgb2 = {
                    "status": "ineligible",
                    "amount": 0.00,
                    "reason": "Wohngeld und Kinderzuschlag decken zusammen mit deinem Einkommen voraussichtlich euren Bedarf – dadurch entfällt der Anspruch auf Bürgergeld (Nachrangprinzip, § 12a SGB II). Bitte Wohngeld und Kinderzuschlag beantragen statt Bürgergeld.",
                    "application_link": self.sgb2_rules["application_link"]
                }
            else:
                sgb2 = dict(sgb2)
                sgb2["reason"] += " Hinweis: Da möglicherweise auch Kinderzuschlag/Wohngeld in Frage kommen, kann sich dein tatsächlicher Bürgergeld-Bedarf reduzieren (Nachrangprinzip) – das Jobcenter prüft die genaue Anrechnung."
        elif sgb2["status"] == "eligible" and kinderzuschlag["status"] == "possible":
            sgb2 = dict(sgb2)
            sgb2["reason"] += " Hinweis: Da möglicherweise auch Kinderzuschlag/Wohngeld in Frage kommen, kann sich dein tatsächlicher Bürgergeld-Bedarf reduzieren (Nachrangprinzip) – das Jobcenter prüft die genaue Anrechnung."

        return {
            "sgb2": sgb2,
            "wohngeld": wohngeld,
            "kindergeld": kindergeld,
            "kinderzuschlag": kinderzuschlag,
            "elterngeld": elterngeld
        }