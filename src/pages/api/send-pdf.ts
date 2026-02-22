export const prerender = false;
import type { APIRoute } from "astro";
import { sendEmail } from "../../lib/email";

export const POST: APIRoute = async ({ request }) => {
    try {
        const formData = await request.formData();
        const email = formData.get('email') as string;
        const pdfBlob = formData.get('pdf') as Blob;

        if (!email || !pdfBlob) {
            return new Response(JSON.stringify({ error: 'Email oder PDF fehlt.' }), { status: 400 });
        }

        const pdfBuffer = await pdfBlob.arrayBuffer();
        const pdfBase64 = Buffer.from(pdfBuffer);

        const result = await sendEmail({
            to: email,
            subject: 'Ihr Sozialer Navigator PDF-Paket',
            html: `
                <h1>Ihr angefordertes PDF-Paket</h1>
                <p>Vielen Dank für Ihre Anforderung.</p>
                <p>Anbei finden Sie die Checkliste und den Antrag als PDF.</p>
                <br>
                <p>Mit freundlichen Grüßen,</p>
                <p>Ihr Team vom Sozialen Navigator</p>
            `,
            attachments: [
                {
                    filename: 'Sozialer-Navigator-Checkliste-Antrag.pdf',
                    content: pdfBase64,
                },
            ],
        });

        return new Response(JSON.stringify({ success: true, id: result.id }), { status: 200 });

    } catch (error: any) {
        console.error('API Error:', error);
        return new Response(JSON.stringify({ error: 'Interner Server Fehler: ' + error.message }), { status: 500 });
    }
};
