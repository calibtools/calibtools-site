import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Verify that every product handle that should have a datasheet
 * resolves to an existing PDF via the manifest.
 *
 * We import the module fresh so the cache is cold.
 */

// Reset module-level cache by importing functions directly
import { findDatasheetUrl, getDatasheetManifest } from '../../src/lib/datasheetManifest';

const BOARD_HANDLES = [
  'charuco-composite',
  'charuco-ceramic',
  'checkerboard-composite',
  'aprilgrid-composite',
  'circlegrid-composite',
  'halcon-composite',
];

const ACCESSORY_HANDLES = ['mounting-fixture'];

describe('datasheetManifest', () => {
  it('manifest loads at least 7 datasheet entries', () => {
    const entries = getDatasheetManifest();
    expect(entries.length).toBeGreaterThanOrEqual(7);
  });

  it('every entry has family, material, code, url, and pages', () => {
    for (const e of getDatasheetManifest()) {
      expect(e.code).toMatch(/^CT-DS-/);
      expect(e.family).toBeTruthy();
      expect(e.material).toBeTruthy();
      expect(e.url).toMatch(/^\/files\/datasheets\/.+\.pdf$/);
      expect(e.pages).toBeGreaterThan(0);
    }
  });

  for (const handle of [...BOARD_HANDLES, ...ACCESSORY_HANDLES]) {
    it(`${handle} resolves to an existing PDF`, () => {
      const url = findDatasheetUrl(handle);
      expect(url, `findDatasheetUrl('${handle}') returned null`).toBeTruthy();
      // url is like /files/datasheets/CT-DS-CHA-P.pdf → public/files/datasheets/CT-DS-CHA-P.pdf
      const onDisk = resolve(`public${url}`);
      expect(existsSync(onDisk), `PDF not found: ${onDisk}`).toBe(true);
    });
  }
});
