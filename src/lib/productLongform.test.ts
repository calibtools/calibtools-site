import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  extractInternalLinks,
  skuAnchor,
  skuTitleFor,
  bodyWordCount,
  splitFrontmatter,
  extractFrontmatterHrefs,
} from './productLongform';
import { tools } from './tools';

const ROOT = resolve(__dirname, '../..');
const CONTENT = resolve(ROOT, 'src/content');
const slugs = (dir: string) =>
  readdirSync(resolve(CONTENT, dir)).filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, ''));

/** Product content files that have no /targets/<handle>/ page (service SKUs). */
const NO_PAGE = new Set(['certificate-ilac']);

const valid = new Set<string>([
  '/targets/',
  ...slugs('products').filter((s) => !NO_PAGE.has(s)).map((s) => `/targets/${s}/`),
  ...slugs('collections').map((s) => `/targets/collection/${s}/`),
  ...slugs('guides').map((s) => `/guides/${s}/`),
  '/guides/',
  ...slugs('applications').map((s) => `/applications/${s}/`),
  ...tools.map((t) => t.href),
  // One generator page per pattern (src/pages/tools/generator/<pattern>.astro)
  ...readdirSync(resolve(ROOT, 'src/pages/tools/generator'))
    .filter((f) => f.endsWith('.astro'))
    .map((f) => `/tools/generator/${f.replace(/\.astro$/, '')}/`),
  '/tools/',
  '/quote/',
  '/contact/',
]);

describe('productLongform helpers', () => {
  it('extracts internal markdown links and ignores external, mailto and same-page anchors', () => {
    const md = 'See [a](/targets/x/) and [b](/guides/y/#z), [c](https://e.com), [d](mailto:a@b), [e](#CT-1).';
    expect(extractInternalLinks(md)).toEqual(['/targets/x/', '/guides/y/']);
  });

  it('turns a part number into a stable row anchor without the dictionary placeholder', () => {
    expect(skuAnchor('CT-CHA-P-400X300-{DICT}')).toBe('CT-CHA-P-400X300');
    expect(skuAnchor('CT-CHT-P-300X200')).toBe('CT-CHT-P-300X200');
  });

  it('finds the one-line SKU title by part number, ignoring the dictionary placeholder', () => {
    const skus = [{ partNumber: 'CT-CHA-P-400X300', title: 'Forty' }];
    expect(skuTitleFor('CT-CHA-P-400X300-{DICT}', skus)).toBe('Forty');
    expect(skuTitleFor('CT-CHA-P-200X150-{DICT}', skus)).toBeUndefined();
  });

  it('extracts internal hrefs from frontmatter lists', () => {
    const fm = 'relatedTargets:\n  - { label: "A", href: "/targets/a/", note: "x" }\n  - { label: "B", href: "https://e.com/", note: "y" }';
    expect(extractFrontmatterHrefs(fm)).toEqual(['/targets/a/']);
  });

  it('counts words in the body only', () => {
    expect(bodyWordCount('---\na: b c d\n---\none two\n\nthree')).toBe(3);
  });
});

describe('product long-form content', () => {
  const files = slugs('products');

  for (const slug of files) {
    const raw = readFileSync(resolve(CONTENT, 'products', `${slug}.md`), 'utf-8');
    const { body, frontmatter } = splitFrontmatter(raw);

    it(`${slug}: every internal link in the body and related lists points to a page that exists`, () => {
      const all = [...extractInternalLinks(body), ...extractFrontmatterHrefs(frontmatter)];
      const broken = all.filter((h) => !valid.has(h.split(/[?#]/)[0]));
      expect(broken).toEqual([]);
    });

    it(`${slug}: every part number in skus is in the datasheet or ordering data`, () => {
      const pns = [...raw.matchAll(/partNumber:\s*"?([A-Z0-9-]+)"?/g)].map((m) => m[1]);
      if (pns.length === 0) return;
      const sheets = resolve(ROOT, 'docs/datasheets');
      const all = existsSync(sheets)
        ? readdirSync(sheets).filter((f) => f.endsWith('.md')).map((f) => readFileSync(resolve(sheets, f), 'utf-8')).join('\n')
        : '';
      // A row written as CT-CHT-P-200X150-{F|C} in the datasheet is two part numbers in the ordering data
      const ordering = readFileSync(resolve(ROOT, 'data/part-numbers.csv'), 'utf-8');
      const missing = pns.filter((pn) => !all.includes(pn) && !ordering.includes(`${pn},active`));
      expect(missing).toEqual([]);
    });
  }

  it('charuco-composite (pilot) has a rich body that links out to related products', () => {
    const raw = readFileSync(resolve(CONTENT, 'products/charuco-composite.md'), 'utf-8');
    const { body, frontmatter } = splitFrontmatter(raw);
    expect(bodyWordCount(raw)).toBeGreaterThanOrEqual(700);
    const productLinks = new Set(
      [...extractInternalLinks(body), ...extractFrontmatterHrefs(frontmatter)].filter(
        (h) => h.startsWith('/targets/') && h !== '/targets/charuco-composite/',
      ),
    );
    expect(productLinks.size).toBeGreaterThanOrEqual(6);
    // Each size is described in prose and linked to its row in the ordering table
    for (const size of ['200X150', '300X200', '400X300', '600X400', '800X600']) {
      expect(body).toContain(`(#CT-CHA-P-${size})`);
    }
  });
});

describe('long-form batch 1 (C6)', () => {
  const pages: [slug: string, anchors: string[]][] = [
    ['checkerboard-composite', ['CT-CHT-P-200X150-F', 'CT-CHT-P-200X150-C', 'CT-CHT-P-800X600-F', 'CT-CHT-P-800X600-C']],
    ['aprilgrid-composite', ['CT-APR-P-200X150-T36', 'CT-APR-P-800X600-T36']],
    ['circlegrid-composite', ['CT-CIR-P-200X150-SYM', 'CT-CIR-P-800X600-ASY']],
    ['charuco-ceramic', ['CT-CHA-C-110X85', 'CT-CHA-C-230X140']],
  ];
  for (const [slug, anchors] of pages) {
    it(`${slug}: has a long-form body, links each size to its row and links out to other products`, () => {
      const raw = readFileSync(resolve(CONTENT, 'products', `${slug}.md`), 'utf-8');
      const { body, frontmatter } = splitFrontmatter(raw);
      expect(bodyWordCount(raw)).toBeGreaterThanOrEqual(600);
      for (const a of anchors) expect(body, a).toContain(`(#${a})`);
      const productLinks = new Set([...extractInternalLinks(body), ...extractFrontmatterHrefs(frontmatter)].filter((h) => h.startsWith('/targets/') && h !== `/targets/${slug}/`));
      expect(productLinks.size).toBeGreaterThanOrEqual(4);
    });
  }

  it('every size line on the ceramic page still carries the word "target" next to the ±2 µm figure', () => {
    const raw = readFileSync(resolve(CONTENT, 'products/charuco-ceramic.md'), 'utf-8');
    for (const m of raw.matchAll(/[^.\n]*±2 µm[^.\n]*/g)) expect(m[0]).toMatch(/target/i);
  });
});

describe('long-form batch 2 (C6)', () => {
  for (const slug of ['mounting-fixture', 'hand-eye-calibration-kit', 'multi-camera-target']) {
    it(`${slug}: has a long-form body and links out to other products and a guide`, () => {
      const raw = readFileSync(resolve(CONTENT, 'products', `${slug}.md`), 'utf-8');
      const { body, frontmatter } = splitFrontmatter(raw);
      expect(bodyWordCount(raw)).toBeGreaterThanOrEqual(450);
      const links = [...extractInternalLinks(body), ...extractFrontmatterHrefs(frontmatter)];
      expect(new Set(links.filter((h) => h.startsWith('/targets/') && h !== `/targets/${slug}/`)).size).toBeGreaterThanOrEqual(4);
      expect(links.some((h) => h.startsWith('/guides/'))).toBe(true);
    });
  }

  it('made-to-order pages say that their figures are target values', () => {
    for (const slug of ['hand-eye-calibration-kit', 'multi-camera-target']) {
      const { body } = splitFrontmatter(readFileSync(resolve(CONTENT, 'products', `${slug}.md`), 'utf-8'));
      expect(body, slug).toMatch(/These are target values/);
    }
  });

  it('fixture figures match the datasheet', () => {
    const { body } = splitFrontmatter(readFileSync(resolve(CONTENT, 'products/mounting-fixture.md'), 'utf-8'));
    const ds = readFileSync(resolve(ROOT, 'docs/datasheets/CT-DS-ACC-A-FIX-14.md'), 'utf-8');
    for (const fact of ['120 mm', '180 g', '7 mm deep', '3.2 kg', '5 kg', '3 mm hex key']) {
      expect(ds, fact).toContain(fact);
      expect(body, fact).toContain(fact);
    }
  });
});

describe('HALCON long-form (C6)', () => {
  const raw = readFileSync(resolve(CONTENT, 'products/halcon-composite.md'), 'utf-8');
  const { body } = splitFrontmatter(raw);

  it('describes the gen_caltab layout and links every size to its row', () => {
    expect(bodyWordCount(raw)).toBeGreaterThanOrEqual(450);
    for (const word of ['gen_caltab', 'frame', 'triangle', 'find_calib_object']) expect(body).toContain(word);
    for (const size of ['200X150', '300X200', '400X300', '600X400', '800X600']) expect(body).toContain(`(#CT-HAL-P-${size}-STD)`);
    expect(body).not.toMatch(/central (reference )?(mark|circle)/i);
  });

  it('every example layout fits its board with at least 15 mm to spare on each side', async () => {
    const { caltabGeometry, caltabSize } = await import('./halconCaltab');
    const examples = [...body.matchAll(/\((?:#CT-HAL-P-)(\d+)X(\d+)-STD\)\*\*: for example (\d+) × (\d+) marks, ([\d.]+) mm apart, ([\d.]+) mm in diameter/g)];
    expect(examples).toHaveLength(5);
    for (const [, w, h, x, y, dist, dia] of examples) {
      const g = caltabGeometry({ xNum: +x, yNum: +y, markDist: +dist, diameterRatio: 0.5 });
      const size = caltabSize(g);
      expect(size.w, `${w}x${h}`).toBeLessThanOrEqual(+w - 30);
      expect(size.h, `${w}x${h}`).toBeLessThanOrEqual(+h - 30);
      expect(g.marks[0].r * 2).toBe(+dia);
    }
  });
});

describe('long-form batch 3: multi-sensor targets (principle and selection)', () => {
  const slugsB3 = ['lidar-camera-target', 'thermal-calibration-target', 'nir-calibration-target', 'depth-camera-target', 'line-scan-target', 'radar-camera-target'];
  for (const slug of slugsB3) {
    it(`${slug}: explains the principle, says its figures are target values and ends with what to send`, () => {
      const raw = readFileSync(resolve(CONTENT, 'products', `${slug}.md`), 'utf-8');
      const { body, frontmatter } = splitFrontmatter(raw);
      expect(bodyWordCount(raw)).toBeGreaterThanOrEqual(400);
      expect(body).toMatch(/These are target values/);
      expect(body).toContain('## What to tell us');
      expect(body).toContain('(/quote/?product=');
      const links = [...extractInternalLinks(body), ...extractFrontmatterHrefs(frontmatter)];
      expect(new Set(links.filter((h) => h.startsWith('/targets/') && h !== `/targets/${slug}/`)).size).toBeGreaterThanOrEqual(4);
      expect(links.some((h) => h.startsWith('/guides/'))).toBe(true);
    });

    it(`${slug}: gives no tolerance or accuracy figure that has not been confirmed`, () => {
      const { body } = splitFrontmatter(readFileSync(resolve(CONTENT, 'products', `${slug}.md`), 'utf-8'));
      expect(body).not.toMatch(/±\s?\d/);
    });
  }
});

