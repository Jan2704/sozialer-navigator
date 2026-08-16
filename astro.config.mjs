import fs from 'node:fs';
import path from 'node:path';
import gracefulFs from 'graceful-fs';
gracefulFs.gracefulify(fs);

import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';

import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

// Real per-page lastmod for the sitemap, sourced from each content file's own
// `lastUpdated`/`pubDate` frontmatter — NOT a fabricated always-today value
// (SEO audit, sitemap.md #3: a boilerplate build-time date is worse than none,
// since Google treats it as untrustworthy once detected). Content collections
// aren't available inside astro.config.mjs, so this reads frontmatter directly.
function readLastmodMap() {
  const map = new Map();
  for (const [collection, urlPrefix, dateField] of [
    ['lexikon', '/lexikon/', 'lastUpdated'],
    ['ratgeber', '/ratgeber/', 'pubDate']
  ]) {
    const dir = path.join(process.cwd(), 'src/content', collection);
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.md')) continue;
      const slug = file.replace(/\.md$/, '');
      const raw = fs.readFileSync(path.join(dir, file), 'utf8');
      const match = raw.match(new RegExp(`^${dateField}:\\s*"?(\\d{4}-\\d{2}-\\d{2})"?`, 'm'));
      if (match) {
        map.set(`${urlPrefix}${slug}/`, match[1]);
      }
    }
  }
  return map;
}
const lastmodMap = readLastmodMap();

export default defineConfig({
  // Single source of truth for the canonical domain — all canonical URLs, OG tags,
  // and schema.org @id/url fields derive from this at build time. Update only here.
  site: 'https://www.sozialer-navigator.de',


  // output: 'hybrid', // DEPRECATED: Use 'static' or 'server'
  adapter: vercel(),
  output: 'server',
  trailingSlash: 'always',

  integrations: [sitemap({
    // Excludes internal/admin pages and the curated external-resource "stub"
    // ratgeber cards (noindexed in src/pages/ratgeber/[slug].astro) — these
    // are not original content and shouldn't be submitted for indexing.
    filter: (page) => !/\/(admin|design-system)\//.test(page)
      && !/\/ratgeber\/(buergergeld-oder-wohngeld|wohngeld-erhoehung-2026|wohngeld-fuer-rentner)\/?$/.test(page),
    serialize(item) {
      // Url string for matching
      const url = item.url;

      // Default priority
      let priority = 0.5;
      const segments = new URL(url).pathname.split('/').filter(Boolean);

      if (/\/lexikon\//.test(url)) {
        // Lexikon -> Lower Priority
        priority = 0.4;
      } else if (segments.length === 1 && !['impressum', 'datenschutz', 'agb'].includes(segments[0])) {
        // Single-segment top-level tool pages (e.g. /kindergeld/, /grundsicherung-im-alter/) -> Medium Priority
        priority = 0.6;
      }

      // Real per-page lastmod where we track one; omitted entirely otherwise
      // rather than defaulting to today's build date (see note above readLastmodMap).
      const pathname = new URL(url).pathname;
      const knownDate = lastmodMap.get(pathname);
      if (knownDate) {
        item.lastmod = new Date(knownDate).toISOString();
      } else {
        delete item.lastmod;
      }

      item.changefreq = 'weekly';
      item.priority = priority;
      return item;
    }
  }), react()],

  vite: {
    plugins: [tailwindcss()],
    server: {
      watch: {
        ignored: [
          '**/.astro/**',
          '**/.vercel/**',
          '**/dist/**',
          '**/*.pdf',
          '**/*.zip',
          '**/*.exe',
          '**/supabase/**'
        ]
      }
    }
  },

  prefetch: {
    defaultStrategy: 'hover',
    prefetchAll: false
  }
});