import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** Every page that renders a ProductCard takes its picture from productCardVisual, so a product looks the same wherever it is listed. */
function astroFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? astroFiles(p) : p.endsWith('.astro') ? [p] : [];
  });
}

describe('product cards', () => {
  it('get their picture from productCardVisual on every page', () => {
    const offenders: string[] = [];
    for (const f of astroFiles('src/pages')) {
      const src = readFileSync(f, 'utf-8');
      for (const m of src.matchAll(/<ProductCard\b[\s\S]*?\/>/g)) {
        if (!/\{\.\.\.productCardVisual\(/.test(m[0]) || /\bimage=\{/.test(m[0])) offenders.push(f);
      }
    }
    expect(offenders).toEqual([]);
  });
});
