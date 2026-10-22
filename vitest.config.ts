import { getViteConfig } from 'astro/config';

export default getViteConfig({
  test: {
    exclude: ['tests/e2e/**', 'node_modules/**'],
  },
});
