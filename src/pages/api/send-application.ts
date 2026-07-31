export const prerender = false;
import type { APIRoute } from "astro";
import { sendEmail } from "../../lib/email";
import { generateApplicationPdf } from "../../lib/pdf-generator";
import { escapeHtml } from "../../lib/html-escape";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const POST: APIRoute = async ({ request }) => {
    try {
        const data = await request.json();
        const stripControlChars = (value: unknown) =>
            typeof value === 'string' ? value.replace(/[\r\n]+/g, ' ').trim() : value;
        const email = stripControlChars(data.email);
        const firstName = stripControlChars(data.firstName);
        const lastName = stripControlChars(data.lastName);
        const street = stripControlChars(data.street);
        const zipCity = stripControlChars(data.zipCity);
        const benefitLabel = stripControlChars(data.benefitLabel);
        const authority = stripControlChars(data.authority);
        const authorityEmail = stripControlChars(data.authorityEmail);

        if (!email || !firstName || !lastName || !authorityEmail) {
            return new Response(JSON.stringify({ error: 'Fehlende Daten (Name, E-Mail oder Behörde).' }), { status: 400 });
        }

        if (!EMAIL_REGEX.test(email) || !EMAIL_REGEX.test(authorityEmail)) {
            return new Response(JSON.stringify({ error: 'Ungültige E-Mail-Adresse.' }), { status: 400 });
        }

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
                        <p>${escapeHtml(firstName)} ${escapeHtml(lastName)}</p>
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
                <h1>Vielen Dank, ${escapeHtml(firstName)}!</h1>
                <p>Ihr Antrag für <strong>${escapeHtml(authority)}</strong> lautet auf: ${escapeHtml(benefitLabel || 'Sozialleistungen')}.</p>
                <p>Anbei finden Sie eine Kopie des Antrags, den wir in Ihrem Namen an die Behörde gesendet haben.</p>
                <br>
                <p><strong>Ihre übermittelten Daten:</strong></p>
                <ul>
                    <li>Behörde: ${escapeHtml(authority)}</li>
                    <li>E-Mail der Behörde: ${escapeHtml(authorityEmail)} (Versandziel)</li>
                    <li>Ihre Adresse: ${escapeHtml(street || '')}, ${escapeHtml(zipCity || '')}</li>
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
                    <li><strong>Kunde:</strong> ${escapeHtml(firstName)} ${escapeHtml(lastName)}</li>
                    <li><strong>Email:</strong> ${escapeHtml(email)}</li>
                    <li><strong>Leistung:</strong> ${escapeHtml(benefitLabel || 'Sozialleistungen')}</li>
                    <li><strong>Amt:</strong> ${escapeHtml(authority)}</li>
                    <li><strong>Amt Email:</strong> <a href="mailto:${escapeHtml(authorityEmail)}">${escapeHtml(authorityEmail)}</a></li>
                    <li><strong>Kunden-Adresse:</strong> ${escapeHtml(street || '')}, ${escapeHtml(zipCity || '')}</li>
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
