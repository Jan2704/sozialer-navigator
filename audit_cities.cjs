const fs = require('fs');

const citiesFile = 'c:/Users/Jan-r/OneDrive/Dokumente/Jan/Projekt/sozialer-navigator/sozialer-navigator-app/src/data/cities_2026.json';
const citiesData = JSON.parse(fs.readFileSync(citiesFile, 'utf8'));

// Read wohngeldData.js (parsing it as a string since it's an export)
const wohngeldFile = 'c:/Users/Jan-r/OneDrive/Dokumente/Jan/Projekt/sozialer-navigator/sozialer-navigator-app/src/data/wohngeldData.js';
const wohngeldContent = fs.readFileSync(wohngeldFile, 'utf8');
// Simple extraction of cities from wohngeldData.js
const wohngeldCities = [];
const cityMatchRegex = /stadt:\s*"([^"]+)"/g;
let match;
while ((match = cityMatchRegex.exec(wohngeldContent)) !== null) {
    wohngeldCities.push(match[1]);
}
const uniqueWohngeldCities = [...new Set(wohngeldCities)];

const cityNamesIn2026 = citiesData.map(c => c.stadt);
const missingIn2026 = uniqueWohngeldCities.filter(city => !cityNamesIn2026.includes(city));

// Read daten.csv to find info for missing cities
const datenFile = 'c:/Users/Jan-r/OneDrive/Dokumente/Jan/Projekt/sozialer-navigator/sozialer-navigator-app/src/data/daten.csv';
const datenLines = fs.readFileSync(datenFile, 'utf8').split('\n');
const header = datenLines[0].split(',');
const missingCityInfo = [];

missingIn2026.forEach(city => {
    const line = datenLines.find(l => l.includes(city));
    if (line) {
        const parts = line.split(',');
        missingCityInfo.push({
            stadt: city,
            plz: parts[0],
            amt_name: parts[7],
            amt_adresse: parts[8],
            amt_email: parts[9]
        });
    }
});

const missingWohngeld = [];
const missingJobcenter = [];
const missingAddress = [];

citiesData.forEach(city => {
    if (!city.amt_email || city.amt_email === '' || city.amt_email === 'Nicht verfügbar') {
        missingWohngeld.push(city.stadt + ' (' + city.plz + ')');
    }
    if (!city.jobcenter_email || city.jobcenter_email === '' || city.jobcenter_email === 'Nicht verfügbar') {
        missingJobcenter.push(city.stadt + ' (' + city.plz + ')');
    }
    if (!city.amt_adresse || city.amt_adresse === '' || city.amt_adresse === 'Nicht verfügbar') {
        missingAddress.push(city.stadt + ' (' + city.plz + ')');
    }
});

console.log('--- AUDIT REPORT: cities_2026.json ---');
console.log('Total entries:', citiesData.length);
console.log('\nMissing Wohngeld Email (' + missingWohngeld.length + '):');
console.log(missingWohngeld.slice(0, 10).join(', ') + (missingWohngeld.length > 10 ? '...' : ''));

console.log('\nMissing Jobcenter Email (' + missingJobcenter.length + '):');
console.log(missingJobcenter.slice(0, 10).join(', ') + (missingJobcenter.length > 10 ? '...' : ''));

console.log('\nMissing Address (' + missingAddress.length + '):');
console.log(missingAddress.slice(0, 10).join(', ') + (missingAddress.length > 10 ? '...' : ''));

console.log('\n--- COMPARISON WITH wohngeldData.js ---');
console.log('Unique cities in wohngeldData.js:', uniqueWohngeldCities.length);
console.log('Cities missing in cities_2026.json:', missingIn2026.length);
if (missingIn2026.length > 0) {
    console.log('Missing cities:', missingIn2026.join(', '));
    console.log('\nFound info for missing cities in daten.csv:');
    missingCityInfo.forEach(info => {
        console.log('- ' + info.stadt + ': ' + info.amt_name + ', ' + info.amt_email + ' (' + info.amt_adresse + ')');
    });
}

if (missingWohngeld.length === 0 && missingJobcenter.length === 0 && missingAddress.length === 0 && missingIn2026.length === 0) {
    console.log('\nResult: ALL DATA PRESENT AND SYNCED');
} else {
    console.log('\nResult: DATA GAPS IDENTIFIED');
}
