import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { specFromParams } from './patternLink';
import { computeLayout, PAPERS } from './pageLayout';
import { getAprilFamily } from './dicts/dicts';
import type { PatternSpec } from './patterns';

/**
 * Tests that all tool content files exist and have valid frontmatter.
 * Does not use Astro's content collection API (vitest doesn't load it).
 */
const TOOLS_DIR = resolve('src/content/tools');
const REQUIRED_KEYS = ['generator', 'fov', 'wizard', 'convert', 'check', 'quality', 'capture'];

describe('tool content files', () => {
  it('all required tool content files exist', () => {
    const files = readdirSync(TOOLS_DIR).filter((f) => f.endsWith('.md'));
    for (const key of REQUIRED_KEYS) {
      expect(files).toContain(`${key}.md`);
    }
  });

  for (const key of REQUIRED_KEYS) {
    it(`${key}.md has valid frontmatter`, () => {
      const raw = readFileSync(resolve(TOOLS_DIR, `${key}.md`), 'utf-8');
      const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);
      expect(fmMatch).not.toBeNull();
      const fm = fmMatch![1];
      expect(fm).toContain('seoTitle:');
      expect(fm).toContain('seoDescription:');
      expect(fm).toContain('h1:');
      expect(fm).toContain('faq:');
    });

    it(`${key}.md has body content with expected sections`, () => {
      const raw = readFileSync(resolve(TOOLS_DIR, `${key}.md`), 'utf-8');
      expect(raw).toContain('## What it does');
      expect(raw).toContain('## How to use it');
    });
  }
});

describe('preset content files', () => {
  const PRESETS = ['generator-charuco', 'generator-checkerboard', 'generator-aprilgrid', 'generator-circles', 'generator-aruco', 'generator-apriltag'];

  it('all preset files exist', () => {
    const files = readdirSync(TOOLS_DIR).filter((f) => f.endsWith('.md'));
    for (const key of PRESETS) {
      expect(files).toContain(`${key}.md`);
    }
  });
});

describe('AprilTag generator page', () => {
  const md = readFileSync(resolve(TOOLS_DIR, 'generator-apriltag.md'), 'utf-8');
  // Same starting spec as src/pages/tools/generator/apriltag.astro.
  const page: PatternSpec = { type: 'Marker sheet', rows: 1, cols: 1, square: 120, marker: 100, dict: 'DICT_APRILTAG_36h11', aprilFamily: '36h11', borderBits: 1, startId: 0, paper: 'A4', scaleBar: true };
  const links = [...md.matchAll(/\]\(\/tools\/generator\/apriltag\/\?([^)]+)\)/g)].map((m) => m[1]);

  it('the starting spec here matches the page', () => {
    const astro = readFileSync(resolve('src/pages/tools/generator/apriltag.astro'), 'utf-8');
    expect(astro).toContain("type: 'Marker sheet', rows: 1, cols: 1, square: 120, marker: 100, dict: 'DICT_APRILTAG_36h11', aprilFamily: '36h11', borderBits: 1, startId: 0");
  });

  it('has four ready-made sheets, each on one A4 and one Letter page, with IDs inside the family', () => {
    expect(links.length).toBe(4);
    const count = getAprilFamily('36h11')!.codes.length;
    for (const q of links) {
      const spec = { ...page, ...specFromParams(new URLSearchParams(q)) };
      expect(computeLayout(spec, ...PAPERS.A4).fit, q).toBe('single');
      expect(computeLayout(spec, ...PAPERS.Letter).fit, q).toBe('single');
      expect(spec.startId! + spec.rows * spec.cols).toBeLessThanOrEqual(count);
    }
  });

  it('the link text states the number of tags and the size the link sets', () => {
    const words: Record<string, number> = { One: 1, Six: 6, Twelve: 12, 'Twenty-four': 24 };
    for (const m of md.matchAll(/- \[(One|Six|Twelve|Twenty-four) tag36h11 tags?, IDs? [^,]+, (\d+) mm\]\(\/tools\/generator\/apriltag\/\?([^)]+)\)/g)) {
      const spec = { ...page, ...specFromParams(new URLSearchParams(m[3])) };
      expect(spec.rows * spec.cols).toBe(words[m[1]]);
      expect(spec.marker).toBe(+m[2]);
    }
  });

  it('family sizes in the text match the dictionary data', () => {
    expect(getAprilFamily('36h11')!.codes.length).toBe(587);
    expect(md).toContain('| tag36h11 | 6 × 6 | 587 |');
    expect(md).toContain(`| tag25h9 | 5 × 5 | ${getAprilFamily('25h9')!.codes.length} |`);
    expect(md).toContain(`| tag16h5 | 4 × 4 | ${getAprilFamily('16h5')!.codes.length} |`);
  });

  it('any two tag36h11 codes differ in at least 11 bits, as the text says', () => {
    const codes = getAprilFamily('36h11')!.codes.map((c) => BigInt(String(c).startsWith('0x') ? c : `0x${c}`));
    const pop = (x: bigint) => { let n = 0; while (x) { n += Number(x & 1n); x >>= 1n; } return n; };
    let min = 99;
    for (let i = 0; i < codes.length; i++) for (let j = i + 1; j < codes.length; j++) min = Math.min(min, pop(codes[i] ^ codes[j]));
    expect(min).toBeGreaterThanOrEqual(11);
    expect(md).toContain('Minimum Hamming distance 11');
  });

  it('the worked size example is arithmetically right', () => {
    // 1,400 px focal length, 100 mm tag, 2 m: 70 px across 8 cells
    expect((1400 * 100) / 2000).toBe(70);
    expect(70 / 8).toBeCloseTo(8.75, 2);
    expect(md).toContain('is 70 px wide, a little under 9 px per cell');
  });
});
