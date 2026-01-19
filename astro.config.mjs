import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // ERSETZE DIES DURCH DEINE ECHTE DOMAIN
  site: 'https://www.sozialer-navigator.de',

  integrations: [sitemap()],

  vite: {
    plugins: [tailwindcss()],
  },
});