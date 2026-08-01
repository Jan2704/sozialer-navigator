export const prerender = false; // Disable prereader for dynamic API route
import type { APIRoute, APIContext } from "astro";
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, rateLimitResponse } from '../../lib/rate-limit';

// Environment variables (ensure these are set in your .env or platform)
const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;
const MAKE_WEBHOOK_URL = "https://hook.eu1.make.com/b62o727sba6wjwjbbbpmbqbq35tkctf8"; // Server-side only

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const stripControlChars = (str: string) => str.replace(/[\r\n]/g, '').trim();

export const POST: APIRoute = async ({ request }: APIContext) => {
    const rl = checkRateLimit(request, { limit: 10, windowMs: 60_000, scope: 'leads' });
    if (!rl.allowed) {
        return rateLimitResponse(rl.retryAfterSeconds);
    }

    try {
        const data = await request.json();

        const first_name = data.first_name ? stripControlChars(String(data.first_name)) : data.first_name;
        const last_name = data.last_name ? stripControlChars(String(data.last_name)) : data.last_name;
        const email = data.email ? stripControlChars(String(data.email)) : data.email;
        const interest = data.interest ? stripControlChars(String(data.interest)) : data.interest;
        const city = data.city ? stripControlChars(String(data.city)) : data.city;
        const modal_type = data.modal_type ? stripControlChars(String(data.modal_type)) : data.modal_type;
        const partner_vertical = data.partner_vertical ? stripControlChars(String(data.partner_vertical)) : data.partner_vertical;
        const phone = data.phone ? stripControlChars(String(data.phone)) : data.phone;

        if (!first_name || !email || !interest || !modal_type) {
            return new Response(JSON.stringify({ error: 'Fehlende Daten (Name, E-Mail, Interesse oder Modal-Typ).' }), { status: 400 });
        }

        if (!EMAIL_REGEX.test(email)) {
            return new Response(JSON.stringify({ error: 'Ungültige E-Mail-Adresse.' }), { status: 400 });
        }

        // 1. Insert into Supabase
        const { error } = await supabase
            .from('leads')
            .insert([
                {
                    first_name,
                    last_name,
                    email,
                    phone: phone || null,
                    interest,
                    city: city || 'Unbekannt',
                    source: data.source || 'website-api',
                    modal_type,
                    // Partner / Monetization Fields
                    partner_vertical: partner_vertical || null, // 'legal', 'coaching', etc.
                    consent_partner_transfer: data.consent_partner_transfer || false
                }
            ]);

        if (error) {
            console.error('Supabase Error:', error);
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }

        // 2. Send to Make.com Webhook (Fire & Forget or Await)
        // We use fetch server-side so usage is hidden from client
        if (MAKE_WEBHOOK_URL) {
            try {
                await fetch(MAKE_WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...data,
                        first_name,
                        last_name,
                        email,
                        phone,
                        interest,
                        city,
                        modal_type,
                        partner_vertical,
                        submitted_at: new Date().toISOString(),
                        source: 'leads-api'
                    })
                });
            } catch (webhookError) {
                console.error('Webhook Trigger Failed:', webhookError);
                // We don't fail the request if webhook fails, as data is safe in DB
            }
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 });

    } catch (err) {
        console.error('API Error:', err);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }
}
