import { Resend } from 'resend';

const RESEND_API_KEY = import.meta.env.RESEND_API_KEY || process.env.RESEND_API_KEY;

export async function sendEmail({ to, subject, html, attachments, cc, bcc }: {
    to: string | string[];
    subject: string;
    html: string;
    attachments?: any[];
    cc?: string | string[];
    bcc?: string | string[];
}) {
    if (!RESEND_API_KEY) {
        console.error('RESEND_API_KEY missing');
        throw new Error('Server Konfiguration Fehler: RESEND_API_KEY fehlt.');
    }

    const resend = new Resend(RESEND_API_KEY);

    // Ensure 'to' is an array if it's a single string, or keep it as is if Resend supports string
    // Resend .send() 'to' supports string | string[]

    try {
        const { data, error } = await resend.emails.send({
            from: 'Sozialer Navigator <info@sozialer-navigator.de>',
            to,
            cc,
            bcc,
            subject,
            html,
            attachments
        });

        if (error) {
            console.error('Resend API Error:', error);
            throw new Error(error.message);
        }

        console.log(`Email sent successfully to ${to}. ID: ${data?.id}`);
        return { success: true, id: data?.id };
    } catch (error) {
        console.error('Send Email Wrapper Error:', error);
        throw error;
    }
}
