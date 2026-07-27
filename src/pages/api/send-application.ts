export const prerender = false;
import type { APIRoute } from "astro";
import { sendEmail } from "../../lib/email";
import { generateApplicationPdf } from "../../lib/pdf-generator";

export const POST: APIRoute = async ({ request }) => {
    try {
        const data = await request.json();
        const { email, firstName, lastName, street, zipCity, benefitLabel, authority, authorityEmail } = data;

        if (!email || !firstName || !lastName || !authorityEmail) {
            return new Response(JSON.stringify({ error: 'Fehlende Daten (Name, E-Mail oder Behörde).' }), { status: 400 });
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
                        <p>${firstName} ${lastName}</p>
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
                <h1>Vielen Dank, ${firstName}!</h1>
                <p>Ihr Antrag für <strong>${authority}</strong> lautet auf: ${benefitLabel || 'Sozialleistungen'}.</p>
                <p>Anbei finden Sie eine Kopie des Antrags, den wir in Ihrem Namen an die Behörde gesendet haben.</p>
                <br>
                <p><strong>Ihre übermittelten Daten:</strong></p>
                <ul>
                    <li>Behörde: ${authority}</li>
                    <li>E-Mail der Behörde: ${authorityEmail} (Versandziel)</li>
                    <li>Ihre Adresse: ${street || ''}, ${zipCity || ''}</li>
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
                    <li><strong>Kunde:</strong> ${firstName} ${lastName}</li>
                    <li><strong>Email:</strong> ${email}</li>
                    <li><strong>Leistung:</strong> ${benefitLabel || 'Sozialleistungen'}</li>
                    <li><strong>Amt:</strong> ${authority}</li>
                    <li><strong>Amt Email:</strong> <a href="mailto:${authorityEmail}">${authorityEmail}</a></li>
                    <li><strong>Kunden-Adresse:</strong> ${street || ''}, ${zipCity || ''}</li>
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
