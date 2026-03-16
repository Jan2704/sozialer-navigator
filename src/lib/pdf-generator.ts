// Helper to sanitize text for WinAnsi encoding (standard PDF fonts)
function sanitizeForPdf(text: string): string {
    if (!text) return '';
    return text
        .replace(/\uFFFD/g, '?') // Replace replacement character with ? to avoid crash
        .replace(/Ã¼/g, 'ü').replace(/Ã¤/g, 'ä').replace(/Ã¶/g, 'ö')
        .replace(/Ã\u009f/g, 'ß').replace(/Ã\u009c/g, 'Ü')
        .replace(/Ã\u0084/g, 'Ä').replace(/Ã\u0096/g, 'Ö')
        // Fix common mangled benefit names
        .replace(/B.rgergeld/g, 'Bürgergeld')
        .replace(/Brgergeld/g, 'Bürgergeld')
        .replace(/B\?rgergeld/g, 'Bürgergeld');
}

export async function generateApplicationPdf(data: {
    firstName: string;
    lastName: string;
    email: string;
    street?: string;
    zipCity?: string;
    benefitLabel: string;
    authority: {
        name: string;
        street: string;
        zipCity: string;
    };
    date: Date;
}): Promise<Buffer> {

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const { width, height } = page.getSize();

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // BRAND COLORS
    const colorPrimary = rgb(0.04, 0.09, 0.16); // #0a1628
    const colorAccent = rgb(0.77, 0.65, 0.49);  // #c5a67c
    const colorGray = rgb(0.4, 0.4, 0.4);

    const marginX = 70.87; // 25mm margin (standard DIN 5008)
    const rightMargin = width - 70.87;
    let y = height - 60;

    const drawText = (text: string, options: any = {}) => {
        const textFont = options.bold ? fontBold : font;
        const sanitized = sanitizeForPdf(text);
        
        try {
            page.drawText(sanitized, {
                x: options.x || marginX,
                y: options.y || y,
                size: options.size || 11,
                font: textFont,
                color: options.color || colorPrimary,
            });
        } catch (e) {
            console.error(`PDF Encoding Error for text "${text}":`, e);
            // Fallback: remove all non-ASCII if it still crashes
            const safeText = sanitized.replace(/[^\x00-\x7F]/g, "?");
            page.drawText(safeText, {
                x: options.x || marginX,
                y: options.y || y,
                size: options.size || 11,
                font: textFont,
                color: options.color || colorPrimary,
            });
        }

        if (!options.y) {
            y -= (options.lineHeight || 16);
        }
    };

    // --- 1. BRAND HEADER ---
    drawText('SOZIALER NAVIGATOR', { bold: true, size: 16, color: colorPrimary });
    y -= 2;
    drawText('Rechtssicherer Antragsservice & Ratgeber für Sozialleistungen', { size: 8, color: colorAccent });
    
    // Header Line
    page.drawLine({
        start: { x: marginX, y: y - 10 },
        end: { x: rightMargin, y: y - 10 },
        thickness: 0.5,
        color: colorPrimary,
        opacity: 0.15
    });

    // --- 2. SENDER (Upper Right - Information Block) ---
    y = height - 60;
    const senderX = width - 210;
    drawText(`${data.firstName} ${data.lastName}`, { x: senderX, y, bold: true }); y -= 14;
    if (data.street) { drawText(data.street, { x: senderX, y }); y -= 14; }
    if (data.zipCity) { drawText(data.zipCity, { x: senderX, y }); y -= 14; }
    drawText(`E-Mail: ${data.email}`, { x: senderX, y, size: 9, color: colorGray });

    // --- 3. RECIPIENT & SENDER RETURN LINE (DIN 5008 Window Position) ---
    y = height - 160;
    
    // Mini sender return line for window envelope
    const returnAddressText = `${data.firstName} ${data.lastName} · ${data.street} · ${data.zipCity}`;
    drawText(returnAddressText, { size: 7, y: y + 16, color: colorGray });
    page.drawLine({ start: { x: marginX, y: y + 13 }, end: { x: marginX + 240, y: y + 13 }, thickness: 0.2, color: colorGray });

    drawText(data.authority.name, { bold: true, y, size: 12 }); y -= 18;
    drawText(data.authority.street || 'Postfach / Zuständige Abteilung', { y }); y -= 15;
    drawText(data.authority.zipCity || '', { y });

    // --- 4. DATE ---
    const formattedDate = data.date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const dateText = `Datum: ${formattedDate}`;
    drawText(dateText, { x: rightMargin - font.widthOfTextAtSize(dateText, 11), y: height - 240 });

    // --- 5. SUBJECT (Clear and bold) ---
    y = height - 290;
    const rawLabel = (data.benefitLabel || '').toLowerCase();
    const isWohngeld = rawLabel.includes('wohngeld');
    const isBuergergeld = rawLabel.includes('b') && rawLabel.includes('rgergeld'); // Robust check
    const isGrundsicherung = rawLabel.includes('grundsicherung');

    let specificBenefit = data.benefitLabel;
    let specificLaw = 'den geltenden Sozialgesetzbüchern (SGB)';

    if (isWohngeld) {
        specificBenefit = 'Wohngeld';
        specificLaw = 'dem Wohngeldgesetz (WoGG)';
    } else if (isBuergergeld) {
        specificBenefit = 'Bürgergeld';
        specificLaw = 'dem Zweiten Buch Sozialgesetzbuch (SGB II)';
    } else if (isGrundsicherung) {
        specificBenefit = 'Grundsicherung';
        specificLaw = 'dem Zwölften Buch Sozialgesetzbuch (SGB XII)';
    }

    drawText(`Betreff: Formloser Antrag auf ${specificBenefit} zur Fristwahrung`, { bold: true, size: 13 });
    y -= 35;

    // --- 6. BODY CONTENT ---
    drawText('Sehr geehrte Damen und Herren,', { y }); y -= 35;

    const bodyParagraph1 = `hiermit stelle ich formlos einen Antrag auf Leistungen nach ${specificLaw} (Anspruch auf ${specificBenefit}) zur Wahrung der gesetzlichen Fristen.`;
    
    // Text Wrapping
    const wrapAndDraw = (text: string, maxWidth: number) => {
        const words = text.split(' ');
        let currentLine = '';
        for (const word of words) {
            const testLine = currentLine ? currentLine + ' ' + word : word;
            if (font.widthOfTextAtSize(testLine, 11) < maxWidth) {
                currentLine = testLine;
            } else {
                drawText(currentLine);
                currentLine = word;
            }
        }
        drawText(currentLine);
    };

    wrapAndDraw(bodyParagraph1, rightMargin - marginX);
    y -= 10;
    
    const bodyParagraph2 = `Dieser Antrag dient der Sicherung meiner Ansprüche mit sofortiger Wirkung für den aktuellen Kalendermonat.`;
    wrapAndDraw(bodyParagraph2, rightMargin - marginX);
    y -= 25;
    
    drawText('Um das Verfahren zeitnah abzuschließen, bitte ich Sie höflichst um:', { bold: true });
    y -= 15;
    drawText('1. Eine schriftliche Bestätigung über den Eingang dieses Antrags.');
    y -= 15;
    drawText('2. Die Zusendung der erforderlichen Antragsformulare sowie einer Liste der benötigten');
    y -= 15;
    drawText('   Nachweise an meine oben genannte Anschrift.');

    y -= 30;
    const bodyParagraph3 = `Vorsorglich weise ich darauf hin, dass dieser Antrag gemäß § 16 SGB I an den zuständigen Leistungsträger weiterzuleiten ist, sollten Sie örtlich oder sachlich nicht zuständig sein.`;
    wrapAndDraw(bodyParagraph3, rightMargin - marginX);

    y -= 40;
    drawText('Mit freundlichen Grüßen,');
    y -= 35;
    drawText(`${data.firstName} ${data.lastName}`, { bold: true, size: 12 });
    
    // Signature Line
    y -= 5;
    page.drawLine({
        start: { x: marginX, y },
        end: { x: marginX + 220, y },
        thickness: 0.5,
        color: colorPrimary,
        opacity: 0.4
    });
    y -= 15;
    drawText('(Dieses Schreiben wurde maschinell erstellt und ist ohne Unterschrift gültig)', { size: 7, color: colorGray });

    // --- 7. FOOTER ---
    const footerY = 40;
    page.drawLine({ start: { x: marginX, y: footerY + 15 }, end: { x: rightMargin, y: footerY + 15 }, thickness: 0.2, color: colorGray });
    
    page.drawText('Sozialer Navigator · www.sozialer-navigator.de', {
        x: marginX,
        y: footerY,
        size: 8,
        font,
        color: colorGray
    });

    const pageInfo = 'Seite 1 von 1';
    page.drawText(pageInfo, {
        x: rightMargin - font.widthOfTextAtSize(pageInfo, 8),
        y: footerY,
        size: 8,
        font,
        color: colorGray
    });

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
}
