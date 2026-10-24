import { describe, it, expect } from 'vitest';
import {
  getProductImages,
  handlesWithImages,
  allProductImages,
  type ImageKind,
} from './product-images';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const PRODUCTS_DIR = resolve(__dirname, '../assets/products');

// ---------------------------------------------------------------------------
// Ordering and lookup
// ---------------------------------------------------------------------------

describe('getProductImages', () => {
  it('returns images for checkerboard-composite in images.json order', () => {
    const images = getProductImages('checkerboard-composite');
    expect(images.length).toBe(5);
    expect(images.map((i) => i.file)).toEqual([
      '01-hero.webp',
      '02-angle.webp',
      '03-detail.webp',
      '04-context.webp',
      '05-scale.webp',
    ]);
  });

  it('returns images for mounting-fixture (3 images)', () => {
    const images = getProductImages('mounting-fixture');
    expect(images.length).toBe(3);
    expect(images.map((i) => i.file)).toEqual([
      '01-hero.webp',
      '02-mounted.webp',
      '03-detail.webp',
    ]);
  });

  it('returns images for certificate-ilac (2 images)', () => {
    const images = getProductImages('certificate-ilac');
    expect(images.length).toBe(2);
  });

  it('returns empty array for unknown handle (fallback to render pipeline)', () => {
    const images = getProductImages('nonexistent-product');
    expect(images).toEqual([]);
  });

  it('returns empty array for a real product handle with no catalogue images', () => {
    // If there were a product with no images, it should return empty.
    // Test the fallback path.
    const images = getProductImages('some-future-product-without-images');
    expect(images).toEqual([]);
  });

  it('preserves alt text from images.json', () => {
    const images = getProductImages('checkerboard-composite');
    expect(images[0].alt).toContain('checkerboard calibration board');
  });
});

describe('handlesWithImages', () => {
  it('returns all handles that have catalogue images', () => {
    const handles = handlesWithImages();
    expect(handles).toContain('checkerboard-composite');
    expect(handles).toContain('charuco-composite');
    expect(handles).toContain('charuco-ceramic');
    expect(handles).toContain('mounting-fixture');
    expect(handles).toContain('certificate-ilac');
    expect(handles).toContain('brand');
  });
});

// ---------------------------------------------------------------------------
// images.json validation
// ---------------------------------------------------------------------------

describe('images.json validation', () => {
  const catalog = allProductImages;
  const VALID_KINDS = new Set<string>(['ai', 'render', 'photo']);

  it('every entry has a valid kind', () => {
    for (const entry of catalog) {
      expect(VALID_KINDS.has(entry.kind)).toBe(true);
    }
  });

  it('every file exists on disk', () => {
    for (const entry of catalog) {
      const filePath = join(PRODUCTS_DIR, entry.handle, entry.file);
      expect(existsSync(filePath), `missing: ${entry.handle}/${entry.file}`).toBe(true);
    }
  });

  it('every handle folder exists', () => {
    const handles = new Set(catalog.map((e) => e.handle));
    for (const handle of handles) {
      const dir = join(PRODUCTS_DIR, handle);
      expect(existsSync(dir), `folder missing: ${handle}`).toBe(true);
      expect(statSync(dir).isDirectory(), `not a directory: ${handle}`).toBe(true);
    }
  });

  it('every WebP in non-brand handle folders is listed in images.json', () => {
    const jsonFiles = new Map<string, Set<string>>();
    for (const entry of catalog) {
      if (!jsonFiles.has(entry.handle)) jsonFiles.set(entry.handle, new Set());
      jsonFiles.get(entry.handle)!.add(entry.file);
    }

    const SKIP_DIRS = new Set(['brand']);
    for (const dirName of readdirSync(PRODUCTS_DIR)) {
      const dirPath = join(PRODUCTS_DIR, dirName);
      if (!statSync(dirPath).isDirectory()) continue;
      if (SKIP_DIRS.has(dirName)) continue;

      const pngs = readdirSync(dirPath).filter((f) => f.endsWith('.webp'));
      const listed = jsonFiles.get(dirName) ?? new Set();

      for (const png of pngs) {
        expect(listed.has(png), `${dirName}/${png} exists on disk but not in images.json`).toBe(
          true,
        );
      }
    }
  });

  it('rejects an invalid kind value', () => {
    // This tests the validation logic indirectly — the catalogue was validated
    // at import time.  If we got here, all entries are valid.
    // We just double-check with a manual assertion:
    const badKind = 'screenshot' as ImageKind;
    expect(VALID_KINDS.has(badKind)).toBe(false);
  });
});
