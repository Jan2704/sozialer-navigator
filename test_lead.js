import fetch from 'node-fetch';
import fs from 'fs';

const API_URL = 'http://localhost:4321/api/leads/';

// Replace console.log with a custom logger that writes to file + console
const logFile = 'test_lead_output.txt';
const log = (msg) => {
    console.log(msg);
    fs.appendFileSync(logFile, msg + '\n');
};
const error = (msg) => {
    console.error(msg);
    fs.appendFileSync(logFile, 'ERROR: ' + msg + '\n');
};

if (fs.existsSync(logFile)) fs.unlinkSync(logFile);

async function testLead() {
    try {
        log("Testing Lead Submission...");
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                first_name: "Test",
                last_name: "User",
                email: "test@example.com",
                interest: "General",
                city: "Berlin",
                modal_type: "avgs",
                source: "test-script"
            })
        });

        const text = await response.text();
        log("Raw Response: " + text);

        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            error("Failed to parse JSON response.");
        }

        log("Status: " + response.status);
        if (data) log("Response Data: " + JSON.stringify(data, null, 2));

        if (response.ok) {
            log("✅ Lead submitted successfully.");
        } else {
            error("❌ Submission failed.");
        }
    } catch (e) {
        error("Error: " + e.message);
        log("ℹ️ Ensure dev server is running on port 4321");
    }
}

testLead();
