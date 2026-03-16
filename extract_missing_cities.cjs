const fs = require('fs');

const wohngeldFile = 'c:/Users/Jan-r/OneDrive/Dokumente/Jan/Projekt/sozialer-navigator/sozialer-navigator-app/src/data/wohngeldData.js';
const wohngeldContent = fs.readFileSync(wohngeldFile, 'utf8');

const citiesToFind = ['Passau', 'Ingolstadt', 'Konstanz', 'Fulda', 'Lübeck', 'Halle (Saale)', 'Krefeld', 'Ludwigsburg'];
const results = [];

citiesToFind.forEach(city => {
    // Escape parentheses for regex if needed, but here we just look for stadt: "City"
    const escapedCity = city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp('{\\s*plz:\\s*"([^"]+)",\\s*stadt:\\s*"' + escapedCity + '"[\\s\\S]*?}', 'g');
    const match = regex.exec(wohngeldContent);
    if (match) {
        results.push(match[0]);
    } else {
        // Try fallback if the first one fails due to spacing
        const regexFuzzy = new RegExp('stadt:\\s*"' + escapedCity + '"', 'g');
        const fuzzyMatch = regexFuzzy.exec(wohngeldContent);
        if (fuzzyMatch) {
            // Found the start, now find the end of the object
            const startIndex = fuzzyMatch.index;
            const openBrace = wohngeldContent.lastIndexOf('{', startIndex);
            const closeBrace = wohngeldContent.indexOf('}', startIndex);
            if (openBrace !== -1 && closeBrace !== -1) {
                results.push(wohngeldContent.substring(openBrace, closeBrace + 1));
            }
        }
    }
});

console.log('--- EXTRACTED DATA FOR MISSING CITIES ---');
results.forEach(r => {
    // Format it slightly cleaner for output
    console.log(r.replace(/\s+/g, ' ').substring(0, 500) + '...');
});
