import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function generateApplicationPdf(data: {
    firstName: string;
    lastName: string;
    email: string;
    street?: string;       // Not always present in old flow, but good to add
    zipCity?: string;      // Not always present
    benefitLabel: string;
    authority: {
        name: string;
        street: string;
        zipCity: string;
    };
    date: Date;
}): Promise<Buffer> {

    // Create a new PDFDocument
    const pdfDoc = await PDFDocument.create();

    // Add a blank page
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 size in points
    const { width, height } = page.getSize();

    // Embed the standard font
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const marginX = 70; // Standard left margin
    const lineHeight = 15;
    let y = height - 50;

    const drawText = (text: string, options: any = {}) => {
        const textFont = options.bold ? fontBold : font;
        page.drawText(text, {
            x: options.x || marginX,
            y: options.y || y, // Allow overriding y for absolute positioning
            size: options.size || 11,
            font: textFont,
            color: rgb(0, 0, 0),
        });
        if (!options.y) {
            y -= (options.lineHeight || lineHeight);
        }
    };

    // --- SENDER (Top Right) ---
    const senderX = width - 200;
    drawText(`${data.firstName} ${data.lastName}`, { x: senderX, y }); y -= lineHeight;
    if (data.street) { drawText(data.street, { x: senderX, y }); y -= lineHeight; }
    if (data.zipCity) { drawText(data.zipCity, { x: senderX, y }); y -= lineHeight; }
    drawText(`E-Mail: ${data.email}`, { x: senderX, y }); y -= lineHeight;

    // --- DATE (Below Sender, aligned right) ---
    y -= lineHeight; // Extra space
    const formattedDate = data.date.toLocaleDateString('de-DE');
    drawText(formattedDate, { x: width - marginX - font.widthOfTextAtSize(formattedDate, 11), y });

    // --- RECIPIENT (Window Envelope Position - Top Left) ---
    // DIN 5008 usually places this around 50mm (140pt) down from the top
    y = height - 140;

    // Small sender return-address line above recipient (optional, but looks professional)
    const returnAddressText = `${data.firstName} ${data.lastName}${data.street ? ', ' + data.street : ''}${data.zipCity ? ', ' + data.zipCity : ''}`;
    drawText(returnAddressText, { size: 8, y, color: rgb(0.3, 0.3, 0.3) });
    y -= lineHeight + 5;

    drawText(data.authority.name, { bold: true, y }); y -= lineHeight;
    drawText(data.authority.street, { y }); y -= lineHeight;
    drawText(data.authority.zipCity, { y }); y -= lineHeight;

    // --- SUBJECT AND BODY ---
    // Leave space after address block
    y -= lineHeight * 4;

    // Determine Dynamic Wording
    const isWohngeld = data.benefitLabel.toLowerCase().includes('wohngeld');
    const isBuergergeld = data.benefitLabel.toLowerCase().includes('bürgergeld');

    let specificBenefit = 'Sozialleistungen';
    let specificLaw = 'SGB II / SGB XII / WoGG';

    if (isWohngeld) {
        specificBenefit = 'Wohngeld';
        specificLaw = 'WoGG';
    } else if (isBuergergeld) {
        specificBenefit = 'Bürgergeld';
        specificLaw = 'SGB II';
    }

    // Subject
    const subject = `WICHTIG: Formloser Antrag auf ${specificBenefit} (Fristwahrung)`;
    drawText(subject, { bold: true, size: 12, lineHeight: lineHeight * 2 });

    // Body
    drawText('Sehr geehrte Damen und Herren,', { lineHeight: lineHeight * 2 });

    const bodyText = [
        `hiermit stelle ich formlos einen Antrag auf ${specificBenefit} nach ${specificLaw} zur Fristwahrung.`,
        ``,
        `Dieser formlose Antrag dient der Wahrung der gesetzlichen Fristen (sofortige Wirkung `,
        `für den aktuellen Kalendermonat).`,
        ``,
        `Ich bitte Sie hiermit höflichst mir:`,
        `1. Den Eingang dieses Briefes kurz zu bestätigen.`,
        `2. Die offiziellen Antragsformulare sowie eine Liste der benötigten Unterlagen postalisch`,
        `   an meine oben genannte Adresse zuzusenden.`
    ];

    for (const line of bodyText) {
        drawText(line);
    }

    y -= lineHeight * 2;

    drawText('Mit freundlichen Grüßen,', { lineHeight: lineHeight * 2 });

    // Signature placeholder
    drawText(`${data.firstName} ${data.lastName}`, { bold: true });

    y -= lineHeight * 2;
    page.drawLine({
        start: { x: marginX, y },
        end: { x: marginX + 150, y },
        thickness: 1,
        color: rgb(0, 0, 0),
    });

    y -= lineHeight;
    drawText('(maschinell erstellt, gültig ohne Unterschrift)', { size: 9 });

    // Footer
    page.drawText('Erstellt über Sozialer-Navigator.de - Der unabhängige Ratgeber für Sozialleistungen', {
        x: marginX,
        y: 30, // Absolute bottom margin
        size: 8,
        font,
        color: rgb(0.5, 0.5, 0.5),
    });

    // Serialize the PDFDocument to bytes (a Uint8Array)
    const pdfBytes = await pdfDoc.save();

    // Convert to Buffer for Node.js backend
    return Buffer.from(pdfBytes);
}
