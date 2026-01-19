import { wohngeldData } from '../../data/wohngeldData.js';

export async function GET() {
  const baseUrl = 'https://sozialer-navigator.de';
  
  // 1. Statische Seiten definieren
  const staticPages = [
    '',             // Startseite
    '/impressum',   // Impressum
    '/datenschutz', // Datenschutz
    '/wohngeld'     // Wohngeld Übersicht
  ];

  // 2. Dynamische Stadt-Seiten aus den Daten generieren (Wohngeld & Bürgergeld)
  const cityPages = wohngeldData
    .filter(city => city.slug) // Leere Einträge oder Fehler filtern
    .flatMap(city => [
      `/wohngeld/${city.slug}`,
      `/buergergeld/${city.slug}`
    ]);

  // 3. Alle URLs zusammenführen
  const allUrls = [...staticPages, ...cityPages];

  // 4. XML Struktur bauen
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(url => `  <url>
    <loc>${baseUrl}${url}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>${url === '' ? 'daily' : 'weekly'}</changefreq>
    <priority>${url === '' ? '1.0' : '0.8'}</priority>
  </url>`).join('\n')}
</urlset>`;

  // 5. Als XML-Antwort zurückgeben
  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
    },
  });
}