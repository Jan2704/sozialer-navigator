const { PDFDocument } = require('pdf-lib');
const fs = require('fs');

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

readFields('public/forms/TEST_Buergergeld.pdf');
readFields('public/forms/TEST_Wohngeld.pdf');
