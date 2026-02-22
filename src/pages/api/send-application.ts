export const prerender = false;
import type { APIRoute } from "astro";
import { sendEmail } from "../../lib/email";

export const POST: APIRoute = async ({ request }) => {
    try {
        const formData = await request.formData();
        const userEmail = formData.get('userEmail') as string;
        const authorityEmail = formData.get('authorityEmail') as string;
        const pdfBlob = formData.get('pdf') as Blob;
        const firstName = formData.get('firstName') as string;
        const lastName = formData.get('lastName') as string;

        if (!userEmail || !authorityEmail || !pdfBlob) {
            return new Response(JSON.stringify({ error: 'Fehlende Daten (Email oder PDF).' }), { status: 400 });
        }

        const pdfBuffer = await pdfBlob.arrayBuffer();
        const pdfBase64 = Buffer.from(pdfBuffer);

        // 1. Send to Authority (Official Application)
        // SAFE TEST MODE: Ultimate local kill-switch to prevent accidental live emails
        let targetAuthorityEmail = authorityEmail;
        if (process.env.TEST_AUTHORITY_EMAIL) {
            targetAuthorityEmail = process.env.TEST_AUTHORITY_EMAIL;
        }
        if (process.env.NODE_ENV === 'development' || !process.env.VERCEL_ENV) {
            console.warn('⚠️ LOCAL DEV MODE: Redirecting authority email directly to admin!');
            targetAuthorityEmail = 'info@sozialer-navigator.de';
        }

        const authorityResult = await sendEmail({
            to: targetAuthorityEmail,
            cc: userEmail, // User in CC for legal proof
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
                    Dieser Antrag wurde über den Sozialen Navigator (www.sozialer-navigator.de) erstellt und versendet.<br>
                    Zeitstempel des Versands: ${new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}
                </p>
            `,
            attachments: [
                {
                    filename: `Antrag_Sozialleistungen_${lastName}_${firstName}.pdf`,
                    content: pdfBase64,
                },
            ],
        });

        // Log sucess for potential audit trail (console for now, DB later maybe)
        console.log(`Application sent. ID: ${authorityResult.id} | User: ${userEmail} | Auth: ${authorityEmail}`);

        return new Response(JSON.stringify({ success: true, id: authorityResult.id }), { status: 200 });

    } catch (error: any) {
        console.error('API Error (Send Application):', error);
        return new Response(JSON.stringify({ error: 'Interner Server Fehler: ' + error.message }), { status: 500 });
    }
};
