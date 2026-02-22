import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define paths to data files
const districtsPath = path.join(__dirname, 'src', 'data', 'city_districts.json');
const citiesPath = path.join(__dirname, 'src', 'data', 'cities_2026.json');
const logPath = path.join(__dirname, 'verification_failures.log');

console.log(`Loading data...`);

try {
    // Read and parse data
    const cityDistrictsData = JSON.parse(fs.readFileSync(districtsPath, 'utf8'));
    const citiesData = JSON.parse(fs.readFileSync(citiesPath, 'utf8'));

    // Re-implement the search logic from AuthorityApp.jsx (Critical: Keep in sync)
    const findAuthorityInDB = (searchTerm) => {
        if (!searchTerm || searchTerm.length < 2) return null;

        const term = searchTerm.toLowerCase().trim();

        // 1. Check Granular District Data
        for (const [cityKey, cityData] of Object.entries(cityDistrictsData)) {
            const isCityMatch = term.includes(cityKey);

            let matchedDistrict = null;
            if (cityData.districts) {
                // Check if ANY PLZ in the district array includes the search term (which is likely a full PLZ)
                matchedDistrict = cityData.districts.find(d => d.plz.includes(term));
            }

            if (matchedDistrict) {
                return matchedDistrict;
            }

            if (isCityMatch) {
                return cityData.default;
            }
        }

        // 2. Standard Search
        const match = citiesData.find(c =>
            c.stadt.toLowerCase().includes(term) ||
            c.plz.startsWith(term)
        );

        if (match) {
            return {
                name: match.amt_name || `Wohngeldstelle ${match.stadt}`,
                street: match.amt_adresse || `${match.stadt} Zentrum`,
                zipCity: match.plz ? `${match.plz} ${match.stadt}` : match.stadt,
                email: match.amt_email || 'Nicht verfügbar',
                phone: ''
            };
        }
        return null;
    };

    let totalTests = 0;
    let failedTests = 0;
    const failures = [];

    console.log("---------------------------------------------------");
    console.log("COMPREHENSIVE AUTHORITY VERIFICATION");
    console.log("---------------------------------------------------");

    // TEST 1: Verify all cities in cities_2026.json via PLZ
    console.log(`\nChecking ${citiesData.length} cities from main database...`);
    citiesData.forEach(city => {
        totalTests++;
        // Use PLZ for search as it is the primary unique identifier
        const result = findAuthorityInDB(city.plz);

        if (!result) {
            failedTests++;
            failures.push(`[MAIN DB] ${city.stadt} (${city.plz}) -> NO RESULT`);
        } else {
            // Check for essential fields
            if (!result.email || result.email === 'Nicht verfügbar' || !result.email.includes('@')) {
                // failures.push(`[WARN] ${city.stadt} (${city.plz}) -> INVALID EMAIL (${result.email})`);
            }
            if (!result.name) {
                failedTests++;
                failures.push(`[MAIN DB] ${city.stadt} (${city.plz}) -> MISSING NAME`);
            }
        }
    });

    // TEST 2: Verify all Districts in city_districts.json
    console.log(`\nChecking special district mappings...`);
    for (const [cityName, cityData] of Object.entries(cityDistrictsData)) {
        if (cityData.districts) {
            cityData.districts.forEach(district => {
                if (district.plz && Array.isArray(district.plz)) {
                    district.plz.forEach(plz => {
                        totalTests++;
                        const result = findAuthorityInDB(plz);

                        if (!result) {
                            failedTests++;
                            failures.push(`[DISTRICT] ${cityName} PLZ ${plz} -> NO RESULT`);
                        } else {
                            // Check if it mapped to the CORRECT district
                            // We compare the found name with the expected district name
                            if (result.name !== district.name) {
                                failedTests++;
                                failures.push(`[DISTRICT] ${cityName} PLZ ${plz} -> WRONG MAPPING. Got: "${result.name}", Expected: "${district.name}"`);
                            }
                        }
                    });
                }
            });
        }
    }

    console.log("\n---------------------------------------------------");
    console.log(`TOTAL TESTS: ${totalTests}`);
    console.log(`FAILED:      ${failedTests}`);
    console.log("---------------------------------------------------");

    // Write failures to log file
    if (failedTests > 0) {
        console.log(`Writing ${failures.length} failures to ${logPath}...`);
        fs.writeFileSync(logPath, failures.join('\n'), 'utf8');
        process.exit(1);
    } else {
        console.log("✅ ALL CHECKS PASSED. System is robust.");
        if (fs.existsSync(logPath)) fs.unlinkSync(logPath);
        process.exit(0);
    }

} catch (err) {
    console.error("CRITICAL ERROR:", err);
    process.exit(1);
}
