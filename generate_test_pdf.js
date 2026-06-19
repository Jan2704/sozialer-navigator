import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

async function createFilledPdf() {
    console.log("Lade Vorlage...");
    const pdfBytes = fs.readFileSync('./public/forms/TEST_Buergergeld.pdf');
    const pdfDoc = await PDFDocument.load(pdfBytes);
    
    const form = pdfDoc.getForm();
    
    console.log("Fülle Formularfelder...");
    form.getTextField('Vorname').setText('Max');
    form.getTextField('Nachname').setText('Mustermann');
    form.getTextField('Strasse_Hausnummer').setText('Musterstraße 123');
    form.getTextField('PLZ_Ort').setText('10115 Berlin');
    
    form.flatten();
    
    console.log("Speichere PDF...");
    const modifiedPdfBytes = await pdfDoc.save();
    fs.writeFileSync('./Filled_TEST_Buergergeld.pdf', modifiedPdfBytes);
    console.log("Fertig! Gespeichert als Filled_TEST_Buergergeld.pdf");
}

createFilledPdf().catch(console.error);
