import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';

import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // ERSETZE DIES DURCH DEINE ECHTE DOMAIN
  site: 'https://www.sozialer-navigator.de',

  integrations: [sitemap(), react()],

  vite: {
    plugins: [tailwindcss()],
  },

  prefetch: {
    defaultStrategy: 'hover',
    prefetchAll: false
  }
});