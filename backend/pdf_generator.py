from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from datetime import datetime

class PDFService:
    def __init__(self, filename):
        self.filename = filename
        self.styles = getSampleStyleSheet()

    def generate(self, data):
        doc = SimpleDocTemplate(self.filename, pagesize=A4)
        story = []
        
        # Titel
        story.append(Paragraph("SOZIALER NAVIGATOR 2.0", self.styles["Title"]))
        story.append(Spacer(1, 12))
        story.append(Paragraph(f"Antragsvorbereitung vom {datetime.now().strftime('%d.%m.%Y')}", self.styles["Normal"]))
        story.append(Spacer(1, 24))

        # Warnung bei Sperrzeit
        if data.get("termination_reason") in ["self_termination", "mutual_agreement"]:
            warn_style = ParagraphStyle('Warn', parent=self.styles['Normal'], textColor=colors.red)
            story.append(Paragraph("ACHTUNG: SPERRZEIT-RISIKO ERKANNT", warn_style))
            story.append(Paragraph("Begründung für Eigenkündigung muss beigelegt werden!", self.styles["Normal"]))
            story.append(Spacer(1, 12))

        # Daten Tabelle
        table_data = [
            ["Feld", "Ihre Angabe"],
            ["Personen", str(data.get("residents_count"))],
            ["Kaltmiete", f"{data.get('rent_cold')} EUR"],
            ["Heizkosten", f"{data.get('rent_heating')} EUR"],
            ["Netto-Einkommen", f"{data.get('income_net')} EUR"],
            ["Job-Status", data.get("termination_reason")]
        ]

        t = Table(table_data)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ]))
        story.append(t)
        story.append(Spacer(1, 24))
        
        story.append(Paragraph("Empfohlenes Vorgehen:", self.styles["Heading2"]))
        story.append(Paragraph("Reichen Sie dieses Dokument zusammen mit Ihren Kontoauszügen beim Jobcenter ein.", self.styles["Normal"]))

        doc.build(story)
        return self.filename