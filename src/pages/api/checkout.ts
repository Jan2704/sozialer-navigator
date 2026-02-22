export const prerender = false;
import type { APIRoute } from "astro";
import Stripe from 'stripe';

const STRIPE_SECRET_KEY = import.meta.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;

export const POST: APIRoute = async ({ request, url }) => {
    if (!STRIPE_SECRET_KEY) {
        return new Response(JSON.stringify({ error: 'Server Konfiguration Fehler: STRIPE_SECRET_KEY fehlt.' }), { status: 500 });
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
        apiVersion: '2025-02-24.acacia' as any, // Updated to match likely latest types or suppress
    });

    try {
        const data = await request.json();
        const { email, firstName, lastName, authority, authorityEmail, street, zipCity, benefitLabel } = data;

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
                        unit_amount: 999, // 9,99 €
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            customer_email: email,
            success_url: `${origin}/erfolg/?session_id={CHECKOUT_SESSION_ID}&name=${encodeURIComponent(firstName + ' ' + lastName)}&summe=9.99`,
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
        return new Response(JSON.stringify({ error: error.message || 'Interner Fehler' }), { status: 500 });
    }
};
