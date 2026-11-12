/**
 * Stock pattern targets as generator parameters, so a pattern made in the
 * generator can be matched to the exact part number (or the closest one).
 *
 * Values come from the ordering tables in docs/datasheets/CT-DS-*.md;
 * catalogPatterns.test.ts checks every part number against them and checks
 * that product URLs use option values that exist in the store.
 */
import type { PatternSpec } from './patterns';
import { GENERATOR_DEFAULT, patternPath } from './patternLink';

export interface CatalogEntry {
  partNumber: string;
  handle: string;
  /** Shopify option values, keyed by lower-case option name. */
  options: Record<string, string>;
  spec: Partial<PatternSpec> & { type: PatternSpec['type']; rows: number; cols: number; square: number };
}

const DICTS: [suffix: string, dict: string, option: string][] = [
  ['D6', 'DICT_6X6_250', 'DICT_6X6_250'],
  ['D5', 'DICT_5X5_100', 'DICT_5X5_100'],
  ['D4', 'DICT_4X4_50', 'DICT_4X4_50'],
  ['T36', 'DICT_APRILTAG_36h11', 'AprilTag 36h11'],
];

const tight = (w: number, h: number) => `${w}×${h}`;
const spaced = (w: number, h: number) => `${w} × ${h}`;

const entries: CatalogEntry[] = [];

// ChArUco, aluminum composite (CT-DS-CHA-P)
for (const [w, h, rows, cols, square, marker] of [
  [200, 150, 5, 7, 25, 18], [300, 200, 7, 10, 25, 18], [400, 300, 9, 12, 30, 22],
  [600, 400, 9, 14, 40, 30], [800, 600, 11, 15, 50, 37],
] as const) {
  for (const [sfx, dict, opt] of DICTS) {
    entries.push({
      partNumber: `CT-CHA-P-${w}X${h}-${sfx}`, handle: 'charuco-composite',
      options: { size: tight(w, h), dictionary: opt },
      spec: { type: 'ChArUco', rows, cols, square, marker, dict, startId: 0 },
    });
  }
}

// ChArUco, ceramic (CT-DS-CHA-C); the store offers D6 and D5
for (const [w, h, rows, cols, square, marker] of [
  [110, 85, 7, 10, 10, 7.5], [150, 100, 7, 11, 12.5, 9.5], [185, 110, 7, 12, 14, 10.5], [230, 140, 8, 14, 15, 11],
] as const) {
  for (const [sfx, dict, opt] of DICTS.slice(0, 2)) {
    entries.push({
      partNumber: `CT-CHA-C-${w}X${h}-${sfx}`, handle: 'charuco-ceramic',
      options: { size: tight(w, h), dictionary: opt },
      spec: { type: 'ChArUco', rows, cols, square, marker, dict, startId: 0 },
    });
  }
}

// Checkerboard, aluminum composite (CT-DS-CHT-P): fine and coarse grids
for (const [w, h, fr, fc, fs, cr, cc, cs] of [
  [200, 150, 7, 10, 18, 5, 7, 25], [300, 200, 9, 14, 20, 7, 10, 25], [400, 300, 11, 15, 25, 8, 11, 35],
  [600, 400, 12, 18, 30, 9, 14, 40], [800, 600, 13, 18, 42, 11, 15, 50],
] as const) {
  entries.push({ partNumber: `CT-CHT-P-${w}X${h}-F`, handle: 'checkerboard-composite', options: { size: tight(w, h), pattern: 'Fine' }, spec: { type: 'Checkerboard', rows: fr, cols: fc, square: fs } });
  entries.push({ partNumber: `CT-CHT-P-${w}X${h}-C`, handle: 'checkerboard-composite', options: { size: tight(w, h), pattern: 'Coarse' }, spec: { type: 'Checkerboard', rows: cr, cols: cc, square: cs } });
}

// AprilGrid, aluminum composite (CT-DS-APR-P): AprilTag 36h11, spacing ratio 0.3
for (const [w, h, rows, cols, tag] of [
  [200, 150, 4, 6, 25], [300, 200, 5, 7, 30], [400, 300, 6, 8, 35], [600, 400, 7, 10, 45], [800, 600, 9, 12, 50],
] as const) {
  entries.push({
    partNumber: `CT-APR-P-${w}X${h}-T36`, handle: 'aprilgrid-composite', options: { size: spaced(w, h) },
    spec: { type: 'AprilGrid (Kalibr)', rows, cols, square: tag, tagSpacing: 0.3, aprilFamily: '36h11', startId: 0 },
  });
}

// Circle grids, aluminum composite (CT-DS-CIR-P): spacing = pitch.
// rows × cols are positions of the square lattice the renderer walks. A symmetric grid fills
// every position. An asymmetric grid fills every other one, checkerboard-wise, so a lattice of
// R × C holds R rows of C / 2 circles; OpenCV's pattern size for it is (C / 2, R). R is odd so
// that the board does not look the same after a half turn.
// Every layout leaves at least one pitch of white between the outermost circles and the board edge.
for (const [w, h, sr, sc, ar, ac, d, pitch] of [
  [200, 150, 5, 8, 5, 8, 12, 20], [300, 200, 7, 12, 7, 12, 14, 22], [400, 300, 10, 14, 9, 14, 17, 25],
  [600, 400, 11, 18, 11, 18, 20, 30], [800, 600, 16, 22, 15, 22, 22, 33],
] as const) {
  entries.push({ partNumber: `CT-CIR-P-${w}X${h}-SYM`, handle: 'circlegrid-composite', options: { size: spaced(w, h), layout: 'Symmetric' }, spec: { type: 'Symmetric circles', rows: sr, cols: sc, square: pitch, circleDiameter: d } });
  entries.push({ partNumber: `CT-CIR-P-${w}X${h}-ASY`, handle: 'circlegrid-composite', options: { size: spaced(w, h), layout: 'Asymmetric' }, spec: { type: 'Asymmetric circles', rows: ar, cols: ac, square: pitch, circleDiameter: d } });
}

export const CATALOG: readonly CatalogEntry[] = entries;

/** Generator parameters for a stock target (merge over a full spec before use). */
export function specFromEntry(e: CatalogEntry): Partial<PatternSpec> {
  // Clear options that would make the pattern differ from the stock target.
  const reset: Partial<PatternSpec> =
    e.spec.type === 'ChArUco' ? { legacyLayout: false } :
    e.spec.type === 'Checkerboard' ? { invert: false, finderMarkers: false, radonCheckers: false } :
    e.spec.type === 'AprilGrid (Kalibr)' ? { tagIdList: undefined } :
    { circleSpacingX: undefined, circleSpacingY: undefined };
  return { ...reset, ...e.spec };
}

const eq = (a: number | undefined, b: number | undefined) => a !== undefined && b !== undefined && Math.abs(a - b) < 0.01;

function sameGeometry(s: PatternSpec, e: CatalogEntry): boolean {
  const c = e.spec;
  if (s.type !== c.type || s.rows !== c.rows || s.cols !== c.cols || !eq(s.square, c.square)) return false;
  switch (s.type) {
    case 'ChArUco':
      return eq(s.marker, c.marker) && s.dict === c.dict && (s.startId ?? 0) === 0 && !s.legacyLayout;
    case 'Checkerboard':
      return !s.invert && !s.finderMarkers && !s.radonCheckers;
    case 'AprilGrid (Kalibr)': {
      const ratio = s.tagSpacing ?? (s.marker && s.square ? s.marker / s.square : undefined);
      return eq(ratio, 0.3) && (s.aprilFamily ?? '36h11') === '36h11' && (s.startId ?? 0) === 0 && !s.tagIdList;
    }
    case 'Symmetric circles':
    case 'Asymmetric circles': {
      const d = s.circleDiameter ?? s.square * 0.56;
      const sx = s.circleSpacingX ?? s.square, sy = s.circleSpacingY ?? s.square;
      return eq(d, c.circleDiameter) && eq(sx, c.square) && eq(sy, c.square);
    }
    default:
      return false;
  }
}

/** Pattern types that have stock targets, and the families searched for "closest". */
const FAMILY: Partial<Record<PatternSpec['type'], string[]>> = {
  ChArUco: ['charuco-composite', 'charuco-ceramic'],
  Checkerboard: ['checkerboard-composite'],
  'AprilGrid (Kalibr)': ['aprilgrid-composite'],
  'Symmetric circles': ['circlegrid-composite'],
  'Asymmetric circles': ['circlegrid-composite'],
};

export interface CatalogMatch {
  /** Stock target with identical geometry, if any. */
  exact?: CatalogEntry;
  /** Nearest stock target of the same pattern type (by grid extent), if the type is stocked. */
  closest?: CatalogEntry;
}

export function matchCatalog(s: PatternSpec): CatalogMatch {
  const exact = CATALOG.find((e) => sameGeometry(s, e));
  const handles = FAMILY[s.type];
  if (!handles) return { exact };
  const pool = CATALOG.filter((e) => handles.includes(e.handle) && e.spec.type === s.type);
  // Prefer the same dictionary when the pattern has one we stock, else the default D6.
  const dictPool = s.type === 'ChArUco'
    ? (pool.some((e) => e.spec.dict === s.dict) ? pool.filter((e) => e.spec.dict === s.dict) : pool.filter((e) => e.spec.dict === 'DICT_6X6_250'))
    : pool;
  const w = s.cols * s.square, h = s.rows * s.square;
  let closest: CatalogEntry | undefined;
  let best = Infinity;
  for (const e of dictPool) {
    const d = Math.abs(e.spec.cols * e.spec.square - w) + Math.abs(e.spec.rows * e.spec.square - h);
    if (d < best) { best = d; closest = e; }
  }
  return { exact, closest: exact ?? closest };
}

/** Product page URL with the variant preselected. */
export function productUrlFor(e: CatalogEntry): string {
  const p = new URLSearchParams(e.options);
  p.set('from', 'generator');
  return `/targets/${e.handle}/?${p.toString()}`;
}

/** Generator link that opens a stock target's pattern, so it can be changed from there. */
export function generatorUrlFor(e: CatalogEntry): string {
  return patternPath({ ...GENERATOR_DEFAULT, ...specFromEntry(e) } as PatternSpec);
}

const normOpt = (s: string) => s.toLowerCase().replace(/×/g, 'x').replace(/\s+/g, '');

/** Stock target for the options selected on a product page (option names in any case). */
export function entryForOptions(handle: string, selections: Record<string, string>): CatalogEntry | undefined {
  const sel: Record<string, string> = {};
  for (const [k, v] of Object.entries(selections)) sel[k.toLowerCase()] = normOpt(v);
  return CATALOG.find((e) => e.handle === handle && Object.entries(e.options).every(([k, v]) => sel[k] === normOpt(v)));
}

const n = (v: number | undefined) => String(Math.round((v ?? 0) * 100) / 100);

/** One-line description of a pattern, for buttons and the quote form. */
export function quoteSummary(s: PatternSpec): string {
  const grid = `${s.rows} × ${s.cols}`;
  switch (s.type) {
    case 'ChArUco':
      return `ChArUco ${grid}, ${n(s.square)} / ${n(s.marker)} mm, ${s.dict}, start ID ${s.startId ?? 0}`;
    case 'Checkerboard':
      return `Checkerboard ${grid}, ${n(s.square)} mm squares`;
    case 'AprilGrid (Kalibr)':
      return `AprilGrid ${grid}, ${n(s.square)} mm tags, spacing ${n(s.tagSpacing ?? 0.3)}, tag${s.aprilFamily ?? '36h11'}`;
    case 'ArUco grid':
      return `ArUco grid ${grid}, ${n(s.marker)} mm markers, ${n(s.square - s.marker)} mm apart, ${s.dict}, start ID ${s.startId ?? 0}`;
    case 'Symmetric circles':
    case 'Asymmetric circles':
      return `${s.type} ${grid}, ⌀${n(s.circleDiameter ?? s.square * 0.56)} / ${n(s.square)} mm pitch`;
    default:
      return `${s.type} ${grid}, ${n(s.square)} mm`;
  }
}
