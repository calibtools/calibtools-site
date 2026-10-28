import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

const NOINDEX_PATHS = ['/cart/', '/quote/', '/review/', '/verify/', '/targets/collection/lidar-image-quality/'];

export default defineConfig({
  site: 'https://calib.tools',
  integrations: [
    react(),
    tailwind(),
    sitemap({
      filter: (page) => !NOINDEX_PATHS.some((p) => new URL(page).pathname.startsWith(p)),
    }),
  ],
  output: 'static',
});
