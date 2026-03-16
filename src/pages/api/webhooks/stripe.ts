export const prerender = false;
import type { APIRoute } from "astro";
import Stripe from 'stripe';
import { sendEmail } from "../../../lib/email";
import { generateApplicationPdf } from "../../../lib/pdfGenerator";
import { createClient } from '@supabase/supabase-js';

// Initialize Configs
const STRIPE_SECRET_KEY = import.meta.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = import.meta.env.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET;
const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;

// Initialize Supabase Client (Make sure these exist, otherwise fallback or error)
const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY)
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

export const POST: APIRoute = async ({ request }) => {
    if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
        console.error("Missing Stripe Configuration");
        return new Response('Server Configuration Error', { status: 500 });
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
        apiVersion: '2025-02-24.acacia' as any,
    });

    const signature = request.headers.get('stripe-signature');
    if (!signature) {
        return new Response('No signature', { status: 400 });
    }

    let event;
    const isLocal = request.url.includes('localhost');

    try {
        const body = await request.text();

        if (isLocal) {
            // Bypass signature check in local dev because Astro parses the body 
            // and breaks the raw signature. We just parse the JSON directly.
            console.warn("⚠️ LOCAL DEV: Bypassing Stripe Signature Verification");
            event = JSON.parse(body);
        } else {
            event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
        }
    } catch (err: any) {
        console.error(`Webhook signature / parsing failed: ${err.message}`);
        return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    // Handle the Event
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;

        console.log(`Processing Checkout Session ${session.id}`);

        try {
            await handleCheckoutCompleted(session);
        } catch (error) {
            console.error('Error handling checkout completion:', error);
            // We return 200 to Stripe to avoid retries if it's a logic error, 
            // but we MUST log it and alert admin.
            await sendAdminAlert(session, error);
            return new Response('Error processing logic, but event received', { status: 200 });
        }
    }

    return new Response('Received', { status: 200 });
};

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const metadata = session.metadata || {};
    const { firstName, lastName, authority, authorityEmail, type, street, zipCity, benefitLabel } = metadata;
    const customerEmail = session.customer_details?.email || session.customer_email;

    if (type !== 'application_service') {
        console.log('Ignoring non-application webhook');
        return;
    }

    console.log(`Payment successful for ${firstName} ${lastName}. Formloser Antrag for ${authority}.`);

    // --- 0. IDEMPOTENCY & SUPABASE TRACKING SETUP ---
    // If Supabase is available, we use it to track the process.
    if (supabase) {
        // Step A: Check Idempotency (has this session already been processed?)
        const { data: existingApp } = await supabase
            .from('paid_applications')
            .select('id, status')
            .eq('stripe_session_id', session.id)
            .single();

        if (existingApp && ['COMPLETED', 'PDF_GENERATED', 'PAID'].includes(existingApp.status)) {
            console.log(`Webhook already processed for session ${session.id} (Status: ${existingApp.status}). Skipping.`);
            return; // Idempotent success
        }

        // Step B: Create initial tracked application
        const { error: insertError } = await supabase
            .from('paid_applications')
            .insert([{
                stripe_session_id: session.id,
                customer_name: `${firstName} ${lastName}`,
                customer_email: customerEmail,
                authority_name: authority,
                benefit_label: benefitLabel,
                status: 'PAID'
            }]);

        if (insertError) {
            console.error('Failed to create tracking row in Supabase:', insertError);
            // We proceed with the flow even if DB tracking fails, to not block the customer's PDF
        }
    }

    // --- 1. GENERATE PDF ---
    let pdfBuffer: Buffer | null = null;
    let pdfGenerationError = null;

    try {
        pdfBuffer = await generateApplicationPdf({
            firstName: firstName || '',
            lastName: lastName || '',
            email: customerEmail || '',
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
        console.log('PDF generated successfully server-side.');

        if (supabase) {
            await supabase.from('paid_applications').update({
                status: 'PDF_GENERATED',
                pdf_generated_at: new Date().toISOString()
            }).eq('stripe_session_id', session.id);
        }

    } catch (err: any) {
        console.error('Failed to generate PDF:', err);
        pdfGenerationError = err.message || 'Unknown PDF generation error';

        if (supabase) {
            await supabase.from('paid_applications').update({
                status: 'FAILED',
                error_log: `PDF Gen Error: ${pdfGenerationError}`
            }).eq('stripe_session_id', session.id);
        }
        // We will continue and alert Admin, but let's try to send what we have to the user.
    }

    // 2. EMAIL TO USER (Confirmation & Copy of outbox)
    const userAttachments = pdfBuffer ? [{
        filename: `Ihr_Antrag_${lastName}_${firstName}.pdf`,
        content: pdfBuffer,
    }] : [];

    await sendEmail({
        to: customerEmail!,
        subject: 'Zahlung bestätigt: Ihr Antrag beim Sozialen Navigator',
        html: `
            <h1>Vielen Dank, ${firstName}!</h1>
            <p>Wir haben Ihre Zahlung erhalten und den Prozess in Gang gesetzt.</p>
            <p>Ihr Antrag für <strong>${authority}</strong> lautet auf: ${benefitLabel}.</p>
            <br>
            ${pdfBuffer
                ? '<p>Anbei finden Sie eine Kopie des generierten Antrags, den wir in Ihrem Namen an die Behörde senden.</p>'
                : '<p style="color:red;"><strong>Hinweis:</strong> Bei der automatischen Erstellung Ihres PDFs gab es eine kurze Verzögerung. Unser Support-Team hat sich der Sache bereits angenommen und kümmert sich manuell um den Versand.</p>'
            }
            <br>
            <p><strong>Ihre übermittelten Daten:</strong></p>
            <ul>
                <li>Behörde: ${authority}</li>
                <li>E-Mail der Behörde: ${authorityEmail} (Versandziel)</li>
                <li>Ihre Adresse: ${street}, ${zipCity}</li>
            </ul>
            <p>Mit freundlichen Grüßen,</p>
            <p>Das Team vom Sozialen Navigator</p>
        `,
        attachments: userAttachments
    });

    // 3. EMAIL TO AUTHORITY (The actual application!)
    // If we have a working PDF and an email address, we send it straight to the authority.
    // 3. Send Official Application to Authority
    // SAFE TEST MODE: If we are on localhost, NEVER send to the real authority email!
    let targetAuthorityEmail = authorityEmail;

    if (process.env.TEST_AUTHORITY_EMAIL) {
        targetAuthorityEmail = process.env.TEST_AUTHORITY_EMAIL;
    }

    // Ultimate local kill-switch to prevent accidental live emails
    if (process.env.NODE_ENV === 'development' || !process.env.VERCEL_ENV) {
        console.warn('⚠️ LOCAL DEV MODE: Redirecting authority email directly to admin!');
        targetAuthorityEmail = 'info@sozialer-navigator.de';
    }

    let authoritySent = false;

    if (pdfBuffer && targetAuthorityEmail && targetAuthorityEmail.includes('@')) {
        try {
            await sendEmail({
                to: targetAuthorityEmail,
                cc: customerEmail!, // User in CC for legal proof
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
                }]
            });
            console.log(`Authority application sent directly to ${authorityEmail}`);
            authoritySent = true;
        } catch (err: any) {
            console.error(`Failed to send email to authority (${authorityEmail}):`, err);
        }
    }


    // 4. EMAIL TO ADMIN (Audit Trail & Fallback)
    const adminActionRequired = !authoritySent;
    const adminAttachments = pdfBuffer ? [{
        filename: `Kopie_Antrag_${lastName}_${firstName}.pdf`,
        content: pdfBuffer,
    }] : [];

    await sendEmail({
        to: 'info@sozialer-navigator.de',
        subject: `[${adminActionRequired ? 'FEHLER/MANUELL' : 'ERFOLGREICH'}] Neuer Auftrag: ${benefitLabel} - ${firstName} ${lastName}`,
        html: `
            <h2>${adminActionRequired ? '⚠️ ACTION REQUIRED: Konnte nicht an Amt gesendet werden!' : '✅ Erfolgreicher automatischer Versand'}</h2>
            <ul>
                <li><strong>Kunde:</strong> ${firstName} ${lastName}</li>
                <li><strong>Email:</strong> ${customerEmail}</li>
                <li><strong>Leistung:</strong> ${benefitLabel}</li>
                <li><strong>Amt:</strong> ${authority}</li>
                <li><strong>Amt Email:</strong> <a href="mailto:${authorityEmail}">${authorityEmail}</a></li>
                <li><strong>Kunden-Adresse:</strong> ${street}, ${zipCity}</li>
                <li><strong>Stripe Session:</strong> ${session.id}</li>
            </ul>
            ${pdfGenerationError ? `<p style="color:red;"><strong>PDF Generator Fehler:</strong> ${pdfGenerationError}</p>` : ''}
            <h3>Status:</h3>
            <p>
               PDF generiert: ${pdfBuffer ? 'JA' : 'NEIN'}<br>
               An Amt gesendet: ${authoritySent ? 'JA' : 'NEIN (Bitte manuell nachholen und PDF anhängen)'}<br>
               Bestätigung an Kunde: JA
            </p>
        `,
        attachments: adminAttachments
    });

    console.log('Webhook flow completed.');

    // --- Final Tracking Status Update ---
    if (supabase) {
        if (!pdfGenerationError && authoritySent) {
            await supabase.from('paid_applications').update({
                status: 'COMPLETED',
                completed_at: new Date().toISOString()
            }).eq('stripe_session_id', session.id);
        } else {
            // If manual action is required, update error log
            const errorMsg = pdfGenerationError || (!authoritySent ? 'Failed to send to authority email.' : 'Unknown Error');
            await supabase.from('paid_applications').update({
                status: 'FAILED',
                error_log: errorMsg
            }).eq('stripe_session_id', session.id);
        }
    }
}

async function sendAdminAlert(session: any, error: any) {
    try {
        await sendEmail({
            to: 'info@sozialer-navigator.de',
            subject: `[ALARM] Webhook Error for ${session.id}`,
            html: `
                <h1>Webhook Processing Failed</h1>
                <p>Error: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}</p>
                <p>Session: ${JSON.stringify(session)}</p>
            `
        });
    } catch (e) {
        console.error('Failed to send admin alert', e);
    }
}
