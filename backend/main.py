from flask import Flask, request, jsonify
from flask_cors import CORS
from pydantic import ValidationError
from models import HouseholdRequest, LeadRequest
from engine import SocialRuleEngine
import os
import json
import datetime
import stripe

# DSL funktioniert (leitet weiter), Strom ist vorerst deaktiviert
LINK_DSL   = "https://a.check24.net/misc/click.php?pid=1163556&aid=18&deep=dsl-anbieterwechsel&cat=4&tid=sozialer-navigator"
LINK_ANWALT_SPERRZEIT = "https://hartz4widerspruch.de/"

app = Flask(__name__)
# Security: Restrict CORS to specific origins in production
# For now, we allow localhost and the production domain
CORS(app, resources={r"/*": {"origins": ["http://localhost:3000", "http://localhost:4321", "https://www.sozialer-navigator.de"]}})

# --- STRIPE CONFIGURATION ---
# TODO: Setze deinen ECHTEN Secret Key in den Umgebungsvariablen oder hier (nur für Tests!)
stripe.api_key = os.environ.get('STRIPE_SECRET_KEY', 'sk_test_Platzhalter_Bitte_Ersetzen')
DOMAIN = os.environ.get('DOMAIN', 'http://localhost:4321')

engine = SocialRuleEngine()

@app.route('/', methods=['GET'])
def index():
    return jsonify({"status": "online", "message": "Backend läuft! Senden Sie POST-Anfragen an /api/v4/analyze"})

@app.route('/api/v4/analyze', methods=['POST'])
def analyze():
    try:
        # Pydantic-Validierung des Request-Bodys
        req = HouseholdRequest.model_validate_json(request.data)
    except ValidationError as e:
        app.logger.error(f"Validation Error: {e.errors()}")
        return jsonify({"error": "Invalid request data", "details": e.errors()}), 400
    except Exception as e:
        app.logger.error(f"Failed to parse request JSON: {e}")
        return jsonify({"error": "Failed to parse request JSON"}), 400

    try:
        # Berechnen mit der Engine
        all_results = engine.evaluate_all(req)
        
        results_list = []
        
        # 1. ALERT HINZUFÜGEN (falls Sanktion vorhanden)
        sgb2_res = all_results["sgb2"]
        if sgb2_res.get("sanction_applied", 0) > 0:
            loss = sgb2_res["sanction_applied"]
            results_list.append({
                "type": "ALERT",
                "title": "⚠️ Risiko: Sperrzeit erkannt",
                "text": f"Durch die Eigenkündigung verlierst du {loss} € pro Monat. Das ist eine Woche Essen! Diese Kürzung ist oft rechtswidrig.",
                "amount": 0.0,
                "status": "possible",
                "link": LINK_ANWALT_SPERRZEIT
            })

        # 2. ALLE LEISTUNGEN MAPPEN
        benefit_titles = {
            "sgb2": "Bürgergeld (SGB II)",
            "wohngeld": "Wohngeld",
            "kindergeld": "Kindergeld",
            "kinderzuschlag": "Kinderzuschlag",
            "elterngeld": "Elterngeld"
        }
        
        for key, res in all_results.items():
            results_list.append({
                "type": key.upper(),
                "title": benefit_titles.get(key, key.capitalize()),
                "status": res["status"],
                "amount": res["amount"],
                "text": res["reason"],
                "link": res["application_link"]
            })

        # --- MONEY MATRIX (Nur funktionierende Links) ---
        opportunities = []

        # 1. SANKTIONIERER (Panik-Modus)
        if sgb2_res.get("sanction_applied", 0) > 0:
            opportunities.append({
                "id": "legal_aid",
                "title": "168 € Verlust verhindern ⚖️",
                "text": "Dein Anspruch wurde gekürzt. Lass kostenlos prüfen, ob du das Geld zurückbekommst.",
                "icon": "§",
                "link": LINK_ANWALT_SPERRZEIT,
                "action": "Kostenlos prüfen"
            })
        
        # 2. BÜRGERGELD / STANDARD (Spar-Modus)
        opportunities.append({
            "id": "internet_standard",
            "title": "WLAN zu teuer? 📶",
            "text": "Vergleiche DSL-Tarife und halbiere deine monatlichen Kosten.",
            "icon": "📶",
            "link": LINK_DSL,
            "action": "Tarife prüfen"
        })

        return jsonify({
            "results": results_list,
            "opportunities": opportunities
        })

    except Exception as e:
        app.logger.error(f"An unexpected error occurred during analysis: {e}", exc_info=True)
        return jsonify({"error": "An unexpected error occurred", "details": str(e)}), 500

@app.route('/api/v4/leads', methods=['POST'])
def submit_lead():
    try:
        # Validate Request
        req = LeadRequest.model_validate_json(request.data)
        
        # Log to file (MVP Database)
        lead_entry = req.model_dump()
        lead_entry["timestamp"] = datetime.datetime.now().isoformat()
        
        with open("leads.jsonl", "a", encoding="utf-8") as f:
            f.write(json.dumps(lead_entry, ensure_ascii=False) + "\n")
            
        return jsonify({"status": "success", "message": "Lead saved successfully"}), 200

    except ValidationError as e:
        return jsonify({"error": "Invalid data", "details": e.errors()}), 400
    except Exception as e:
        app.logger.error(f"Lead error: {e}")
        return jsonify({"error": "Internal Error"}), 500

@app.route('/api/v4/create-checkout-session', methods=['POST'])
def create_checkout_session():
    try:
        data = request.json
        email = data.get('email')
        
        if not email:
             return jsonify({"error": "Email is required"}), 400

        # Create Stripe Session
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card', 'paypal', 'sofort'], # Anpassbar
            line_items=[
                {
                    # TODO: Ersetzen Sie dies durch Ihre echte Price ID oder definieren Sie das Produkt on-the-fly
                    'price_data': {
                        'currency': 'eur',
                        'product_data': {
                            'name': 'Antragsservice & Sicherheitspaket',
                            'description': 'Wir übernehmen den Versand und prüfen Ihre Unterlagen.',
                        },
                        'unit_amount': 999, # 9,99 €
                    },
                    'quantity': 1,
                },
            ],
            mode='payment',
            customer_email=email,
            success_url=DOMAIN + '/danke?session_id={CHECKOUT_SESSION_ID}',
            cancel_url=DOMAIN + '/?canceled=true',
            metadata={
                "first_name": data.get('firstName'),
                "last_name": data.get('lastName'),
                "authority": data.get('authority', 'Unknown')
            }
        )
        return jsonify({'url': checkout_session.url})
    except Exception as e:
        app.logger.error(f"Stripe Error: {e}")
        return jsonify(error=str(e)), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"Backend running on port {port}. Test: http://localhost:{port}")
    app.run(host='0.0.0.0', port=port)