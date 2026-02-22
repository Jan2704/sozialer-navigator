import fs from 'fs';
import path from 'path';

// Wir nutzen den globalen fetch, wenn verfügbar (Node 18+), ansonsten node-fetch-Fallback
const fetchFn = typeof fetch !== 'undefined' ? fetch : (await import('node-fetch')).default;
const FormDataConstructor = typeof FormData !== 'undefined' ? FormData : (await import('form-data')).default;
const BlobConstructor = typeof Blob !== 'undefined' ? Blob : null;

const API_URL_BASE = 'http://localhost:4321/api';

const logFile = 'debug_infrastructure_log.txt';

// Helfer für das Logging
const log = (msg) => {
    const time = new Date().toISOString();
    const formatted = `[${time}] INFO: ${msg}`;
    console.log(formatted);
    fs.appendFileSync(logFile, formatted + '\n');
};

const errorLog = (msg) => {
    const time = new Date().toISOString();
    const formatted = `[${time}] ERROR: ${msg}`;
    console.error(formatted);
    fs.appendFileSync(logFile, formatted + '\n');
};

// Initialisiere Log-Datei
if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
log("=== Starte autonomen Backend- und Infrastruktur-Test ===");

async function checkServer() {
    try {
        const res = await fetchFn(API_URL_BASE.replace('/api', '/'));
        if (res.ok) {
            log("✅ Lokaler Dev-Server läuft und ist erreichbar.");
            return true;
        } else {
            errorLog(`⚠️ Dev-Server liefert Status ${res.status}.`);
            return false;
        }
    } catch (e) {
        errorLog(`❌ Ping zum Dev-Server fehlgeschlagen: ${e.message}`);
        errorLog("Stelle sicher, dass 'npm run dev' läuft.");
        return false;
    }
}

async function testLeadAPI() {
    log("--- Starte Test: Leads API (/api/leads) ---");
    try {
        const response = await fetchFn(`${API_URL_BASE}/leads/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                first_name: "Autonomer",
                last_name: "Bot",
                email: "test-bot@example.com",
                interest: "Debugging",
                city: "System",
                modal_type: "debug",
                source: "debug-script"
            })
        });

        const text = await response.text();
        let data;
        try { data = JSON.parse(text); } catch (e) { }

        if (response.ok) {
            log(`✅ Leads API erfolgreich (Status ${response.status}). Supabase & Webhook Trigger vermutlich erfolgreich.`);
            if (data) log(`   Antwort: JSON mit keys: ${Object.keys(data).join(', ')}`);
        } else {
            errorLog(`❌ Leads API fehlgeschlagen (Status ${response.status}).`);
            errorLog(`   Raw Output: ${text}`);
            if (response.status === 404) errorLog("   Tipp: Ist der Pfad korrekt? Fehlt der Trailing Slash oder ist die Datei verschoben?");
        }
    } catch (e) {
        errorLog(`❌ Leads API Netzwerkfehler: ${e.message}`);
    }
}

async function testStripeAPI() {
    log("--- Starte Test: Stripe Checkout API (/api/checkout) ---");
    try {
        const response = await fetchFn(`${API_URL_BASE}/checkout/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: "test-bot@example.com",
                firstName: "Autonomer",
                lastName: "Bot",
                authority: "Test-Amt Berlin"
            })
        });

        const text = await response.text();
        let data;
        try { data = JSON.parse(text); } catch (e) { }

        if (response.ok) {
            if (data && data.url) {
                log(`✅ Stripe API erfolgreich (Status ${response.status}). Session ID generiert.`);
                log(`   URL: ${data.url}`);
            } else {
                errorLog(`⚠️ Stripe API liefert Status 200, aber keine 'url' im JSON.`);
                log(`   Antwort: ${text}`);
            }
        } else {
            errorLog(`❌ Stripe API fehlgeschlagen (Status ${response.status}).`);
            errorLog(`   Fehlermeldung: ${text}`);
            if (text.includes("STRIPE_SECRET_KEY fehlt")) {
                errorLog("   Tipp: Die .env Datei hat keinen STRIPE_SECRET_KEY definiert.");
            }
        }
    } catch (e) {
        errorLog(`❌ Stripe API Netzwerkfehler: ${e.message}`);
    }
}

async function testEmailPDFAPI() {
    log("--- Starte Test: PDF & Email API (/api/send-pdf) ---");
    try {
        const form = new FormDataConstructor();
        form.append('email', 'test-bot@example.com');

        // Simuliere einen kleinen PDF-Blob
        const dummyPdfContent = "%PDF-1.4\n1 0 obj\n<<...dummy...>>\nendobj\n";

        let pdfBlob;
        if (BlobConstructor) {
            pdfBlob = new BlobConstructor([dummyPdfContent], { type: 'application/pdf' });
            form.append('pdf', pdfBlob, 'test.pdf');
        } else {
            // Fallback für alte Node-Versionen, Node-Fetch FormData hat .append mit Buffer
            form.append('pdf', Buffer.from(dummyPdfContent), {
                filename: 'test.pdf',
                contentType: 'application/pdf'
            });
        }

        const response = await fetchFn(`${API_URL_BASE}/send-pdf/`, {
            method: 'POST',
            body: form
        });

        const text = await response.text();
        let data;
        try { data = JSON.parse(text); } catch (e) { }

        if (response.ok) {
            log(`✅ Email & PDF API erfolgreich (Status ${response.status}). Resend wurde getriggert.`);
            if (data) log(`   Antwort: ${JSON.stringify(data)}`);
        } else {
            errorLog(`❌ Email/PDF API fehlgeschlagen (Status ${response.status}).`);
            errorLog(`   Fehlermeldung: ${text}`);
            if (response.status === 404) {
                errorLog("   Tipp: Routen-Pfad (404) nicht gefunden.");
            }
        }
    } catch (e) {
        errorLog(`❌ Email/PDF API Netzwerkfehler: ${e.message}`);
    }
}

async function runAll() {
    log("Prüfe Server-Erreichbarkeit...");
    const isUp = await checkServer();
    if (!isUp) {
        log("Breche Tests ab, da der Server nicht erreichbar ist.");
        return;
    }

    log("\n");
    await testLeadAPI();

    log("\n");
    await testStripeAPI();

    log("\n");
    await testEmailPDFAPI();

    log("\n=== Autonomer Testdurchlauf abgeschlossen ===");
    log("Ausführlichere Error-Logs sind in debug_infrastructure_log.txt gepspeichert.");
}

runAll();
