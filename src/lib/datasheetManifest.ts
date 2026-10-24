/**
 * Read the datasheet manifest (public/files/datasheets/index.json) at build time
 * and resolve datasheet URLs for products.
 *
 * Matching logic: the manifest has family+material codes (e.g. CHA+P).
 * Products are matched by checking their first variant's SKU prefix against
 * the family-material pair, or by a handle→code lookup table.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface DatasheetEntry {
  code: string;
  title: string;
  type: string;
  rev: string;
  date: string;
  status: string;
  family: string | null;
  material: string | null;
  sha256: string;
  bytes: number;
}

let _manifest: DatasheetEntry[] | null = null;

/** Load the manifest once (cached for the build). */
export function getDatasheetManifest(): DatasheetEntry[] {
  if (_manifest) return _manifest;
  try {
    const raw = readFileSync(resolve('public/files/datasheets/index.json'), 'utf-8');
    _manifest = JSON.parse(raw);
    return _manifest!;
  } catch {
    _manifest = [];
    return [];
  }
}

/**
 * Handle → SKU-prefix mapping for matching datasheets.
 * Maps product handles to their family-material code pairs.
 */
const HANDLE_TO_FAMILY_MATERIAL: Record<string, { family: string; material: string }> = {
  'charuco-composite': { family: 'CHA', material: 'P' },
  'charuco-ceramic': { family: 'CHA', material: 'C' },
  'checkerboard-composite': { family: 'CHT', material: 'P' },
  'checkerboard-ceramic': { family: 'CHT', material: 'C' },
};

/**
 * Find a datasheet URL for a product handle.
 * Returns the URL path (e.g. /files/datasheets/CT-DS-CHA-P.pdf) or null.
 */
export function findDatasheetUrl(handle: string): string | null {
  const manifest = getDatasheetManifest();
  const fm = HANDLE_TO_FAMILY_MATERIAL[handle];
  if (!fm) return null;

  const entry = manifest.find(
    (e) => e.type === 'datasheet' && e.family === fm.family && e.material === fm.material,
  );
  if (!entry) return null;

  return `/files/datasheets/${entry.code}.pdf`;
}

/**
 * Get all datasheet entries for the /files/ index page.
 */
export function getAllDatasheets(): DatasheetEntry[] {
  return getDatasheetManifest();
}
