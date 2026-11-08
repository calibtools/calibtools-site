import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  extractInternalLinks,
  skuAnchor,
  skuTitleFor,
  bodyWordCount,
  splitFrontmatter,
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

  it('counts words in the body only', () => {
    expect(bodyWordCount('---\na: b c d\n---\none two\n\nthree')).toBe(3);
  });
});

describe('product long-form content', () => {
  const files = slugs('products');

  for (const slug of files) {
    const raw = readFileSync(resolve(CONTENT, 'products', `${slug}.md`), 'utf-8');
    const { body } = splitFrontmatter(raw);

    it(`${slug}: every internal link in the body points to a page that exists`, () => {
      const broken = extractInternalLinks(body).filter((h) => !valid.has(h.split('#')[0]));
      expect(broken).toEqual([]);
    });

    it(`${slug}: every part number in skus is in the datasheet or ordering data`, () => {
      const pns = [...raw.matchAll(/partNumber:\s*"?([A-Z0-9-]+)"?/g)].map((m) => m[1]);
      if (pns.length === 0) return;
      const sheets = resolve(ROOT, 'docs/datasheets');
      const all = existsSync(sheets)
        ? readdirSync(sheets).filter((f) => f.endsWith('.md')).map((f) => readFileSync(resolve(sheets, f), 'utf-8')).join('\n')
        : '';
      const missing = pns.filter((pn) => !all.includes(pn));
      expect(missing).toEqual([]);
    });
  }

  it('charuco-composite (pilot) has a rich body that links out to related products', () => {
    const raw = readFileSync(resolve(CONTENT, 'products/charuco-composite.md'), 'utf-8');
    const { body } = splitFrontmatter(raw);
    expect(bodyWordCount(raw)).toBeGreaterThanOrEqual(700);
    const productLinks = new Set(
      extractInternalLinks(body).filter((h) => h.startsWith('/targets/') && h !== '/targets/charuco-composite/'),
    );
    expect(productLinks.size).toBeGreaterThanOrEqual(6);
    // Each size is described in prose and linked to its row in the ordering table
    for (const size of ['200X150', '300X200', '400X300', '600X400', '800X600']) {
      expect(body).toContain(`(#CT-CHA-P-${size})`);
    }
  });
});
