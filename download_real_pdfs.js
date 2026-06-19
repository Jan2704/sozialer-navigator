import fs from 'fs';
import { Readable } from 'stream';
import { finished } from 'stream/promises';

async function downloadFile(url, dest) {
    try {
        console.log(`Downloading ${url}...`);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`);
        
        const fileStream = fs.createWriteStream(dest, { flags: 'wx' });
        await finished(Readable.fromWeb(res.body).pipe(fileStream));
        console.log(`Saved to ${dest}`);
    } catch (e) {
        console.error(`Error downloading ${url}:`, e.message);
    }
}

async function main() {
    // Official HA Bürgergeld
    await downloadFile('https://www.arbeitsagentur.de/datei/antrag-sgb2_ba042689.pdf', './public/forms/Hauptantrag_Buergergeld.pdf');
}

main();
