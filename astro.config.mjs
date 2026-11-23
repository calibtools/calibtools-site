import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import { readdirSync, readFileSync } from 'node:fs';
import { rehypeFileLinks } from './scripts/file-links.mjs';

const NOINDEX_PATHS = ['/cart/', '/quote/', '/review/', '/account/', '/pattern/'];
// draft guides are built with noindex; keep them out of the sitemap (and so out of llms.txt)
const GUIDES = 'src/content/guides';
const DRAFT_GUIDES = readdirSync(GUIDES).filter((f) => f.endsWith('.md') && /^draft:\s*true\s*$/m.test(readFileSync(`${GUIDES}/${f}`, 'utf8').split('\n---')[0])).map((f) => `/calibacademy/${f.slice(0, -3)}/`);

export default defineConfig({
  site: 'https://calib.tools',
  integrations: [
    react(),
    tailwind(),
    sitemap({
      filter: (page) => ![...NOINDEX_PATHS, ...DRAFT_GUIDES].some((p) => new URL(page).pathname.startsWith(p)),
    }),
  ],
  // links to files open in a new tab (scripts/file-links.mjs)
  markdown: { rehypePlugins: [rehypeFileLinks] },
  output: 'static',
});
