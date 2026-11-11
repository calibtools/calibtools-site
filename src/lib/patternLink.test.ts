import { describe, it, expect } from 'vitest';
import { patternId, isPatternId, specToParams, specFromParams, patternPath, patternIdFromPath, GENERATOR_DEFAULT } from './patternLink';
import { CATALOG, specFromEntry, generatorUrlFor, entryForOptions } from './catalogPatterns';
import { markerForSquare } from './boardSizes';
import type { PatternSpec } from './patterns';

const base: PatternSpec = { ...GENERATOR_DEFAULT };

describe('patternId', () => {
  it('has the form P-XXXXXX with unambiguous characters', () => {
    const id = patternId(base);
    expect(id).toMatch(/^P-[23456789ABCDEFGHJKMNPQRSTVWXYZ]{6}$/);
    expect(isPatternId(id)).toBe(true);
    expect(isPatternId('P-000000')).toBe(false);
  });

  it('is stable: same parameters, same ID (pinned value)', () => {
    expect(patternId(base)).toBe(patternId({ ...base }));
    // Pinned so an accidental change to the canonical form or the hash is caught:
    // IDs already quoted in emails must keep pointing at the same pattern.
    expect(patternId(base)).toMatchInlineSnapshot(`"P-R3T7P6"`);
  });

  it('ignores paper, scale bar and display-only options', () => {
    const id = patternId(base);
    expect(patternId({ ...base, paper: 'A3' })).toBe(id);
    expect(patternId({ ...base, scaleBar: false })).toBe(id);
    expect(patternId({ ...base, showAxes: false, monochromeAxes: true, showCornerBadge: false, showTagIds: true })).toBe(id);
  });

  it('ignores parameters another pattern type left behind', () => {
    const cb: PatternSpec = { ...base, type: 'Checkerboard' };
    expect(patternId({ ...cb, marker: 3, dict: 'DICT_4X4_50', startId: 40, legacyLayout: true, circleDiameter: 9 })).toBe(patternId(cb));
  });

  it('changes with every geometry parameter of a ChArUco board', () => {
    const id = patternId(base);
    const variants: Partial<PatternSpec>[] = [
      { rows: 8 }, { cols: 11 }, { square: 25.5 }, { marker: 17 }, { dict: 'DICT_5X5_100' }, { startId: 35 }, { legacyLayout: true }, { type: 'ArUco grid' },
    ];
    const ids = variants.map((v) => patternId({ ...base, ...v }));
    for (const v of ids) expect(v).not.toBe(id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('treats rows × cols as ordered', () => {
    expect(patternId({ ...base, rows: 10, cols: 7 })).not.toBe(patternId(base));
  });

  it('applies the renderer defaults: explicit default equals omitted', () => {
    const ag: PatternSpec = { ...base, type: 'AprilGrid (Kalibr)', rows: 6, cols: 6, square: 30 };
    expect(patternId({ ...ag, tagSpacing: 0.3, aprilFamily: '36h11', borderBits: 2 })).toBe(patternId(ag));
    expect(patternId({ ...ag, tagSpacing: 0.25 })).not.toBe(patternId(ag));
    const ci: PatternSpec = { ...base, type: 'Symmetric circles', square: 20 };
    expect(patternId({ ...ci, circleDiameter: 11.2, circleSpacingX: 20, circleSpacingY: 20 })).toBe(patternId(ci));
    expect(patternId({ ...ci, circleDiameter: 12 })).not.toBe(patternId(ci));
  });

  it('gives every stock target its own ID', () => {
    const ids = CATALOG.map((e) => patternId({ ...base, ...specFromEntry(e) } as PatternSpec));
    // Composite and ceramic boards never share a geometry, so all are distinct.
    expect(new Set(ids).size).toBe(CATALOG.length);
  });

  it('does not collide over a few thousand generated patterns', () => {
    const ids = new Set<string>();
    let n = 0;
    for (let rows = 3; rows <= 14; rows++) for (let cols = 3; cols <= 16; cols++) for (const square of [10, 12.5, 15, 20, 25, 30, 40]) for (const dict of ['DICT_4X4_50', 'DICT_5X5_100', 'DICT_6X6_250']) {
      ids.add(patternId({ ...base, rows, cols, square, marker: square * 0.7, dict })); n++;
    }
    expect(n).toBeGreaterThan(3000);
    expect(ids.size).toBe(n);
  });
});

describe('pattern links', () => {
  it('default state matches the generator (marker follows the square size rule)', () => {
    expect(GENERATOR_DEFAULT.marker).toBe(markerForSquare(GENERATOR_DEFAULT.square));
  });

  it('round-trips a spec through the query string, false booleans included', () => {
    const s: PatternSpec = { ...base, scaleBar: false, legacyLayout: true, startId: 17, square: 22.5, showAxes: false };
    const back = { ...GENERATOR_DEFAULT, ...specFromParams(new URLSearchParams(specToParams(s).toString())) };
    expect(back).toEqual(s);
  });

  it('round-trips the pattern type with spaces and brackets', () => {
    const s: PatternSpec = { ...base, type: 'AprilGrid (Kalibr)', tagIdList: '0-9,15,20-24' };
    const path = patternPath(s);
    expect(path).toMatch(/^\/tools\/generator\/\?[A-Za-z0-9_.~%=&+-]*$/); // accepted by the quote form and API
    expect(patternIdFromPath(path)).toBe(patternId(s));
  });

  it('ignores unknown parameters and bad numbers', () => {
    const got = specFromParams(new URLSearchParams('rows=abc&cols=9&evil=1&beta=puzzle&type=Nope'));
    expect(got).toEqual({ cols: 9 });
  });

  it('patternIdFromPath: same ID from a link as from the spec; empty for anything else', () => {
    const s: PatternSpec = { ...base, rows: 9, cols: 12, square: 30, marker: 22 };
    expect(patternIdFromPath(patternPath(s))).toBe(patternId(s));
    expect(patternIdFromPath(`https://calib.tools${patternPath(s)}`)).toBe(patternId(s));
    expect(patternIdFromPath('/tools/generator/')).toBe('');
    expect(patternIdFromPath('/quote/?rows=3')).toBe('');
    expect(patternIdFromPath('')).toBe('');
  });

  it('a link made on a preset page gives the same ID as on the main generator page', () => {
    const s: PatternSpec = { ...base, type: 'Checkerboard', rows: 9, cols: 14, square: 20 };
    const q = specToParams(s).toString();
    expect(patternIdFromPath(`/tools/generator/checkerboard/?${q}`)).toBe(patternIdFromPath(`/tools/generator/?${q}`));
  });
});

describe('product page → generator', () => {
  it('every stock target opens in the generator as exactly that pattern', () => {
    for (const e of CATALOG) {
      const url = generatorUrlFor(e);
      expect(url, e.partNumber).toMatch(/^\/tools\/generator\/\?/);
      expect(patternIdFromPath(url), e.partNumber).toBe(patternId({ ...base, ...specFromEntry(e) } as PatternSpec));
    }
  });

  it('finds the stock target for the options selected on a product page', () => {
    const e = entryForOptions('charuco-composite', { Size: '300×200', Dictionary: 'DICT_5X5_100' });
    expect(e?.partNumber).toBe('CT-CHA-P-300X200-D5');
    // Spacing and the multiplication sign are normalized, as in the variant picker
    expect(entryForOptions('aprilgrid-composite', { Size: '400x300' })?.partNumber).toBe('CT-APR-P-400X300-T36');
    expect(entryForOptions('checkerboard-composite', { Size: '200×150', Pattern: 'Coarse' })?.partNumber).toBe('CT-CHT-P-200X150-C');
    expect(entryForOptions('charuco-composite', { Size: '999×999', Dictionary: 'DICT_5X5_100' })).toBeUndefined();
    expect(entryForOptions('mounting-fixture', {})).toBeUndefined();
  });
});
