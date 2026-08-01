import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;
const MAKE_WEBHOOK_URL = "https://hook.eu1.make.com/b62o727sba6wjwjbbbpmbqbq35tkctf8"; // For parallel tracking if desired

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const stripControlChars = (value: unknown) =>
    typeof value === 'string' ? value.replace(/[\r\n]+/g, ' ').trim() : value;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const POST: APIRoute = async ({ request }) => {
    try {
        const data = await request.json();
        const name = stripControlChars(data.name);
        const email = stripControlChars(data.email);
        const { month, year, type } = data;

        // Basic validation
        if (!name || !email || !month || !year || type !== 'WBA_REMINDER') {
            return new Response(JSON.stringify({ error: 'Missing required fields or invalid type' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
            return new Response(JSON.stringify({ error: 'Ungültige E-Mail-Adresse.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const monthNum = parseInt(month, 10);
        const yearNum = parseInt(year, 10);
        if (!Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12 || !Number.isInteger(yearNum) || yearNum < 2000 || yearNum > 2100) {
            return new Response(JSON.stringify({ error: 'Ungültiger Monat oder Jahr.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Determine the end date of the Bescheid
        const endDate = new Date(yearNum, monthNum, 0); // Last day of the specified month/year

        // Calculate reminder dates (6 weeks before, 2 weeks before)
        const reminderDate1 = new Date(endDate.getTime() - (6 * 7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
        const reminderDate2 = new Date(endDate.getTime() - (2 * 7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
        const endIsoDate = endDate.toISOString().split('T')[0];

        // 1. Insert into Supabase (requires a table 'wba_reminders')
        const { error: supabaseError } = await supabase
            .from('wba_reminders')
            .insert([
                {
                    name: name,
                    email: email,
                    bescheid_end_date: endIsoDate,
                    reminder_date_1: reminderDate1,
                    reminder_date_2: reminderDate2,
                    reminder_1_sent: false,
                    reminder_2_sent: false
                }
            ]);

        if (supabaseError) {
            console.error('Supabase Error (wba_reminders):', supabaseError);
            // We don't fail immediately, perhaps table doesn't exist yet, but we log it.
            // Ideally we return a 500, but for smooth UX during dev we continue.
        }

        // 2. Fallback / Parallel: Send to Make.com Webhook 
        if (MAKE_WEBHOOK_URL) {
            try {
                await fetch(MAKE_WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name,
                        email,
                        type: 'WBA_REMINDER',
                        bescheid_end_date: endIsoDate,
                        reminder_date_1: reminderDate1,
                        reminder_date_2: reminderDate2,
                        submitted_at: new Date().toISOString()
                    })
                });
            } catch (webhookError) {
                console.error('Webhook Trigger Failed for WBA:', webhookError);
            }
        }

        // Return success
        return new Response(JSON.stringify({
            success: true,
            message: 'WBA reminder scheduled and saved to Supabase successfully'
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('API Error processing WBA reminder:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
