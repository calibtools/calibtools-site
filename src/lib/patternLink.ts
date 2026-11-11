/**
 * Pattern links and pattern IDs.
 *
 * A pattern link is the generator URL with every parameter in the query
 * string; it reopens the exact pattern. A pattern ID (P-XXXXXX) is a short
 * hash of the parameters that define the pattern's geometry: same pattern,
 * same ID, on any page and on the server. Paper size, scale bar and other
 * display options are not part of it.
 *
 * Shared by the generator, the quote form and functions/api/quote.ts.
 * This module only serializes parameters; geometry stays in patterns.ts.
 */
import type { PatternSpec } from './patterns';

/** Default state of /tools/generator/ (parameters a link may leave out). */
export const GENERATOR_DEFAULT: PatternSpec = {
  type: 'ChArUco', rows: 7, cols: 10, square: 25, marker: 18, dict: 'DICT_6X6_250', paper: 'A4', startId: 0, scaleBar: true,
};

export const GENERATOR_PATH = '/tools/generator/';

const TYPES: readonly PatternSpec['type'][] = [
  'Checkerboard', 'ChArUco', 'AprilGrid (Kalibr)', 'Asymmetric circles', 'Symmetric circles', 'ArUco grid', 'HALCON-style dots', 'Marker sheet', 'PuzzleBoard',
];
const STR_FIELDS = ['dict', 'paper', 'aprilFamily', 'tagIdList'] as const;
const NUM_FIELDS = ['rows', 'cols', 'square', 'marker', 'startId', 'borderBits', 'tagSpacing', 'circleDiameter', 'circleSpacingX', 'circleSpacingY', 'puzzleOffsetX', 'puzzleOffsetY'] as const;
const BOOL_FIELDS = ['scaleBar', 'finderMarkers', 'radonCheckers', 'invert', 'legacyLayout', 'showTagIds', 'symmetricCorners', 'showAxes', 'monochromeAxes', 'showCornerBadge'] as const;

/** Query parameters for a spec. Booleans are written as true/false so a link never depends on page defaults. */
export function specToParams(spec: PatternSpec): URLSearchParams {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(spec) as [string, unknown][]) {
    if (v === undefined || v === null || v === '') continue;
    p.set(k, String(v));
  }
  return p;
}

/** The parameters present in a query string; unknown keys and unparsable values are dropped. */
export function specFromParams(params: URLSearchParams): Partial<PatternSpec> {
  const out: Record<string, unknown> = {};
  const type = params.get('type');
  if (type !== null && (TYPES as readonly string[]).includes(type)) out.type = type;
  for (const k of STR_FIELDS) {
    const v = params.get(k);
    if (v !== null) out[k] = v;
  }
  for (const k of NUM_FIELDS) {
    const v = params.get(k);
    if (v !== null && v.trim() !== '' && Number.isFinite(+v)) out[k] = +v;
  }
  for (const k of BOOL_FIELDS) {
    const v = params.get(k);
    if (v !== null) out[k] = v === 'true';
  }
  return out as Partial<PatternSpec>;
}

/** Link (path + query) that reopens this exact pattern in the generator. */
export function patternPath(spec: PatternSpec): string {
  return `${GENERATOR_PATH}?${specToParams(spec).toString()}`;
}

/* ---- Pattern ID ---- */

/** Same unambiguous alphabet as quote reference numbers (no 0/O, 1/I/L, U). */
const ID_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';
export const PATTERN_ID_RE = /^P-[23456789ABCDEFGHJKMNPQRSTVWXYZ]{6}$/;
export const isPatternId = (v: string): boolean => PATTERN_ID_RE.test(v);

const n = (v: number | undefined) => String(Math.round((v ?? 0) * 100) / 100);
const b = (v: boolean | undefined) => (v ? '1' : '0');

/**
 * The parameters that define the geometry, in a fixed order, with the
 * renderers' defaults filled in. Only fields the pattern type uses are
 * included, so values left over from another type do not change the ID.
 */
export function canonicalPattern(s: PatternSpec): string {
  const head = [s.type, s.rows, s.cols];
  const ids = s.tagIdList ? `list:${s.tagIdList.replace(/\s+/g, '')}` : `start:${s.startId ?? 0}`;
  switch (s.type) {
    case 'Checkerboard':
      return [...head, n(s.square), b(s.invert), b(s.finderMarkers), b(s.radonCheckers)].join('|');
    case 'ChArUco':
    case 'ArUco grid':
      return [...head, n(s.square), n(s.marker), s.dict, s.startId ?? 0, b(s.legacyLayout)].join('|');
    case 'AprilGrid (Kalibr)':
      return [...head, n(s.square), s.aprilFamily ?? '36h11', s.borderBits ?? 2, n(s.tagSpacing ?? 0.3), ids, b(s.symmetricCorners)].join('|');
    case 'Symmetric circles':
    case 'Asymmetric circles':
    case 'HALCON-style dots':
      return [...head, n(s.circleSpacingX ?? s.square), n(s.circleSpacingY ?? s.square), n(s.circleDiameter ?? s.square * 0.56), b(s.invert)].join('|');
    case 'Marker sheet':
      return [...head, n(s.marker || s.square), s.dict, s.aprilFamily ?? '', s.aprilFamily ? s.borderBits ?? 2 : '', ids].join('|');
    case 'PuzzleBoard':
      return [...head, n(s.square), s.puzzleOffsetX ?? 0, s.puzzleOffsetY ?? 0].join('|');
    default:
      return [...head, n(s.square)].join('|');
  }
}

/** 53-bit string hash (cyrb53): synchronous, identical in the browser and on the server. */
function hash53(str: string): number {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/** Pattern ID such as P-3F9A2C: same geometry, same ID. */
export function patternId(spec: PatternSpec): string {
  let h = hash53(`ct-pattern-v1|${canonicalPattern(spec)}`);
  let out = '';
  for (let i = 0; i < 6; i++) {
    out += ID_ALPHABET[h % ID_ALPHABET.length];
    h = Math.floor(h / ID_ALPHABET.length);
  }
  return `P-${out}`;
}

/** Pattern ID for a generator link (path or full calib.tools URL); '' if it is not one or carries no parameters. */
export function patternIdFromPath(link: string): string {
  const m = /^(?:https:\/\/calib\.tools)?\/tools\/generator(?:\/[a-z-]+)?\/?\?(.+)$/.exec(link.trim());
  if (!m) return '';
  const fromUrl = specFromParams(new URLSearchParams(m[1]));
  if (Object.keys(fromUrl).length === 0) return '';
  return patternId({ ...GENERATOR_DEFAULT, ...fromUrl });
}
