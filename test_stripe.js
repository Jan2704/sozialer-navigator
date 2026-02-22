import fetch from 'node-fetch';

const API_URL = 'http://localhost:4321/api/checkout/';

async function testStripe() {
    try {
        console.log("Testing Stripe Checkout Creation...");
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: "test@example.com",
                firstName: "Max",
                lastName: "Mustermann",
                authority: "Test Authority Berlin"
            })
        });

        const text = await response.text();

        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error("Failed to parse JSON response:", text);
        }

        console.log("Status:", response.status);
        if (data) {
            if (data.url) {
                console.log("✅ Success! Checkout URL generated:", data.url);
            } else {
                console.log("Response Data:", data);
                console.error("❌ Failed. No URL returned.");
            }
        }
    } catch (e) {
        console.error("Error:", e.message);
        console.log("ℹ️ Ensure dev server is running on port 4321");
    }
}

testStripe();
