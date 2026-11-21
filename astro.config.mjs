import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import { rehypeFileLinks } from './scripts/file-links.mjs';

const NOINDEX_PATHS = ['/cart/', '/quote/', '/review/', '/account/', '/pattern/'];

export default defineConfig({
  site: 'https://calib.tools',
  integrations: [
    react(),
    tailwind(),
    sitemap({
      filter: (page) => !NOINDEX_PATHS.some((p) => new URL(page).pathname.startsWith(p)),
    }),
  ],
  // links to files open in a new tab (scripts/file-links.mjs)
  markdown: { rehypePlugins: [rehypeFileLinks] },
  output: 'static',
});
