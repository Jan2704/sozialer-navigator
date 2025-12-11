from flask import Flask, request, jsonify
from flask_cors import CORS
from engine import SocialRuleEngine
import os

app = Flask(__name__)
CORS(app)

engine = SocialRuleEngine()

# --- DEINE AFFILIATE LINKS ---
# Sobald du die finalen Links hast, tausche sie hier aus!
LINK_CHECK24_STROM = "https://www.check24.de/strom/vergleich/"
LINK_CHECK24_DSL = "https://www.check24.de/dsl/vergleich/"
LINK_ANWALT_SPERRZEIT = "https://hartz4widerspruch.de/"

@app.route('/api/v4/analyze', methods=['POST'])
def analyze():
    data = request.json
    
    # --- Hilfsklassen ---
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

    req = RequestObj(data)

    # --- Berechnung ---
    sgb2_result = engine.calculate_sgb2(req)
    wohngeld_result = engine.calculate_wohngeld(req)

    results_list = []
    
    # 1. ERGEBNIS-ANZEIGE (Die Fakten)
    
    # Fall A: Sperrzeit (Sanktionierer)
    if sgb2_result.get("sanction_applied", 0) > 0:
        loss = sgb2_result["sanction_applied"]
        results_list.append({
            "type": "ALERT",
            "title": "⚠️ Risiko: Sperrzeit erkannt",
            "text": f"Durch die Eigenkündigung verlierst du {loss} € pro Monat. Das ist eine Woche Essen! Diese Kürzung ist oft rechtswidrig.",
            "amount": 0.0
        })

    # Fall B: Bürgergeld (Normal)
    if sgb2_result.get("type") == "SGB2":
        results_list.append({
            "type": "SGB2",
            "title": "Dein Bürgergeld-Anspruch",
            "text": "Dieser Betrag sichert dein Existenzminimum + Miete.",
            "amount": sgb2_result["amount"]
        })
    # Fall C: Abgelehnt (Zu viel Einkommen)
    elif sgb2_result.get("type") == "REJECTED_INCOME":
        results_list.append({
            "type": "REJECTED_INCOME",
            "title": "Kein Anspruch (Einkommen zu hoch)",
            "text": "Dein Einkommen deckt den Bedarf. Kein Geld vom Staat – aber hol dir dein Geld woanders zurück (siehe unten).",
            "amount": 0.00
        })

    # Fall D: Wohngeld
    if wohngeld_result.get("reason") == "eligible":
        results_list.append({
            "type": "WOHNGELD",
            "title": "Alternative: Wohngeld möglich",
            "text": "Du hast gute Chancen auf Wohngeld als vorrangige Leistung.",
            "amount": wohngeld_result["amount"]
        })

    # --- MONEY MATRIX 2.0 (Die psychologischen Affiliate-Boxen) ---
    opportunities = []

    # 🔴 1. ZIELGRUPPE: SANKTIONIERER (Angst & Gerechtigkeit)
    if sgb2_result.get("sanction_applied", 0) > 0:
        opportunities.append({
            "id": "legal_aid",
            "title": "168 € Verlust verhindern ⚖️",
            "text": "Dein Anspruch wurde gekürzt. Das ist eine Woche Essen. Lass kostenlos prüfen, ob du das Geld zurückbekommst.",
            "icon": "§",
            "link": LINK_ANWALT_SPERRZEIT,
            "action": "Kostenlos prüfen"
        })
        # Add-on: Strom
        opportunities.append({
            "id": "energy_saver_panic",
            "title": "Fixkosten sofort senken 📉",
            "text": "Wenn das Amt kürzt, musst du Ausgaben senken. Prüfe hier in 60 Sekunden dein Sparpotenzial.",
            "icon": "⚡",
            "link": LINK_CHECK24_STROM,
            "action": "Kosten berechnen"
        })

    # 🔵 2. ZIELGRUPPE: REICHE / ABGELEHNTE (Trotz & Kompensation)
    elif sgb2_result.get("type") == "REJECTED_INCOME":
        opportunities.append({
            "id": "energy_saver_rich",
            "title": "Kein Geld vom Staat? ⚡",
            "text": "Dann hol dir das Geld wenigstens vom Anbieter zurück. Viele zahlen 300€ zu viel. Sicher dir den Neukundenbonus.",
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

    # 🟢 3. ZIELGRUPPE: BÜRGERGELD EMPFÄNGER (Knappheit)
    elif sgb2_result.get("type") == "SGB2":
        opportunities.append({
            "id": "energy_saver_sgb2",
            "title": "Bis zu 200 € bar sparen 💰",
            "text": "Viele zahlen 30–40 € zu viel Strom – obwohl das Amt nur den Durchschnitt übernimmt. Wechseln & Geld behalten.",
            "icon": "⚡",
            "link": LINK_CHECK24_STROM,
            "action": "Spar-Potenzial zeigen"
        })
        opportunities.append({
            "id": "dsl_saver_sgb2",
            "title": "Internet zu teuer? 📉",
            "text": "Das Budget ist knapp. Prüfe, ob du für gleiches Internet weniger zahlen kannst.",
            "icon": "💻",
            "link": LINK_CHECK24_DSL,
            "action": "Kosten berechnen"
        })
    
    # 🟡 4. ZIELGRUPPE: WOHNGELD (Fallback)
    # Wer Wohngeld kriegt, ist oft knapp bei Kasse -> Strom sparen
    elif wohngeld_result.get("reason") == "eligible":
        opportunities.append({
            "id": "energy_saver_wogg",
            "title": "Haushaltskasse aufbessern ⚡",
            "text": "Nutze die Zeit bis zum Antrag: Senke deine Stromkosten und hol dir den Sofort-Bonus.",
            "icon": "⚡",
            "link": LINK_CHECK24_STROM,
            "action": "Bonus anzeigen"
        })

    return jsonify({
        "results": results_list,
        "opportunities": opportunities
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 10000))
    app.run(host='0.0.0.0', port=port)