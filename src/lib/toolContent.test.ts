import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { specFromParams } from './patternLink';
import { computeLayout, PAPERS } from './pageLayout';
import { getAprilFamily, dictMarkerCount } from './dicts/dicts';
import { kalibrYaml, opencvJson } from './exportConfig';
import { GENERATOR_DEFAULT } from './patternLink';
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

/** Ready-made links of a generator page: text, query and the spec they produce on that page. */
function readyMade(file: string, slug: string, page: PatternSpec) {
  const md = readFileSync(resolve(TOOLS_DIR, file), 'utf-8');
  const re = new RegExp(`- \\[([^\\]]+)\\]\\(\\/tools\\/generator\\/${slug}\\/\\?([^)]+)\\)`, 'g');
  return { md, links: [...md.matchAll(re)].map((m) => ({ text: m[1], spec: { ...page, ...specFromParams(new URLSearchParams(m[2])) } as PatternSpec })) };
}
const fitsOn = (spec: PatternSpec, paper: string) => computeLayout({ ...spec, paper }, ...PAPERS[paper]).fit === 'single';

describe('ArUco generator page', () => {
  const page: PatternSpec = { ...GENERATOR_DEFAULT, type: 'Marker sheet', rows: 1, cols: 1, square: 120, marker: 100, dict: 'DICT_6X6_250', startId: 0 };
  const { md, links } = readyMade('generator-aruco.md', 'aruco', page);

  it('has four ready-made sheets that fit one A4 and one Letter page, with IDs inside the dictionary', () => {
    expect(links.length).toBe(4);
    for (const { text, spec } of links) {
      expect(fitsOn(spec, 'A4'), text).toBe(true);
      expect(fitsOn(spec, 'Letter'), text).toBe(true);
      expect(spec.startId! + spec.rows * spec.cols).toBeLessThanOrEqual(dictMarkerCount(spec.dict)!);
    }
  });

  it('the link text names the dictionary, count and size the link sets', () => {
    const words: Record<string, number> = { One: 1, Six: 6, Twelve: 12, 'Twenty-four': 24 };
    for (const { text, spec } of links) {
      const m = text.match(/^(One|Six|Twelve|Twenty-four) (DICT_\w+) markers?, IDs? [^,]+, (\d+) mm$/)!;
      expect(m, text).not.toBeNull();
      expect(spec.rows * spec.cols).toBe(words[m[1]]);
      expect(spec.dict).toBe(m[2]);
      expect(spec.marker).toBe(+m[3]);
    }
  });

  it('marker counts in the dictionary table match the data', () => {
    for (const m of md.matchAll(/^\| (DICT_\w+) \| \d × \d \| (\d+) \|/gm)) expect(dictMarkerCount(m[1]), m[1]).toBe(+m[2]);
  });
});

describe('ChArUco and checkerboard generator pages', () => {
  const cases = [
    { file: 'generator-charuco.md', slug: 'charuco', astro: "initialSpec={{ type: 'ChArUco', rows: 7, cols: 10, square: 20, marker: 15, dict: 'DICT_6X6_250' }}", page: { ...GENERATOR_DEFAULT, type: 'ChArUco', rows: 7, cols: 10, square: 20, marker: 15, dict: 'DICT_6X6_250' } as PatternSpec },
    { file: 'generator-checkerboard.md', slug: 'checkerboard', astro: "initialSpec={{ type: 'Checkerboard', rows: 7, cols: 10, square: 20 }}", page: { ...GENERATOR_DEFAULT, type: 'Checkerboard', rows: 7, cols: 10, square: 20 } as PatternSpec },
  ];
  for (const c of cases) {
    const { links } = readyMade(c.file, c.slug, c.page);

    it(`${c.slug}: the page opens with a board that fits one A4 and one Letter page`, () => {
      expect(readFileSync(resolve(`src/pages/tools/generator/${c.slug}.astro`), 'utf-8')).toContain(c.astro);
      expect(fitsOn(c.page, 'A4')).toBe(true);
      expect(fitsOn(c.page, 'Letter')).toBe(true);
    });

    it(`${c.slug}: every ready-made board fits the paper its link text names, with the grid and square size it names`, () => {
      expect(links.length).toBe(4);
      for (const { text, spec } of links) {
        const m = text.match(/^(\d+) × (\d+) squares, (\d+) mm(?:, (DICT_\w+))?: one (A4 or Letter|A3 or Tabloid|A3|Tabloid) page$/)!;
        expect(m, text).not.toBeNull();
        expect([spec.rows, spec.cols, spec.square]).toEqual([+m[1], +m[2], +m[3]]);
        if (m[4]) expect(spec.dict).toBe(m[4]);
        for (const paper of m[5].split(' or ')) expect(fitsOn(spec, paper), `${text} on ${paper}`).toBe(true);
      }
    });
  }

  it('the main generator page also opens with a board that fits one A4 and one Letter page', () => {
    expect(readFileSync(resolve('src/pages/tools/generator.astro'), 'utf-8')).toContain('initialSpec={{ square: 20, marker: 15 }}');
    const spec = { ...GENERATOR_DEFAULT, square: 20, marker: 15 };
    expect(fitsOn(spec, 'A4')).toBe(true);
    expect(fitsOn(spec, 'Letter')).toBe(true);
  });

  it('a 7 × 10 board of 25 mm squares does not fit A4, as the ChArUco page says', () => {
    expect(fitsOn({ ...GENERATOR_DEFAULT }, 'A4')).toBe(false);
  });

  it('the checkerboard example passes the inner corners of a 7 × 10 board, columns first', () => {
    const md = readFileSync(resolve(TOOLS_DIR, 'generator-checkerboard.md'), 'utf-8');
    expect(md).toContain('findChessboardCornersSB(gray, (9, 6))');
    expect((10 - 1) * (7 - 1)).toBe(54);
    expect(md).toContain('holds the 54 inner corners');
  });
});

describe('AprilGrid and circle grid generator pages', () => {
  const ag: PatternSpec = { ...GENERATOR_DEFAULT, type: 'AprilGrid (Kalibr)', rows: 6, cols: 6, square: 20, dict: 'DICT_APRILTAG_36h11' };
  const ci: PatternSpec = { ...GENERATOR_DEFAULT, type: 'Asymmetric circles', rows: 11, cols: 8, square: 18 };

  it('both pages open with a grid that fits one A4 and one Letter page', () => {
    expect(readFileSync(resolve('src/pages/tools/generator/aprilgrid.astro'), 'utf-8')).toContain("initialSpec={{ type: 'AprilGrid (Kalibr)', rows: 6, cols: 6, square: 20, dict: 'DICT_APRILTAG_36h11' }}");
    expect(readFileSync(resolve('src/pages/tools/generator/circles.astro'), 'utf-8')).toContain("initialSpec={{ type: 'Asymmetric circles', rows: 11, cols: 8, square: 18 }}");
    for (const spec of [ag, ci]) { expect(fitsOn(spec, 'A4')).toBe(true); expect(fitsOn(spec, 'Letter')).toBe(true); }
  });

  it('AprilGrid: every ready-made grid has the tag count and size its text names and fits the paper it names', () => {
    const { links } = readyMade('generator-aprilgrid.md', 'aprilgrid', ag);
    expect(links.length).toBe(3);
    for (const { text, spec } of links) {
      const m = text.match(/^(\d+) × (\d+) tags, (\d+) mm: one (A4 or Letter|A3 or Tabloid) page$/)!;
      expect(m, text).not.toBeNull();
      expect([spec.rows, spec.cols, spec.square]).toEqual([+m[1], +m[2], +m[3]]);
      for (const paper of m[4].split(' or ')) expect(fitsOn(spec, paper), `${text} on ${paper}`).toBe(true);
    }
  });

  it('AprilGrid: the YAML in the text is what the generator writes for the opening grid', () => {
    const md = readFileSync(resolve(TOOLS_DIR, 'generator-aprilgrid.md'), 'utf-8');
    const yaml = kalibrYaml(ag);
    expect(yaml).toContain("target_type: 'aprilgrid'");
    expect(yaml).toMatch(/tagRows: 6\ntagCols: 6\ntagSize: 0\.020*\ntagSpacing: 0\.30*\n/);
    expect(md).toContain("target_type: 'aprilgrid'\ntagRows: 6\ntagCols: 6\ntagSize: 0.02\ntagSpacing: 0.3\n");
    expect(yaml).toContain('first ID at the bottom-left tag');
  });

  it('circles: every ready-made grid has the layout, counts and spacing its text names and fits the paper it names', () => {
    const { links } = readyMade('generator-circles.md', 'circles', ci);
    expect(links.length).toBe(3);
    for (const { text, spec } of links) {
      const m = text.match(/^(Asymmetric|Symmetric), (\d+) × (\d+) circles, (\d+) mm spacing: one (A4 or Letter|A3 or Tabloid) page$/)!;
      expect(m, text).not.toBeNull();
      expect(spec.type).toBe(`${m[1]} circles`);
      // the text and OpenCV both give circles per row first, then rows
      expect((JSON.parse(opencvJson(spec)) as { opencv_pattern_size: number[] }).opencv_pattern_size).toEqual([+m[2], +m[3]]);
      expect(spec.square).toBe(+m[4]);
      for (const paper of m[5].split(' or ')) expect(fitsOn(spec, paper), `${text} on ${paper}`).toBe(true);
    }
  });

  it('circles: the OpenCV example passes the size the generator writes for the opening grid', () => {
    const md = readFileSync(resolve(TOOLS_DIR, 'generator-circles.md'), 'utf-8');
    const cfg = JSON.parse(opencvJson(ci)) as { opencv_pattern_size: number[]; opencv_flag: string };
    expect(cfg.opencv_pattern_size).toEqual([4, 11]);
    expect(md).toContain(`findCirclesGrid(gray, (4, 11), flags=cv2.${cfg.opencv_flag})`);
  });
});

describe('opencv.json for circle grids', () => {
  it('writes the circle diameter without floating-point noise', () => {
    const cfg = JSON.parse(opencvJson({ ...GENERATOR_DEFAULT, type: 'Asymmetric circles', rows: 11, cols: 8, square: 18 })) as { circle_diameter_mm: number };
    expect(cfg.circle_diameter_mm).toBe(10.08);
  });
});

describe('generator pages lead on to the boards', () => {
  const PRODUCTS = readdirSync(resolve('src/assets/products'));
  const pages = readdirSync(TOOLS_DIR).filter((f) => /^generator(-[a-z]+)?\.md$/.test(f));

  it('finds the seven generator pages', () => {
    expect(pages.length).toBe(7);
  });

  for (const file of pages) {
    it(`${file} links to at least one product page, and every product link exists`, () => {
      const raw = readFileSync(resolve(TOOLS_DIR, file), 'utf-8');
      const handles = [...raw.matchAll(/\]\(\/targets\/([a-z0-9-]+)\/\)/g)].map((m) => m[1]);
      expect(handles.length).toBeGreaterThan(0);
      for (const h of handles) expect(PRODUCTS).toContain(h);
    });
  }
});
