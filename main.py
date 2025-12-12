from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from engine import SocialRuleEngine
import uvicorn
import os

app = FastAPI()

# CORS aktivieren (damit das Frontend zugreifen darf)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = SocialRuleEngine()

# --- DEINE AFFILIATE LINKS ---
LINK_CHECK24_STROM = "https://www.check24.de/strom/vergleich/"
LINK_CHECK24_DSL = "https://www.check24.de/dsl/vergleich/"
LINK_ANWALT_SPERRZEIT = "https://hartz4widerspruch.de/"

# Hilfsklassen für die Daten
class Member:
    def __init__(self, m):
        self.role = m.get('role')
        self.age = m.get('age')
        self.is_single_parent = m.get('is_single_parent', False)
        self.incomes = [Income(i) for i in m.get('incomes', [])]

class Income:
    def __init__(self, i):
        self.amount_brutto = i.get('amount_brutto', 0)
        self.amount_net = i.get('amount_net', 0)

class RequestObj:
    def __init__(self, d):
        self.rent_cold = d.get('rent_cold', 0)
        self.rent_utility = d.get('rent_utility', 0)
        self.rent_heating = d.get('rent_heating', 0)
        self.termination_reason = d.get('termination_reason', 'none')
        self.members = [Member(m) for m in d.get('members', [])]

@app.post("/api/v4/analyze")
async def analyze(request: Request):
    data = await request.json()
    req = RequestObj(data)

    # Berechnen
    sgb2_result = engine.calculate_sgb2(req)
    wohngeld_result = engine.calculate_wohngeld(req)

    results_list = []
    
    # 1. ERGEBNIS-ANZEIGE
    if sgb2_result.get("sanction_applied", 0) > 0:
        loss = sgb2_result["sanction_applied"]
        results_list.append({
            "type": "ALERT",
            "title": "⚠️ Risiko: Sperrzeit erkannt",
            "text": f"Durch die Eigenkündigung verlierst du {loss} € pro Monat. Das ist eine Woche Essen! Diese Kürzung ist oft rechtswidrig.",
            "amount": 0.0
        })

    if sgb2_result.get("type") == "SGB2":
        results_list.append({
            "type": "SGB2",
            "title": "Dein Bürgergeld-Anspruch",
            "text": "Dieser Betrag sichert dein Existenzminimum + Miete.",
            "amount": sgb2_result["amount"]
        })
    elif sgb2_result.get("type") == "REJECTED_INCOME":
        results_list.append({
            "type": "REJECTED_INCOME",
            "title": "Kein Anspruch (Einkommen zu hoch)",
            "text": "Dein Einkommen deckt den Bedarf. Kein Geld vom Staat – aber hol dir dein Geld woanders zurück (siehe unten).",
            "amount": 0.00
        })

    if wohngeld_result.get("reason") == "eligible":
        results_list.append({
            "type": "WOHNGELD",
            "title": "Alternative: Wohngeld möglich",
            "text": "Du hast gute Chancen auf Wohngeld als vorrangige Leistung.",
            "amount": wohngeld_result["amount"]
        })

    # --- MONEY MATRIX (Affiliate) ---
    opportunities = []

    # 1. SANKTIONIERER
    if sgb2_result.get("sanction_applied", 0) > 0:
        opportunities.append({
            "id": "legal_aid",
            "title": "168 € Verlust verhindern ⚖️",
            "text": "Dein Anspruch wurde gekürzt. Lass kostenlos prüfen, ob du das Geld zurückbekommst.",
            "icon": "§",
            "link": LINK_ANWALT_SPERRZEIT,
            "action": "Kostenlos prüfen"
        })
        opportunities.append({
            "id": "energy_saver_panic",
            "title": "Fixkosten sofort senken 📉",
            "text": "Wenn das Amt kürzt, musst du Ausgaben senken. Prüfe hier dein Sparpotenzial.",
            "icon": "⚡",
            "link": LINK_CHECK24_STROM,
            "action": "Kosten berechnen"
        })

    # 2. REICHE / ABGELEHNTE
    elif sgb2_result.get("type") == "REJECTED_INCOME":
        opportunities.append({
            "id": "energy_saver_rich",
            "title": "Kein Geld vom Staat? ⚡",
            "text": "Hol dir das Geld vom Anbieter zurück. Viele zahlen 300€ zu viel. Sicher dir den Neukundenbonus.",
            "icon": "💶",
            "link": LINK_CHECK24_STROM,
            "action": "Bonus sichern"
        })
        opportunities.append({
            "id": "dsl_saver_rich",
            "title": "Internet-Bonus abholen 📶",
            "text": "Zahlst du den treuen Bestandskunden-Preis? Neukunden bekommen oft 180 € Bonus.",
            "icon": "💻",
            "link": LINK_CHECK24_DSL,
            "action": "Tarife prüfen"
        })

    # 3. BÜRGERGELD EMPFÄNGER
    elif sgb2_result.get("type") == "SGB2":
        opportunities.append({
            "id": "energy_saver_sgb2",
            "title": "Bis zu 200 € bar sparen 💰",
            "text": "Viele zahlen zu viel Strom. Wechseln & Geld behalten.",
            "icon": "⚡",
            "link": LINK_CHECK24_STROM,
            "action": "Spar-Potenzial zeigen"
        })

    # 4. NUR WOHNGELD
    elif wohngeld_result.get("reason") == "eligible":
        opportunities.append({
            "id": "energy_saver_wogg",
            "title": "Haushaltskasse aufbessern ⚡",
            "text": "Nutze die Zeit bis zum Antrag: Senke deine Stromkosten und hol dir den Sofort-Bonus.",
            "icon": "⚡",
            "link": LINK_CHECK24_STROM,
            "action": "Bonus anzeigen"
        })

    return {
        "results": results_list,
        "opportunities": opportunities
    }