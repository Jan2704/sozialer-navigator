export const prerender = false;
import type { APIRoute } from "astro";
import { sendEmail, escapeHtml } from "../../lib/email";
import { generateApplicationPdf } from "../../lib/pdf-generator";
import { getClientIp, isRateLimited } from "../../lib/rate-limit";

export const POST: APIRoute = async ({ request }) => {
    try {
        const ip = getClientIp(request);
        if (isRateLimited(`send-application:${ip}`, 5, 10 * 60_000)) {
            return new Response(JSON.stringify({ error: 'Zu viele Anträge von dieser Verbindung. Bitte versuche es später erneut.' }), { status: 429 });
        }

        const data = await request.json();
        const { email, firstName, lastName, street, zipCity, benefitLabel, authority, authorityEmail } = data;

        if (!email || !firstName || !lastName || !authorityEmail) {
            return new Response(JSON.stringify({ error: 'Fehlende Daten (Name, E-Mail oder Behörde).' }), { status: 400 });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authorityEmail)) {
            return new Response(JSON.stringify({ error: 'Ungültige E-Mail-Adresse.' }), { status: 400 });
        }

        // Escaped copies for HTML interpolation — raw values still used for the PDF/filenames.
        const safeFirstName = escapeHtml(firstName);
        const safeLastName = escapeHtml(lastName);
        const safeStreet = escapeHtml(street);
        const safeZipCity = escapeHtml(zipCity);
        const safeBenefitLabel = escapeHtml(benefitLabel || 'Sozialleistungen');
        const safeAuthority = escapeHtml(authority);
        const safeAuthorityEmail = escapeHtml(authorityEmail);

        const pdfBuffer = await generateApplicationPdf({
            firstName,
            lastName,
            email,
            street: street || '',
            zipCity: zipCity || '',
            benefitLabel: benefitLabel || 'Sozialleistungen',
            authority: {
                name: authority || 'Zuständige Behörde',
                street: '',
                zipCity: ''
            },
            date: new Date()
        });

        // SAFE TEST MODE: Ultimate local kill-switch to prevent accidental live emails
        let targetAuthorityEmail = authorityEmail;
        if (process.env.TEST_AUTHORITY_EMAIL) {
            targetAuthorityEmail = process.env.TEST_AUTHORITY_EMAIL;
        }
        if (process.env.NODE_ENV === 'development' || !process.env.VERCEL_ENV) {
            console.warn('⚠️ LOCAL DEV MODE: Redirecting authority email directly to admin!');
            targetAuthorityEmail = 'info@sozialer-navigator.de';
        }

        let authoritySent = false;
        if (targetAuthorityEmail && targetAuthorityEmail.includes('@')) {
            try {
                await sendEmail({
                    to: targetAuthorityEmail,
                    cc: email, // User in CC for legal proof
                    subject: `WICHTIG: Formloser Antrag auf Sozialleistungen - ${lastName}, ${firstName}`,
                    html: `
                        <p>Sehr geehrte Damen und Herren,</p>
                        <p>anbei erhalten Sie meinen formlosen Antrag auf Sozialleistungen zur Fristwahrung.</p>
                        <p>Bitte bestätigen Sie mir den Eingang dieses Antrags und den Zeitpunkt des Eingangs.</p>
                        <br>
                        <p>Mit freundlichen Grüßen,</p>
                        <p>${safeFirstName} ${safeLastName}</p>
                        <br>
                        <hr>
                        <p style="font-size: 10px; color: #666;">
                            Dieser Antrag wurde zur Fristwahrung über den unabhängigen Service Sozialer Navigator (www.sozialer-navigator.de) erstellt und versendet.<br>
                            Zeitstempel des Versands: ${new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}
                        </p>
                    `,
                    attachments: [{
                        filename: `Antrag_Sozialleistungen_${lastName}_${firstName}.pdf`,
                        content: pdfBuffer,
                    }],
                });
                authoritySent = true;
            } catch (err: any) {
                console.error(`Failed to send email to authority (${authorityEmail}):`, err);
            }
        }

        // Confirmation copy to the applicant
        await sendEmail({
            to: email,
            subject: 'Ihr Antrag beim Sozialen Navigator wurde versendet',
            html: `
                <h1>Vielen Dank, ${safeFirstName}!</h1>
                <p>Ihr Antrag für <strong>${safeAuthority}</strong> lautet auf: ${safeBenefitLabel}.</p>
                <p>Anbei finden Sie eine Kopie des Antrags, den wir in Ihrem Namen an die Behörde gesendet haben.</p>
                <br>
                <p><strong>Ihre übermittelten Daten:</strong></p>
                <ul>
                    <li>Behörde: ${safeAuthority}</li>
                    <li>E-Mail der Behörde: ${safeAuthorityEmail} (Versandziel)</li>
                    <li>Ihre Adresse: ${safeStreet}, ${safeZipCity}</li>
                </ul>
                <p>Mit freundlichen Grüßen,</p>
                <p>Das Team vom Sozialen Navigator</p>
            `,
            attachments: [{
                filename: `Ihr_Antrag_${lastName}_${firstName}.pdf`,
                content: pdfBuffer,
            }],
        });

        // Audit trail to admin
        await sendEmail({
            to: 'info@sozialer-navigator.de',
            subject: `[${authoritySent ? 'ERFOLGREICH' : 'MANUELL'}] Neuer kostenloser Antrag: ${benefitLabel || 'Sozialleistungen'} - ${firstName} ${lastName}`,
            html: `
                <ul>
                    <li><strong>Kunde:</strong> ${safeFirstName} ${safeLastName}</li>
                    <li><strong>Email:</strong> ${escapeHtml(email)}</li>
                    <li><strong>Leistung:</strong> ${safeBenefitLabel}</li>
                    <li><strong>Amt:</strong> ${safeAuthority}</li>
                    <li><strong>Amt Email:</strong> <a href="mailto:${safeAuthorityEmail}">${safeAuthorityEmail}</a></li>
                    <li><strong>Kunden-Adresse:</strong> ${safeStreet}, ${safeZipCity}</li>
                </ul>
                <p>An Amt gesendet: ${authoritySent ? 'JA' : 'NEIN (bitte manuell nachholen)'}</p>
            `,
            attachments: [{
                filename: `Kopie_Antrag_${lastName}_${firstName}.pdf`,
                content: pdfBuffer,
            }],
        });

        return new Response(JSON.stringify({ success: true }), { status: 200 });

    } catch (error: any) {
        console.error('API Error (Send Application):', error);
        return new Response(JSON.stringify({ error: 'Interner Server Fehler: ' + error.message }), { status: 500 });
    }
};
