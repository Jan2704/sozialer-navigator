import { PDFDocument } from 'pdf-lib';
import fs from 'fs';

async function listPdfFields() {
  // Lade das offizielle Behörden-PDF
  const pdfBytes = fs.readFileSync('./TEST_Buergergeld.pdf'); 
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();
  const fields = form.getFields();
  
  console.log("Gefundene Formularfelder in diesem PDF:");
  fields.forEach(field => {
    const type = field.constructor.name;
    const name = field.getName();
    console.log(`${type}: ${name}`);
  });
}

listPdfFields();