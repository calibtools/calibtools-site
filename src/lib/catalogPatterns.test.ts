import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { CATALOG, matchCatalog, specFromEntry, productUrlFor, quoteSummary } from './catalogPatterns';
import { markerForSquare } from './boardSizes';
import type { PatternSpec } from './patterns';

const sheets = readdirSync(resolve(__dirname, '../../docs/datasheets'))
  .filter((f) => f.endsWith('.md'))
  .map((f) => readFileSync(resolve(__dirname, '../../docs/datasheets', f), 'utf-8'))
  .join('\n');

/** Shopify option values as configured in the store (2026-11-08). */
const SHOPIFY_OPTIONS: Record<string, Record<string, string[]>> = {
  'charuco-composite': { size: ['200×150', '300×200', '400×300', '600×400', '800×600'], dictionary: ['DICT_6X6_250', 'DICT_5X5_100', 'DICT_4X4_50', 'AprilTag 36h11'] },
  'charuco-ceramic': { size: ['110×85', '150×100', '185×110', '230×140'], dictionary: ['DICT_6X6_250', 'DICT_5X5_100'] },
  'checkerboard-composite': { size: ['200×150', '300×200', '400×300', '600×400', '800×600'], pattern: ['Fine', 'Coarse'] },
  'aprilgrid-composite': { size: ['200 × 150', '300 × 200', '400 × 300', '600 × 400', '800 × 600'] },
  'circlegrid-composite': { size: ['200 × 150', '300 × 200', '400 × 300', '600 × 400', '800 × 600'], layout: ['Symmetric', 'Asymmetric'] },
};
const norm = (s: string) => s.toLowerCase().replace(/×/g, 'x').replace(/\s+/g, '');

const base: PatternSpec = { type: 'ChArUco', rows: 7, cols: 10, square: 25, marker: markerForSquare(25), dict: 'DICT_6X6_250', paper: 'A4', startId: 0, scaleBar: true };

describe('catalogPatterns', () => {
  it('lists every stock pattern target: 20 + 8 ChArUco, 10 checkerboard, 5 AprilGrid, 10 circle grid', () => {
    const by = (h: string) => CATALOG.filter((e) => e.handle === h).length;
    expect(by('charuco-composite')).toBe(20);
    expect(by('charuco-ceramic')).toBe(8);
    expect(by('checkerboard-composite')).toBe(10);
    expect(by('aprilgrid-composite')).toBe(5);
    expect(by('circlegrid-composite')).toBe(10);
  });

  it('every part number family/size exists in the datasheets', () => {
    for (const e of CATALOG) {
      const size = e.partNumber.split('-').slice(0, 4).join('-');
      expect(sheets, e.partNumber).toContain(size);
    }
  });

  it('round-trips: the spec of every stock target matches that target exactly', () => {
    for (const e of CATALOG) {
      const m = matchCatalog({ ...base, ...specFromEntry(e) } as PatternSpec);
      expect(m.exact?.partNumber, e.partNumber).toBe(e.partNumber);
    }
  });

  it('"use these parameters" turns a modified pattern back into the stock target', () => {
    const modified: PatternSpec = { ...base, type: 'Checkerboard', rows: 9, cols: 14, square: 21, invert: true };
    const c = matchCatalog(modified).closest!;
    expect(matchCatalog({ ...modified, ...specFromEntry(c) } as PatternSpec).exact?.partNumber).toBe(c.partNumber);
  });

  it('the generator default (ChArUco 7 × 10, 25 mm, DICT_6X6_250) is CT-CHA-P-300X200-D6', () => {
    expect(matchCatalog(base).exact?.partNumber).toBe('CT-CHA-P-300X200-D6');
  });

  it('a changed square size is not a stock target; closest stays in the same family', () => {
    const m = matchCatalog({ ...base, square: 27, marker: 20 });
    expect(m.exact).toBeUndefined();
    expect(m.closest?.handle).toBe('charuco-composite');
  });

  it('a non-zero start ID or an unsupported dictionary is not a stock target', () => {
    expect(matchCatalog({ ...base, startId: 100 }).exact).toBeUndefined();
    const m = matchCatalog({ ...base, dict: 'DICT_7X7_1000' });
    expect(m.exact).toBeUndefined();
    expect(m.closest?.partNumber).toBe('CT-CHA-P-300X200-D6');
  });

  it('sends each pattern type to its own product family', () => {
    expect(matchCatalog({ ...base, type: 'AprilGrid (Kalibr)', rows: 5, cols: 7, square: 31 }).closest?.handle).toBe('aprilgrid-composite');
    expect(matchCatalog({ ...base, type: 'Symmetric circles', rows: 9, cols: 14, square: 23, circleDiameter: 13 }).closest?.handle).toBe('circlegrid-composite');
    expect(matchCatalog({ ...base, type: 'Checkerboard', rows: 9, cols: 14, square: 21 }).closest?.handle).toBe('checkerboard-composite');
  });

  it('has no stock target for HALCON-style dots, ArUco grids, marker sheets or PuzzleBoard', () => {
    for (const type of ['HALCON-style dots', 'ArUco grid', 'Marker sheet', 'PuzzleBoard'] as const) {
      const m = matchCatalog({ ...base, type });
      expect(m.exact, type).toBeUndefined();
      expect(m.closest, type).toBeUndefined();
    }
  });

  it('product URLs use option values that exist in the store', () => {
    for (const e of CATALOG) {
      const url = new URL(productUrlFor(e), 'https://calib.tools');
      expect(url.pathname).toBe(`/targets/${e.handle}/`);
      const opts = SHOPIFY_OPTIONS[e.handle];
      for (const [name, values] of Object.entries(opts)) {
        const v = url.searchParams.get(name);
        expect(v, `${e.partNumber} ${name}`).not.toBeNull();
        expect(values.map(norm), `${e.partNumber} ${name}=${v}`).toContain(norm(v!));
      }
      expect(url.searchParams.get('from')).toBe('generator');
    }
  });

  it('summarizes a pattern in one line for the quote form', () => {
    expect(quoteSummary(base)).toBe('ChArUco 7 × 10, 25 / 18 mm, DICT_6X6_250, start ID 0');
    expect(quoteSummary({ ...base, type: 'Checkerboard', rows: 9, cols: 14, square: 20 })).toBe('Checkerboard 9 × 14, 20 mm squares');
  });
});
