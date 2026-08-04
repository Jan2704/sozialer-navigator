export const prerender = false;
import type { APIRoute } from "astro";
import Stripe from 'stripe';
import { checkRateLimit, rateLimitResponse } from "../../lib/rate-limit";

const STRIPE_SECRET_KEY = import.meta.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const POST: APIRoute = async ({ request, url }) => {
    const rl = checkRateLimit(request, { limit: 5, windowMs: 60_000, scope: 'checkout' });
    if (!rl.allowed) {
        return rateLimitResponse(rl.retryAfterSeconds);
    }

    if (!STRIPE_SECRET_KEY) {
        return new Response(JSON.stringify({ error: 'Server Konfiguration Fehler: STRIPE_SECRET_KEY fehlt.' }), { status: 500 });
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
        apiVersion: '2025-02-24.acacia' as any, // Updated to match likely latest types or suppress
    });

    try {
        const data = await request.json();
        const stripControlChars = (value: unknown) =>
            typeof value === 'string' ? value.replace(/[\r\n]+/g, ' ').trim() : value;
        const email = stripControlChars(data.email);
        const firstName = stripControlChars(data.firstName);
        const lastName = stripControlChars(data.lastName);
        const authority = stripControlChars(data.authority);
        const authorityEmail = stripControlChars(data.authorityEmail);
        const street = stripControlChars(data.street);
        const zipCity = stripControlChars(data.zipCity);
        const benefitLabel = stripControlChars(data.benefitLabel);

        if (!email || !firstName || !lastName || !authority || !authorityEmail) {
            return new Response(JSON.stringify({ error: 'Fehlende Daten (Name, E-Mail oder Behörde).' }), { status: 400 });
        }

        if (!EMAIL_REGEX.test(email) || !EMAIL_REGEX.test(authorityEmail)) {
            return new Response(JSON.stringify({ error: 'Ungültige E-Mail-Adresse.' }), { status: 400 });
        }

        const origin = url.origin;

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card', 'paypal', 'sofort', 'sepa_debit'],
            line_items: [
                {
                    price_data: {
                        currency: 'eur',
                        product_data: {
                            name: 'Antragsservice Sozialer Navigator',
                            description: `Erstellung und Versand an: ${authority}`,
                        },
                        unit_amount: 599, // 5,99 €
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            customer_email: email,
            success_url: `${origin}/erfolg/?session_id={CHECKOUT_SESSION_ID}&name=${encodeURIComponent(firstName + ' ' + lastName)}&summe=5.99`,
            cancel_url: `${origin}/abbruch/`,
            metadata: {
                firstName: firstName,
                lastName: lastName,
                street: street || '',
                zipCity: zipCity || '',
                benefitLabel: benefitLabel || 'Sozialleistungen',
                authority: authority,
                authorityEmail: authorityEmail, // Pass email to webhook
                type: 'application_service'
            },
        });

        return new Response(JSON.stringify({ url: session.url }), { status: 200 });
    } catch (error: any) {
        console.error('Stripe Error:', error);
        return new Response(JSON.stringify({ error: 'Interner Fehler beim Erstellen der Checkout-Sitzung.' }), { status: 500 });
    }
};
