import fs from 'fs/promises';
import path from 'path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// Fictitious Person Data
const testPerson = {
    firstName: 'Erika',
    lastName: 'Mustermann',
    birthDate: '12.08.1989',
    street: 'Heidestraße 17',
    zipCity: '10557 Berlin',
    phone: '0176 12345678',
    email: 'erika.mustermann@example.com',
    iban: 'DE89 3704 0044 0532 0130 00',
    kontoinhaber: 'Erika Mustermann',
    transferBenefit: 'no',
    isOwner: 'no',
    hasCar: 'yes',
    hasSavings: 'no'
};

// Mock Calculation Results
const mockCalcResults = {
    wohngeld: {
        amount: 382,
        input: {
            city: { stadt: 'Berlin', plz: '10557', mietstufe: 'IV' },
            persons: 2,
            kids: 1,
            income: 1450,
            rent: 650,
            heating: 120
        }
    },
    buergergeld: {
        amount: 563,
        input: {
            city: { stadt: 'Berlin', plz: '10557', mietstufe: 'IV' },
            persons: 1,
            kids: 0,
            income: 450,
            rent: 420,
            heating: 80
        }
    }
};

async function generateFictitiousPdf(benefitType) {
    const isWohngeld = benefitType === 'Wohngeld';
    console.log(`\nGenerating test PDF for ${benefitType}...`);

    const templateName = isWohngeld ? 'TEST_Wohngeld.pdf' : 'Hauptantrag_Buergergeld.pdf';
    const templatePath = path.join(process.cwd(), 'public', 'forms', templateName);
    
    // Load template
    const arrayBuffer = await fs.readFile(templatePath);
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const form = pdfDoc.getForm();

    // Fill form fields
    try {
        if (isWohngeld) {
            form.getTextField('Vorname').setText(testPerson.firstName);
            form.getTextField('Nachname').setText(testPerson.lastName);
            form.getTextField('Strasse_Hausnummer').setText(testPerson.street);
            form.getTextField('PLZ_Ort').setText(testPerson.zipCity);
            console.log('✓ Successfully filled Wohngeld fields (Vorname, Nachname, Strasse, PLZ_Ort)');
        } else {
            form.getTextField('txtfPersonVorname').setText(testPerson.firstName);
            form.getTextField('txtfPersonNachname').setText(testPerson.lastName);
            form.getTextField('txtfPersonStr').setText(testPerson.street);
            
            const zipMatch = testPerson.zipCity.match(/^(\d{5})\s*(.*)$/);
            if (zipMatch) {
                form.getTextField('txtfPersonPlz').setText(zipMatch[1]);
                form.getTextField('txtfPersonOrt').setText(zipMatch[2]);
            } else {
                form.getTextField('txtfPersonOrt').setText(testPerson.zipCity);
            }
            
            try {
                form.getTextField('txtfPersonGebDat').setText(testPerson.birthDate);
            } catch(e) {}
            console.log('✓ Successfully filled Bürgergeld fields (txtfPersonVorname, txtfPersonNachname, txtfPersonStr, txtfPersonPlz, txtfPersonOrt, txtfPersonGebDat)');
        }
    } catch (fieldErr) {
        console.warn('⚠ Warning while filling fields:', fieldErr.message);
    }

    // Insert cover page at position 0
    const coverPage = pdfDoc.insertPage(0);
    const { width, height } = coverPage.getSize();
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // 1. Header Bar in Teal brand color
    coverPage.drawRectangle({
        x: 0,
        y: height - 100,
        width: width,
        height: 100,
        color: rgb(13/255, 148/255, 136/255), // Teal #0D9488
    });

    coverPage.drawText("AMTLY DIGITALER ASSISTENT", {
        x: 40,
        y: height - 45,
        size: 10,
        font: fontBold,
        color: rgb(1, 1, 1),
    });

    coverPage.drawText(`Offizieller Antrag auf ${benefitType}`, {
        x: 40,
        y: height - 75,
        size: 20,
        font: fontBold,
        color: rgb(1, 1, 1),
    });

    // 2. Section 1: Angaben zum Antragsteller
    coverPage.drawText("1. Angaben zum Antragsteller", {
        x: 40,
        y: height - 140,
        size: 14,
        font: fontBold,
        color: rgb(15/255, 23/255, 42/255), // Slate #0F172A
    });

    let yPos = height - 165;
    const drawField = (label, value) => {
        coverPage.drawText(label, { x: 40, y: yPos, size: 10, font: fontBold, color: rgb(71/255, 85/255, 105/255) });
        coverPage.drawText(value || 'Keine Angabe', { x: 220, y: yPos, size: 10, font: fontRegular, color: rgb(15/255, 23/255, 42/255) });
        yPos -= 20;
    };

    drawField("Name, Vorname:", `${testPerson.lastName}, ${testPerson.firstName}`);
    drawField("Geburtsdatum:", testPerson.birthDate);
    drawField("Anschrift:", `${testPerson.street}, ${testPerson.zipCity}`);
    drawField("E-Mail / Telefon:", `${testPerson.email} / ${testPerson.phone || '-'}`);
    
    if (testPerson.iban) {
        drawField("Bankverbindung:", `IBAN: ${testPerson.iban}`);
        drawField("Kontoinhaber:", testPerson.kontoinhaber);
    }

    // 3. Section 2: Vorläufige Anspruchsberechnung
    yPos -= 10;
    coverPage.drawText("2. Vorläufige Anspruchsberechnung (Amtly)", {
        x: 40,
        y: yPos,
        size: 14,
        font: fontBold,
        color: rgb(15/255, 23/255, 42/255),
    });
    yPos -= 25;

    const calc = isWohngeld ? mockCalcResults.wohngeld : mockCalcResults.buergergeld;
    drawField("Voraussichtlicher Anspruch:", `${Math.round(calc.amount)} € / Monat`);
    drawField("Mietstufe der Stadt:", `${calc.input.city?.mietstufe || 'N/A'}`);
    drawField("Haushaltsgröße:", `${calc.input.persons} Person(en) (${calc.input.kids} Kind/er)`);
    drawField("Monatliches Brutto:", `${calc.input.income} €`);
    drawField("Warmmiete:", `${calc.input.rent} € Kalt + ${calc.input.heating} € Heizung`);

    // 4. Section 3: Zusatzangaben
    yPos -= 10;
    coverPage.drawText("3. Zusatzangaben", {
        x: 40,
        y: yPos,
        size: 14,
        font: fontBold,
        color: rgb(15/255, 23/255, 42/255),
    });
    yPos -= 25;

    if (isWohngeld) {
        drawField("Andere Sozialleistungen?", testPerson.transferBenefit === 'yes' ? 'Ja' : 'Nein');
        drawField("Wohneigentum vorhanden?", testPerson.isOwner === 'yes' ? 'Ja (Lastenzuschuss)' : 'Nein (Mietzuschuss)');
    } else {
        drawField("Ersparnisse > 40.000 €?", testPerson.hasSavings === 'yes' ? 'Ja' : 'Nein');
        drawField("PKW / Auto vorhanden?", testPerson.hasCar === 'yes' ? 'Ja' : 'Nein');
    }

    // 5. Sachbearbeiter Box at the bottom
    coverPage.drawRectangle({
        x: 40,
        y: 50,
        width: width - 80,
        height: 70,
        color: rgb(248/255, 250/255, 252/255),
        borderColor: rgb(226/255, 232/255, 240/255),
        borderWidth: 1,
    });

    coverPage.drawText("HINWEIS FÜR DEN SACHBEARBEITER:", {
        x: 55,
        y: 100,
        size: 8,
        font: fontBold,
        color: rgb(100/255, 116/255, 139/255),
    });

    coverPage.drawText("Dieses Deckblatt dient zur schnelleren Vorab-Einschätzung des Falls.", {
        x: 55,
        y: 85,
        size: 9,
        font: fontRegular,
        color: rgb(71/255, 85/255, 105/255),
    });
    coverPage.drawText("Die rechtlich bindenden Daten entnehmen Sie bitte den nachfolgenden Antragsformularen.", {
        x: 55,
        y: 70,
        size: 9,
        font: fontRegular,
        color: rgb(71/255, 85/255, 105/255),
    });

    // Flatten form to bake details
    form.flatten();

    // Save PDF file
    const pdfBytes = await pdfDoc.save();
    const outputFilename = `Erika_Mustermann_${benefitType}_Antrag.pdf`;
    const outputPath = path.join(process.cwd(), outputFilename);
    await fs.writeFile(outputPath, pdfBytes);
    console.log(`✓ Saved generated PDF to: ${outputPath}`);
}

async function run() {
    try {
        await generateFictitiousPdf('Wohngeld');
        await generateFictitiousPdf('Bürgergeld');
        console.log('\nAll test PDFs successfully generated for Erika Mustermann!');
    } catch(err) {
        console.error('Error during generation:', err);
    }
}

run();
