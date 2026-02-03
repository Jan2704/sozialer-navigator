import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';

import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // ERSETZE DIES DURCH DEINE ECHTE DOMAIN
  site: 'https://www.sozialer-navigator.de',

  integrations: [sitemap({
    serialize(item) {
      // Url string for matching
      const url = item.url;

      // Default priority
      let priority = 0.5;

      if (/\/wohngeldrechner\//.test(url)) {
        // Legacy Pages -> Low Priority
        priority = 0.2;
      } else if (/\/[a-z0-9-]+\/(wohngeld|grundsicherung|buergergeld)$/.test(url)) {
        // Canonical Action Pages (e.g. /berlin/wohngeld) -> Highest Priority
        priority = 0.9;
      } else if (/\/wohngeld$/.test(url) || /\/buergergeld$/.test(url) || /\/buergergeld-grundsicherung$/.test(url)) {
        // Canonical Entity Pages -> High Priority
        priority = 0.8;
      } else if (/\/lexikon\//.test(url)) {
        // Lexikon -> Lower Priority
        priority = 0.4;
      } else if (/\/[a-z0-9-]+$/.test(url) && !/\/lexikon$/.test(url) && !/\/impressum$/.test(url) && !/\/datenschutz$/.test(url)) {
        // City Pages (e.g. /berlin) -> Medium Priority (exclude known static pages if necessary)
        // Note: Use a more specific regex if possible, but this catches single segment slugs (cities)
        priority = 0.6;
      }

      item.changefreq = 'weekly';
      item.priority = priority;
      return item;
    }
  }), react()],

  vite: {
    plugins: [tailwindcss()],
  },

  prefetch: {
    defaultStrategy: 'hover',
    prefetchAll: false
  }
});