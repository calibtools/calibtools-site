import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { readFileSync } from 'node:fs';

/**
 * Category tiles are small (84 px wide on phones), so the product has to fill the frame
 * (DESIGN.md §4): in at least one direction it covers three quarters of the picture.
 * The pictures are the ones CollectionTiles.astro imports.
 */
const src = readFileSync('src/components/CollectionTiles.astro', 'utf-8');
const files = [...src.matchAll(/from '@\/assets\/((?:categories|products)\/[^']+\.webp)'/g)].map((m) => `src/assets/${m[1]}`);

async function fill(file: string) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const px = (x: number, y: number) => { const i = (y * width + x) * channels; return [data[i], data[i + 1], data[i + 2]]; };
  /* Background = median of the top and bottom edge rows */
  const edge: number[][] = [];
  for (let x = 0; x < width; x += 4) { edge.push(px(x, 2), px(x, height - 3)); }
  const med = [0, 1, 2].map((c) => edge.map((p) => p[c]).sort((a, b) => a - b)[edge.length >> 1]);
  let x0 = width, x1 = 0, y0 = height, y1 = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const p = px(x, y);
    if (Math.abs(p[0] - med[0]) + Math.abs(p[1] - med[1]) + Math.abs(p[2] - med[2]) > 60) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  return { w: (x1 - x0) / width, h: (y1 - y0) / height };
}

describe('category tile pictures', () => {
  it('finds the pictures the tiles use', () => expect(files.length).toBeGreaterThanOrEqual(5));
  for (const f of files) {
    it(`${f}: the product fills the frame`, async () => {
      const { w, h } = await fill(f);
      expect(Math.max(w, h), `subject covers ${Math.round(w * 100)} % of the width and ${Math.round(h * 100)} % of the height`).toBeGreaterThanOrEqual(0.75);
    });
  }
});
