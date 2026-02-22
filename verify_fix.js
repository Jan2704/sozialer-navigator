import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const districtsPath = path.join(__dirname, 'src', 'data', 'city_districts.json');
const logPath = path.join(__dirname, 'verification_result.log');

try {
    const cityDistrictsData = JSON.parse(fs.readFileSync(districtsPath, 'utf8'));

    const findAuthorityInDB = (searchTerm) => {
        const term = searchTerm.toLowerCase().trim();
        for (const [cityKey, cityData] of Object.entries(cityDistrictsData)) {
            let matchedDistrict = null;
            if (cityData.districts) {
                // Check if term matches any PLZ in the array
                matchedDistrict = cityData.districts.find(d => d.plz.includes(term));
            }
            if (matchedDistrict) return matchedDistrict;
        }
        return null;
    };

    const testPLZs = [
        "10827", // Berlin Tempelhof-Schöneberg
        "13597", // Berlin Spandau
        "12043", // Berlin Neukölln
        "22303", // Hamburg-Nord
        "10115"  // Berlin Mitte
    ];

    const logs = [];
    logs.push("---------------------------------------------------");
    logs.push("VERIFYING MISSING DISTRICTS FIX");
    logs.push("---------------------------------------------------");

    let allFound = true;
    testPLZs.forEach(plz => {
        const result = findAuthorityInDB(plz);
        if (result) {
            logs.push(`✅ PLZ ${plz} found: ${result.name}`);
        } else {
            logs.push(`❌ PLZ ${plz} NOT FOUND`);
            allFound = false;
        }
    });
    logs.push("---------------------------------------------------");

    fs.writeFileSync(logPath, logs.join('\n'), 'utf8');
    console.log("Verification complete. Log written.");

} catch (err) {
    console.error("Error:", err);
    fs.writeFileSync(logPath, `CRITICAL ERROR: ${err.message}`, 'utf8');
}
