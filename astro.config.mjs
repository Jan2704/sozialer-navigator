// astro.config.mjs
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // EXAKT SO EINTRAGEN:
  site: 'https://sozialer-navigator.de', 
  integrations: [sitemap()],
});