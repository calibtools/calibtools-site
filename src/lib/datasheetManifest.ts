/**
 * Read the docs-build manifest (public/files/manifest.json) at build time
 * and resolve datasheet URLs for products.
 *
 * The manifest is written by scripts/docs-build.mjs with shape:
 *   { generated, inputHash, files: [{ code, path, sha256, pages? }] }
 *
 * Datasheet codes follow the pattern CT-DS-{FAMILY}-{MATERIAL}[-SUFFIX].
 * Family + material are parsed from the code so the handle→code map only
 * needs to know each product's family and material letter.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/** Shape of each file entry in public/files/manifest.json */
export interface ManifestFileEntry {
  code: string;
  path: string;
  sha256: string;
  pages?: number;
}

/** Resolved datasheet record exposed to pages */
export interface DatasheetEntry {
  code: string;
  family: string;
  material: string;
  pages: number;
  url: string;
  /** Product name from the datasheet markdown frontmatter (e.g. "ChArUco Calibration Target, Aluminum Composite"). */
  name: string;
}

/** Raw manifest written by docs-build */
interface RawManifest {
  generated: string;
  inputHash: string;
  files: ManifestFileEntry[];
}

let _cache: DatasheetEntry[] | null = null;

/**
 * Read the `title` field from a datasheet markdown file's frontmatter.
 * Falls back to the code itself if the file or field is missing.
 */
function readDatasheetTitle(code: string): string {
  const mdPath = resolve('docs/datasheets', `${code}.md`);
  try {
    const src = readFileSync(mdPath, 'utf-8');
    const m = src.match(/^title:\s*(.+)$/m);
    return m ? m[1].trim() : code;
  } catch {
    return code;
  }
}

/**
 * Parse family + material from a datasheet code.
 * CT-DS-CHA-P        → { family: 'CHA', material: 'P' }
 * CT-DS-ACC-A-FIX-14 → { family: 'ACC', material: 'A' }
 */
function parseFamilyMaterial(code: string): { family: string; material: string } | null {
  // Strip the CT-DS- prefix, then take the first two segments
  const m = code.match(/^CT-DS-([A-Z]+)-([A-Z])(?:-|$)/);
  if (!m) return null;
  return { family: m[1], material: m[2] };
}

/** Load and cache all datasheet entries from the manifest. */
export function getDatasheetManifest(): DatasheetEntry[] {
  if (_cache) return _cache;
  const manifestPath = resolve('public/files/manifest.json');
  if (!existsSync(manifestPath)) {
    _cache = [];
    return [];
  }
  try {
    const raw: RawManifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    _cache = raw.files
      .filter((f) => f.code.startsWith('CT-DS-'))
      .map((f) => {
        const fm = parseFamilyMaterial(f.code)!;
        return {
          code: f.code,
          family: fm.family,
          material: fm.material,
          pages: f.pages ?? 0,
          url: f.path.startsWith('public/') ? `/${f.path.slice('public/'.length)}` : `/${f.path}`,
          name: readDatasheetTitle(f.code),
        };
      });
    return _cache;
  } catch {
    _cache = [];
    return [];
  }
}

/**
 * Handle → family-material mapping for matching datasheets to product pages.
 */
const HANDLE_TO_FAMILY_MATERIAL: Record<string, { family: string; material: string }> = {
  'charuco-composite': { family: 'CHA', material: 'P' },
  'charuco-ceramic': { family: 'CHA', material: 'C' },
  'checkerboard-composite': { family: 'CHT', material: 'P' },
  'checkerboard-ceramic': { family: 'CHT', material: 'C' },
  'aprilgrid-composite': { family: 'APR', material: 'P' },
  'circlegrid-composite': { family: 'CIR', material: 'P' },
  'halcon-composite': { family: 'HAL', material: 'P' },
  'mounting-fixture': { family: 'ACC', material: 'A' },
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
    (e) => e.family === fm.family && e.material === fm.material,
  );
  return entry?.url ?? null;
}

/**
 * Get all datasheet entries for the /files/ index page.
 */
export function getAllDatasheets(): DatasheetEntry[] {
  return getDatasheetManifest();
}
