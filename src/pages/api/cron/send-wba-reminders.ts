import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;
const RESEND_API_KEY = import.meta.env.RESEND_API_KEY || process.env.RESEND_API_KEY;

// Secret token to prevent unauthorized execution of this cron wrapper (used by Vercel)
const CRON_SECRET = import.meta.env.CRON_SECRET || process.env.CRON_SECRET;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const resend = new Resend(RESEND_API_KEY);

export const POST: APIRoute = async ({ request }) => {
    // 1. Authenticate Request
    const authHeader = request.headers.get('authorization');
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
    }

    try {
        const todayStr = new Date().toISOString().split('T')[0];
        console.log(`[CRON] Running WBA Reminder Campaign for ${todayStr}`);

        let emailsSent = 0;

        // 2a. Fetch "Reminder 1" (6 weeks before)
        const { data: leads1, error: err1 } = await supabase
            .from('wba_reminders')
            .select('*')
            .eq('reminder_date_1', todayStr)
            .eq('reminder_1_sent', false);

        if (err1) throw new Error(`Supabase query failed: ${err1.message}`);

        // 3a. Process "Reminder 1" Batch
        for (const lead of (leads1 || [])) {
            try {
                await resend.emails.send({
                    from: 'Sozialer Navigator <service@sozialer-navigator.de>',
                    to: [lead.email],
                    subject: 'Wichtig: Ihr Weiterbewilligungsantrag wird bald fällig',
                    html: `
                        <div style="font-family: Arial, sans-serif; color: #0a1628; max-width: 600px; margin: 0 auto; padding: 20px;">
                            <h2 style="color: #c5a67c;">WBA-Schutz: Ihr Bescheid läuft ab.</h2>
                            <p>Guten Tag ${lead.name || ''},</p>
                            <p>Sie haben unseren WBA-Schutz aktiviert. Dies ist eine automatische Erinnerung: Ihr aktueller Leistungsbescheid läuft in ca. 6 Wochen ab.</p>
                            <p>Um Zahlungsunterbrechungen zu vermeiden, sollten Sie <strong>jetzt</strong> Ihren Weiterbewilligungsantrag (WBA) beim zuständigen Jobcenter stellen.</p>
                            <p><a href="https://web.arbeitsagentur.de/portal/metasuche/suche/formulare" style="background-color: #0a1628; color: #c5a67c; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 2px; display: inline-block;">WBA Formular herunterladen</a></p>
                            <p>Wir melden uns in 4 Wochen noch einmal zur finalen Erinnerung bei Ihnen.</p>
                            <br/>
                            <p>Mit freundlichen Grüßen,<br/>Ihr Team vom Sozialen Navigator</p>
                        </div>
                    `
                });

                // Mark as sent in DB
                await supabase.from('wba_reminders').update({ reminder_1_sent: true }).eq('id', lead.id);
                emailsSent++;
            } catch (e) {
                console.error(`Failed to send reminder 1 to ${lead.email}:`, e);
            }
        }

        // 2b. Fetch "Reminder 2" (2 weeks before)
        const { data: leads2, error: err2 } = await supabase
            .from('wba_reminders')
            .select('*')
            .eq('reminder_date_2', todayStr)
            .eq('reminder_2_sent', false);

        if (err2) throw new Error(`Supabase query failed: ${err2.message}`);

        // 3b. Process "Reminder 2" Batch
        for (const lead of (leads2 || [])) {
            try {
                await resend.emails.send({
                    from: 'Sozialer Navigator <service@sozialer-navigator.de>', // Use verified domain
                    to: [lead.email],
                    subject: ' Letzte Erinnerung: Weiterbewilligungsantrag stellen!',
                    html: `
                        <div style="font-family: Arial, sans-serif; color: #0a1628; max-width: 600px; margin: 0 auto; padding: 20px;">
                            <h2 style="color: #c5a67c;">WBA-Schutz: Letzte Erinnerung</h2>
                            <p>Guten Tag ${lead.name || ''},</p>
                            <p>in ca. 2 Wochen läuft Ihr aktueller Leistungsbescheid ab. Haben Sie Ihren Weiterbewilligungsantrag bereits gestellt?</p>
                            <p>Falls nicht, ist dies die letzte Erinnerung. Ein verspäteter Antrag führt fast immer zu einer Lücke in den Zahlungen am Ersten des kommenden Monats.</p>
                            <p>Sobald Sie Ihren <strong>neuen</strong> Bescheid erhalten haben, können Sie diesen direkt bei uns von Experten auf Fehler prüfen lassen (fast 50% aller Bescheide sind fehlerhaft!).</p>
                            <p><a href="https://sozialer-navigator.de/bescheid-check" style="background-color: #c5a67c; color: #0a1628; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 2px; display: inline-block;">Neuen Bescheid prüfen lassen</a></p>
                            <br/>
                            <p>Mit freundlichen Grüßen,<br/>Ihr Team vom Sozialen Navigator</p>
                        </div>
                    `
                });

                // Mark as sent in DB
                await supabase.from('wba_reminders').update({ reminder_2_sent: true }).eq('id', lead.id);
                emailsSent++;
            } catch (e) {
                console.error(`Failed to send reminder 2 to ${lead.email}:`, e);
            }
        }

        return new Response(JSON.stringify({
            success: true,
            message: `WBA Cronjob completed. Processed ${leads1?.length || 0} Phase-1 leads and ${leads2?.length || 0} Phase-2 leads. Sent ${emailsSent} emails total.`
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('CRON Error executing WBA campaign:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
