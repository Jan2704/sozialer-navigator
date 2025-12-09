from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from models import HouseholdRequest
from engine import SocialRuleEngine
from pdf_generator import PDFService
import uvicorn
import os

app = FastAPI(title="Sozialer Navigator 4.1 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = SocialRuleEngine()

@app.post("/api/v4/analyze")
async def analyze_v4(request: HouseholdRequest):
    recommendations = []
    
    # 1. Berechnungen
    sgb2 = engine.calculate_sgb2(request)
    wogg = engine.calculate_wohngeld(request)
    
    # 2. Strategie & Ergebnisse
    if sgb2["sanction_applied"] > 0:
        recommendations.append({
            "type": "ALERT", "title": "Sperrzeit aktiv", 
            "amount": f"-{sgb2['sanction_applied']} €",
            "text": "Sanktionierung wegen Eigenkündigung."
        })

    if sgb2["amount"] > 0:
        recommendations.append({
            "type": "SGB2", "title": "Bürgergeld Anspruch", 
            "amount": f"{sgb2['amount']} €",
            "text": "Sichert Existenzminimum + Miete."
        })
        
    if wogg["amount"] > 0:
        recommendations.append({
            "type": "WOGG", "title": "Wohngeld Plus",
            "amount": f"{wogg['amount']} €",
            "text": "Mietzuschuss ohne Jobcenter-Stress.",
            "tags": ["Vermögensschutz", "Keine Vermittlung"]
        })

    # Strategie-Empfehlung
    best_option = "Kein Anspruch"
    reason = "Einkommen zu hoch."
    
    if sgb2["amount"] > 0 or wogg["amount"] > 0:
        if sgb2["amount"] > (wogg["amount"] + 50):
            best_option = "Bürgergeld"
            reason = f"Bürgergeld ist {round(sgb2['amount'] - wogg['amount'])}€ höher als Wohngeld."
        elif wogg["amount"] > 0:
            best_option = "Wohngeld"
            reason = "Betrag ähnlich, aber Wohngeld lässt dir dein Vermögen und deine Ruhe."

    return {
        "strategy": {"best_option": best_option, "reasoning": reason},
        "results": recommendations
    }

# --- HIER WAR DER FEHLER: DIESER TEIL FEHLTE WOHL ---
@app.post("/api/v4/pdf")
async def generate_pdf_v4(request: HouseholdRequest):
    service = PDFService("Antrag_V4.pdf")
    file_path = service.generate(request.dict())
    return FileResponse(file_path, filename="Mein_Antrag.pdf", media_type='application/pdf')

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)