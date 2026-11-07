/**
 * Calib.Tools part-number grammar (Part Numbering System v3).
 *
 * Board-type families:  CT-FFF-M-SIZE-VAR[-OPT[-OPT]]
 * Accessories:          CT-ACC-M-{TYPE}{SPEC}        e.g. CT-ACC-M-FIX14
 * Services:             CT-SVC-{TYPE}[-{SPEC}]       e.g. CT-SVC-CERT-ILAC
 * Kits:                 CT-KIT-X-{NNN}               e.g. CT-KIT-X-001
 *
 * Single source of truth for parsing, building and validating part numbers.
 * The registry lives in data/part-numbers.csv; scripts/check-part-numbers.ts
 * validates every row with this module.
 */

export const BRAND = 'CT';

/** Hard limit: SAP vendor material number (IDNLF) is 35 chars; we stay well below. */
export const MAX_LENGTH = 26;
/** Soft limit for the core number (without options): fits a cart line and a label row. */
export const CORE_SOFT_LIMIT = 20;

export const FAMILIES = {
  CHT: 'Checkerboard',
  CHA: 'ChArUco',
  APR: 'AprilGrid',
  CIR: 'Circle grid',
  HAL: 'HALCON plate',
  CBM: 'Checkerboard with markers',
  VND: 'Vendor-specific pattern',
  CUB: 'Calibration cube',
  LDR: 'LiDAR reflectance',
  IRT: 'Infrared',
  LUM: 'Backlit',
  IQC: 'Image-quality chart',
  RES: 'Resolution / metrology',
  SPH: 'Sphere / ball bar',
  TCP: 'Robot TCP artifact',
  ACC: 'Accessory',
  KIT: 'Kit',
  SVC: 'Service',
  OEM: 'OEM / project',
  // v5 families (decided 2026-11-06)
  ARU: 'ArUco marker set',
  GRD: 'Grid / cross-grid distortion target',
  DEP: 'Depth step block',
  LSC: 'Line-scan strip target',
  RDR: 'Radar reflector / radar-camera target',
} as const;
export type Family = keyof typeof FAMILIES;

/** Single-letter material codes. I, O and Q are never used (confusable with 1 / 0). */
export const MATERIALS = {
  P: 'Aluminum composite',
  C: 'Alumina ceramic',
  G: 'Soda-lime glass',
  W: 'Opal (white) glass',
  F: 'Fused silica',
  K: 'Carbon fiber',
  H: 'Aluminum honeycomb',
  M: 'Metal',
  L: 'Film',
  T: 'Film laminated on glass / ceramic',
  X: 'Not applicable',
} as const;
export type Material = keyof typeof MATERIALS;

/** Allowed variant codes per board-type family (regex sources). */
export const VARIANTS: Partial<Record<Family, RegExp>> = {
  CHT: /^(F|C|G\d{1,2}X\d{1,2})$/,
  CBM: /^(F|C)$/,
  CHA: /^(D4|D5|D6|T36)$/,
  APR: /^(T36|T25)$/,
  CIR: /^(SYM|ASY|CON)$/,
  HAL: /^(STD|H12)$/,
  VND: /^(ZIV|PHO|ZEB)$/,
  CUB: /^C[3-6]$/,
  LDR: /^(R\d{1,2}|STP\d|FUS)$/,
  IRT: /^(N850|N940|LWIR|TOF)$/,
  LUM: /^(BL|IR)$/,
  IQC: /^(ESFR|SFR|SFRP|SFRN2|SFRN4|COLR|FOCS|GRY11)$/,
  RES: /^(USAF|SCL|CON|MLT|RON|STAR)$/,
  SPH: /^(BAL|BAR)$/,
  TCP: /^[A-Z0-9]{2,4}$/,
  OEM: /^[A-Z0-9]{2,6}$/,
  ARU: /^(D4|D5|D6|T36)$/,
  GRD: /^XG$/,
  DEP: /^ST[2-9]$/,
  RDR: /^(TRI|FUS)$/,
};

/** Families whose numbers have no variant segment: CT-FFF-M-SIZE[-OPT]. */
export const NO_VARIANT_FAMILIES: Family[] = ['LSC'];

/** Options allowed only on some families. */
export const OPTION_FAMILIES: Record<string, Family[]> = {
  '905': ['LDR'],
  '1550': ['LDR'],
  SFR: ['CHA'],
};

/** Options, in the only order they may appear. B1–B4 is used on labels only, never as a SKU. */
export const OPTION_ORDER = ['905', '1550', 'NEG', 'LG', 'SFR'] as const;

const SIZE_RE = /^([1-9]\d{1,3})X([1-9]\d{1,3})$|^A[0-4]$|^D[1-9]\d{0,2}$|^L[1-9]\d{1,3}$/;

/** Which size forms each board-type family may use. WH = width X height. */
export const SIZE_FORMS: Partial<Record<Family, Array<'WH' | 'A' | 'D' | 'L'>>> = {
  CHT: ['WH'], CHA: ['WH'], APR: ['WH'], CIR: ['WH'], HAL: ['WH'], CBM: ['WH'], VND: ['WH'], CUB: ['WH'],
  LDR: ['WH'], IRT: ['WH'], LUM: ['WH'], IQC: ['A', 'WH'], RES: ['WH', 'L', 'D'], SPH: ['D', 'L'], TCP: ['WH', 'D'], OEM: ['WH'],
  ARU: ['WH'], GRD: ['WH'], DEP: ['WH'], LSC: ['WH'], RDR: ['WH', 'D'],
};

/** Accessory types and service types (whitelists). */
export const ACC_TYPES = ['FIX', 'PLT', 'STD', 'FLG', 'MAG', 'CSE'] as const;
export const SVC_TYPES = /^(CERT-(ILAC|DAKKS)|RECAL|CUS-Q\d{5})$/;

function sizeForm(size: string): 'WH' | 'A' | 'D' | 'L' | null {
  if (/^\d+X\d+$/.test(size)) return 'WH';
  if (/^A\d$/.test(size)) return 'A';
  if (/^D\d+$/.test(size)) return 'D';
  if (/^L\d+$/.test(size)) return 'L';
  return null;
}

export interface PartNumber {
  family: Family;
  material: Material | '';
  size: string;
  variant: string;
  options: string[];
}

export interface ParseResult {
  ok: boolean;
  value?: PartNumber;
  errors: string[];
}

export function parse(pn: string): ParseResult {
  const errors: string[] = [];
  if (pn !== pn.toUpperCase()) errors.push('must be upper case');
  if (!/^[A-Z0-9-]+$/.test(pn)) errors.push('only A–Z, 0–9 and hyphen allowed');
  if (/--|^-|-$/.test(pn)) errors.push('empty segment');
  if (pn.length > MAX_LENGTH) errors.push(`longer than ${MAX_LENGTH} characters`);
  const seg = pn.split('-');
  if (seg[0] !== BRAND) errors.push('must start with CT-');
  const family = seg[1] as Family;
  if (!(family in FAMILIES)) {
    errors.push(`unknown family "${seg[1] ?? ''}"`);
    return { ok: false, errors };
  }

  if (family === 'SVC') {
    if (seg.length < 3 || seg.length > 4) errors.push('service format is CT-SVC-TYPE[-SPEC]');
    if (!SVC_TYPES.test(seg.slice(2).join('-'))) errors.push('unknown service type');
    const value: PartNumber = { family, material: '', size: '', variant: seg.slice(2).join('-'), options: [] };
    return { ok: errors.length === 0, value, errors };
  }
  if (family === 'ACC') {
    if (seg.length !== 4) errors.push('accessory format is CT-ACC-M-TYPESPEC');
    if (seg[2] && !(seg[2] in MATERIALS)) errors.push(`unknown material "${seg[2]}"`);
    if (seg[3] && !/^[A-Z]{3}[1-9][0-9]{0,4}[A-Z]?$/.test(seg[3])) errors.push('accessory code is 3 letters + spec, e.g. FIX14');
    if (seg[3] && !(ACC_TYPES as readonly string[]).includes(seg[3].slice(0, 3))) errors.push('unknown accessory type');
    const value: PartNumber = { family, material: (seg[2] ?? '') as Material, size: '', variant: seg[3] ?? '', options: [] };
    return { ok: errors.length === 0, value, errors };
  }
  if (family === 'KIT') {
    if (seg.length !== 4 || seg[2] !== 'X' || !/^\d{3}$/.test(seg[3] ?? '') || seg[3] === '000') errors.push('kit format is CT-KIT-X-NNN (001–999)');
    const value: PartNumber = { family, material: 'X', size: '', variant: seg[3] ?? '', options: [] };
    return { ok: errors.length === 0, value, errors };
  }

  // Board-type families
  const noVariant = NO_VARIANT_FAMILIES.includes(family);
  if (noVariant) {
    if (seg.length < 4 || seg.length > 6) errors.push('format is CT-FFF-M-SIZE[-OPT[-OPT]]');
  } else if (seg.length < 5 || seg.length > 7) errors.push('format is CT-FFF-M-SIZE-VAR[-OPT[-OPT]]');
  const [, , material, size] = seg;
  const variant = noVariant ? '' : seg[4];
  const options = seg.slice(noVariant ? 4 : 5);
  if (!material || !(material in MATERIALS)) errors.push(`unknown material "${material ?? ''}"`);
  if (material === 'X') errors.push('material X is not allowed for board-type families');
  if (!size || !SIZE_RE.test(size)) errors.push(`bad size "${size ?? ''}" (use 300X200, A3, D25 or L300)`);
  if (size && /(^|[A-Z])0\d/.test(size)) errors.push('no leading zeros in size');
  const m = size?.match(/^(\d+)X(\d+)$/);
  if (m && Number(m[1]) < Number(m[2])) errors.push('size is width X height with width ≥ height (landscape)');
  const form = size ? sizeForm(size) : null;
  if (form && SIZE_FORMS[family] && !SIZE_FORMS[family]!.includes(form)) errors.push(`size form ${form} not allowed for ${family}`);
  const vre = VARIANTS[family];
  if (!noVariant && (!variant || (vre && !vre.test(variant)))) errors.push(`variant "${variant ?? ''}" not allowed for ${family}`);
  if (variant && /(^|[A-Z])0\d/.test(variant)) errors.push('no leading zeros in variant');
  if (variant && /^(G0X|G\d+X0$|STP0$|R0$|C0$)/.test(variant)) errors.push('zero count in variant');
  let last = -1;
  for (const o of options) {
    const idx = OPTION_ORDER.indexOf(o as (typeof OPTION_ORDER)[number]);
    if (idx === -1) errors.push(`unknown option "${o}"`);
    else if (idx <= last) errors.push('options out of order or repeated');
    last = Math.max(last, idx);
  }
  for (const o of options) {
    const fams = OPTION_FAMILIES[o];
    if (fams && !fams.includes(family)) errors.push(o === '905' || o === '1550' ? 'wavelength option only for LDR' : `option ${o} only for ${fams.join(', ')}`);
  }
  if (options.includes('905') && options.includes('1550')) errors.push('905 and 1550 are mutually exclusive');
  const value: PartNumber = { family, material: (material ?? '') as Material, size: size ?? '', variant: variant ?? '', options };
  return { ok: errors.length === 0, value, errors };
}

export function build(p: PartNumber): string {
  if (p.family === 'SVC') return [BRAND, 'SVC', p.variant].join('-');
  if (p.family === 'ACC') return [BRAND, 'ACC', p.material, p.variant].join('-');
  if (p.family === 'KIT') return [BRAND, 'KIT', 'X', p.variant].join('-');
  if (NO_VARIANT_FAMILIES.includes(p.family)) return [BRAND, p.family, p.material, p.size, ...p.options].join('-');
  return [BRAND, p.family, p.material, p.size, p.variant, ...p.options].join('-');
}

/** Core = number without options. */
export function core(pn: string): string {
  const r = parse(pn);
  if (!r.value || ['SVC', 'ACC', 'KIT'].includes(r.value.family)) return pn;
  return build({ ...r.value, options: [] });
}

/** Lower-case file stem used for configuration files, e.g. ct-cha-p-300x200-d6. */
export function fileStem(pn: string): string {
  return pn.toLowerCase();
}
