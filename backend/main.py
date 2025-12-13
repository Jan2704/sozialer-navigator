from flask import Flask, request, jsonify
from flask_cors import CORS
from engine import SocialRuleEngine
import os

app = Flask(__name__)
CORS(app)

engine = SocialRuleEngine()

# --- 💰 HIER DEINE ECHTEN LINKS EINFÜGEN 💰 ---
# Kopiere deine langen Check24-Links exakt zwischen die Anführungszeichen ""
LINK_STROM = "https://a.check24.net/misc/click.php?pid=1163556&aid=18&deep=stromanbieter-wechseln&cat=1"
LINK_DSL   = "https://a.check24.net/misc/click.php?pid=1163556&aid=18&deep=dsl-anbieterwechsel&cat=4"
LINK_GAS   = "https://a.check24.net/misc/click.php?pid=1163556&aid=18&deep=gasanbieter-wechseln&cat=3"

# Fallback für Anwalt (lassen wir erst mal so)
LINK_ANWALT_SPERRZEIT = "https://hartz4widerspruch.de/"


@app.route('/api/v4/analyze', methods=['POST'])
def analyze():
    data = request.json
    
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

    # --- MONEY MATRIX (Affiliate Logik) ---
    opportunities = []

    # 1. SANKTIONIERER (Panik-Modus)
    if sgb2_result.get("sanction_applied", 0) > 0:
        opportunities.append({
            "id": "legal_aid",
            "title": "168 € Verlust verhindern ⚖️",
            "text": "Dein Anspruch wurde gekürzt. Lass kostenlos prüfen, ob du das Geld zurückbekommst.",
            "icon": "§",
            "link": "https://hartz4widerspruch.de/",
            "action": "Kostenlos prüfen"
        })
        opportunities.append({
            "id": "energy_saver_panic",
            "title": "Fixkosten sofort senken 📉",
            "text": "Wenn das Amt kürzt, musst du Ausgaben senken. Prüfe hier dein Sparpotenzial.",
            "icon": "⚡",
            "link": "https://a.check24.net/misc/click.php?pid=1163556&aid=18&deep=stromanbieter-wechseln&cat=1",
            "action": "Kosten berechnen"
        })

    # 2. REICHE / ABGELEHNTE (Bonus-Jäger Modus)
    elif sgb2_result.get("type") == "REJECTED_INCOME":
        opportunities.append({
            "id": "energy_saver_rich",
            "title": "Kein Geld vom Staat? ⚡",
            "text": "Hol dir das Geld vom Anbieter zurück. Viele zahlen 300€ zu viel. Sicher dir den Neukundenbonus.",
            "icon": "💶",
            "link": "https://a.check24.net/misc/click.php?pid=1163556&aid=18&deep=stromanbieter-wechseln&cat=1",
            "action": "Bonus sichern"
        })
        opportunities.append({
            "id": "dsl_saver_rich",
            "title": "Internet-Bonus abholen 📶",
            "text": "Zahlst du den treuen Bestandskunden-Preis? Neukunden bekommen oft 180 € Bonus.",
            "icon": "💻",
            "link": "https://a.check24.net/misc/click.php?pid=1163556&aid=18&deep=dsl-anbieterwechsel&cat=4",
            "action": "Tarife prüfen"
        })

    # 3. BÜRGERGELD / STANDARD (Spar-Modus)
    else:
        opportunities.append({
            "id": "energy_saver_standard",
            "title": "Bis zu 200 € bar sparen 💰",
            "text": "Viele zahlen zu viel Strom. Wechseln & Geld behalten.",
            "icon": "⚡",
            "link": "https://a.check24.net/misc/click.php?pid=1163556&aid=18&deep=stromanbieter-wechseln&cat=1",
            "action": "Spar-Potenzial zeigen"
        })
        
        # Gas nur anzeigen, wenn Heizkosten > 0
        if req.rent_heating > 0:
             opportunities.append({
                "id": "gas_saver",
                "title": "Gasanbieter wechseln",
                "text": "Die Gaspreise schwanken stark. Ein Vergleich lohnt sich jetzt.",
                "icon": "🔥",
                "link": "https://a.check24.net/misc/click.php?pid=1163556&aid=18&deep=gasanbieter-wechseln&cat=3",
                "action": "Gaspreise vergleichen"
            })
            
        opportunities.append({
            "id": "internet_standard",
            "title": "WLAN zu teuer?",
            "text": "Vergleiche DSL-Tarife und halbiere deine monatlichen Kosten.",
            "icon": "📶",
            "link": "https://a.check24.net/misc/click.php?pid=1163556&aid=18&deep=dsl-anbieterwechsel&cat=4",
            "action": "Tarife prüfen"
        })

    return jsonify({
        "results": results_list,
        "opportunities": opportunities
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 10000))
    app.run(host='0.0.0.0', port=port)