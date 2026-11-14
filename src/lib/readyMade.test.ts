import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PAGE_SPECS, parseReadyMade, readyMadePdfs, papersFor, readyMadeFile, type GeneratorPage } from './readyMade';
import { GENERATOR_DEFAULT } from './patternLink';
import type { PatternSpec } from './patterns';

const ROOT = resolve(__dirname, '../..');
const pages = Object.keys(PAGE_SPECS) as GeneratorPage[];
const md = (p: GeneratorPage) => readFileSync(resolve(ROOT, `src/content/tools/generator-${p}.md`), 'utf-8');

describe('ready-made patterns', () => {
  it('every generator page lists ready-made patterns', () => {
    for (const p of pages) expect(parseReadyMade(md(p), p).length, p).toBeGreaterThanOrEqual(3);
  });

  it('every ready-made line links the PDFs the build writes, one per paper it names', () => {
    for (const p of pages) {
      const text = md(p);
      for (const r of parseReadyMade(text, p)) {
        const links = readyMadePdfs(p, r).map((l) => `[${l.paper}](${l.href})`).join(', ');
        expect(text, `${p}: ${r.text}`).toContain(`(/tools/generator/${p}/?${r.query}) · PDF: ${links}\n`);
      }
    }
  });

  it('file names are unique across all pages', () => {
    const all = pages.flatMap((p) => parseReadyMade(md(p), p).flatMap((r) => readyMadePdfs(p, r).map((l) => l.href)));
    expect(new Set(all).size).toBe(all.length);
  });

  it('reads the papers a line names', () => {
    const s = { ...GENERATOR_DEFAULT } as PatternSpec;
    expect(papersFor('7 × 10 squares, 20 mm: one A4 or Letter page', s)).toEqual(['A4', 'Letter']);
    expect(papersFor('7 × 10 squares, 30 mm: one A3 page', s)).toEqual(['A3']);
    expect(papersFor('Six tag36h11 tags, IDs 0 to 5, 60 mm', s)).toEqual(['A4', 'Letter']);
  });

  it('names files after what is on them', () => {
    const tag = { ...GENERATOR_DEFAULT, ...PAGE_SPECS.apriltag, rows: 3, cols: 2, marker: 60 } as PatternSpec;
    expect(readyMadeFile('apriltag', tag, 'A4')).toBe('/files/patterns/apriltag-tag36h11-ids-0-5-60mm-a4.pdf');
    const ch = { ...GENERATOR_DEFAULT, ...PAGE_SPECS.charuco } as PatternSpec;
    expect(readyMadeFile('charuco', ch, 'Letter')).toBe('/files/patterns/charuco-7x10-20mm-6x6-250-letter.pdf');
  });

  it('the generator pages start from PAGE_SPECS', () => {
    for (const p of pages) {
      const astro = readFileSync(resolve(ROOT, `src/pages/tools/generator/${p}.astro`), 'utf-8');
      expect(astro, p).toContain(`initialSpec={PAGE_SPECS.${p}}`);
    }
  });
});
