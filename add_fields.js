import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';

async function addFieldsToPdf(filePath) {
    try {
        console.log(`Adding AcroForm fields to ${filePath}...`);
        const pdfBytes = fs.readFileSync(filePath);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        
        // Ensure form exists
        const form = pdfDoc.getForm();
        const page = pdfDoc.getPages()[0];
        const { height } = page.getSize();
        
        // Add fields to match what the user's code expects
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        
        // Helper to add a field
        const addField = (name, x, y, width, h) => {
            try {
                // Check if field already exists, if not, create it
                let field;
                try {
                    field = form.getTextField(name);
                } catch(e) {
                    field = form.createTextField(name);
                }
                field.addToPage(page, { x, y, width, height: h, font, textColor: rgb(0, 0, 0) });
            } catch (e) {
                console.error(`Error adding field ${name}:`, e.message);
            }
        };

        const startY = height - 150;
        addField('Vorname', 60, startY, 200, 20);
        addField('Nachname', 60, startY - 30, 200, 20);
        addField('Strasse_Hausnummer', 60, startY - 60, 200, 20);
        addField('PLZ_Ort', 60, startY - 90, 200, 20);
        
        const modifiedPdfBytes = await pdfDoc.save();
        fs.writeFileSync(filePath, modifiedPdfBytes);
        console.log(`Successfully added AcroForm fields to ${filePath}.`);
    } catch (e) {
        console.error(`Failed to process ${filePath}:`, e.message);
    }
}

async function main() {
    await addFieldsToPdf('./public/forms/TEST_Buergergeld.pdf');
    await addFieldsToPdf('./public/forms/TEST_Wohngeld.pdf');
}

main();
