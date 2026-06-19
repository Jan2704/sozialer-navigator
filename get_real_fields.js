import { PDFDocument } from 'pdf-lib';
import fs from 'fs';

async function readFields(file) {
    console.log('\n--- ' + file + ' ---');
    try {
        const pdfBytes = fs.readFileSync(file);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const form = pdfDoc.getForm();
        const fields = form.getFields();
        fields.forEach(f => {
            console.log(`${f.constructor.name}: ${f.getName()}`);
        });
    } catch (e) {
        console.error('Error reading form:', e.message);
    }
}

readFields('./public/forms/Hauptantrag_Buergergeld.pdf');
