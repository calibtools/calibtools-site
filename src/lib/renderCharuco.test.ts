/**
 * ChArUco and ArUco grid with OpenCV's DICT_APRILTAG_* dictionaries: the markers carry the family's bits,
 * laid out as ArUco markers with a one-cell border. They were once drawn as solid black squares.
 */
import { describe, it, expect } from 'vitest';
import { renderCharucoSvg, renderArucoGridSvg, charucoMarkers, markerCapacity } from './renderCharuco';
import { getMarkerDict, getAprilFamily, decodeAprilBits, decodeMarkerBits, getArUcoDict, largerDictFor } from './dicts/dicts';
import { CATALOG, specFromEntry } from './catalogPatterns';
import { GENERATOR_DEFAULT } from './patternLink';
import type { PatternSpec } from './patterns';

const BASE: PatternSpec = { ...GENERATOR_DEFAULT, type: 'ChArUco', rows: 5, cols: 7, square: 25, marker: 18, dict: 'DICT_APRILTAG_36h11', startId: 0 };

/** White cells of one marker, as [row, col] inside the bit grid, read back from the drawn rects. */
function whiteCells(svg: string, mx: number, my: number, size: number, n: number): Set<string> {
  const cell = size / (n + 2);
  const out = new Set<string>();
  for (const m of svg.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)" fill="#fff"\/>/g)) {
    const x = Number(m[1]), y = Number(m[2]);
    if (x < mx - 1e-6 || y < my - 1e-6 || x > mx + size || y > my + size) continue;
    out.add(`${Math.round((y - my) / cell) - 1},${Math.round((x - mx) / cell) - 1}`);
  }
  return out;
}

describe('getMarkerDict', () => {
  it('returns the plain ArUco dictionaries unchanged', () => {
    expect(getMarkerDict('DICT_6X6_250')).toBe(getArUcoDict('DICT_6X6_250'));
    expect(getMarkerDict('DICT_NOPE')).toBeUndefined();
  });

  it.each(['16h5', '25h9', '36h11'])('DICT_APRILTAG_%s carries every code of the family, bit for bit', (fam) => {
    const family = getAprilFamily(fam)!;
    const dict = getMarkerDict(`DICT_APRILTAG_${fam}`)!;
    expect(dict.markerSize).toBe(family.d);
    expect(dict.count).toBe(family.count);
    for (let id = 0; id < family.count; id++) {
      expect(decodeMarkerBits(dict.bits[id], dict.markerSize)).toEqual(decodeAprilBits(family.codes[id], family.d, family.bit_x, family.bit_y));
    }
  });

  it('has no data for a family whose bit layout is not on hand', () => {
    expect(getMarkerDict('DICT_APRILTAG_41h12')).toBeUndefined();
  });
});

describe('ChArUco with DICT_APRILTAG_36h11', () => {
  it('draws every marker with the bits of its tag, not a solid square', () => {
    const svg = renderCharucoSvg(BASE, 0, 0);
    const family = getAprilFamily('36h11')!;
    const markers = charucoMarkers(BASE);
    expect(markers.length).toBe(17);
    for (const m of markers) {
      const want = new Set<string>();
      decodeAprilBits(family.codes[m.id], 6, family.bit_x, family.bit_y).forEach((row, r) => row.forEach((b, c) => { if (b) want.add(`${r},${c}`); }));
      expect(want.size).toBeGreaterThan(0);
      expect(whiteCells(svg, m.x, m.y, m.size, 6)).toEqual(want);
    }
  });

  it('honors the start ID', () => {
    const a = renderCharucoSvg(BASE, 0, 0), b = renderCharucoSvg({ ...BASE, startId: 100 }, 0, 0);
    expect(a).not.toBe(b);
  });

  it('every AprilTag 36h11 ChArUco part number in the catalog is drawn with coded markers', () => {
    const entries = CATALOG.filter((e) => e.spec.type === 'ChArUco' && /-T36$/.test(e.partNumber));
    expect(entries.length).toBe(5);
    for (const e of entries) {
      const spec = { ...GENERATOR_DEFAULT, ...specFromEntry(e) } as PatternSpec;
      expect(spec.dict).toBe('DICT_APRILTAG_36h11');
      const dict = getMarkerDict(spec.dict)!;
      const svg = renderCharucoSvg(spec, 0, 0);
      for (const m of charucoMarkers(spec)) {
        expect(m.id, e.partNumber).toBeLessThan(dict.count);
        expect(whiteCells(svg, m.x, m.y, m.size, dict.markerSize).size, `${e.partNumber} marker ${m.id}`).toBeGreaterThan(0);
      }
    }
  });
});

describe('ArUco grid with DICT_APRILTAG_36h11', () => {
  it('draws coded markers', () => {
    const svg = renderArucoGridSvg({ ...BASE, type: 'ArUco grid', rows: 2, cols: 3, square: 30, marker: 24 }, 0, 0);
    expect((svg.match(/fill="#fff"/g) ?? []).length).toBeGreaterThan(6);
  });
});

describe('markerCapacity', () => {
  const big: PatternSpec = { ...BASE, rows: 9, cols: 12, square: 30, marker: 22, dict: 'DICT_4X4_50' };

  it('reports a ChArUco grid that needs more markers than the dictionary has', () => {
    expect(markerCapacity(big)).toEqual({ firstId: 0, lastId: 53, count: 50, short: true });
  });

  it('is fine when the last ID is the last marker of the dictionary', () => {
    expect(markerCapacity({ ...big, cols: 11 })).toEqual({ firstId: 0, lastId: 48, count: 50, short: false });
    expect(markerCapacity({ ...big, cols: 11, startId: 1 })).toEqual({ firstId: 1, lastId: 49, count: 50, short: false });
    expect(markerCapacity({ ...big, cols: 11, startId: 2 })!.short).toBe(true);
  });

  it('counts one marker per cell for an ArUco grid', () => {
    expect(markerCapacity({ ...big, type: 'ArUco grid', rows: 5, cols: 10 })).toEqual({ firstId: 0, lastId: 49, count: 50, short: false });
    expect(markerCapacity({ ...big, type: 'ArUco grid', rows: 6, cols: 10 })!.short).toBe(true);
  });

  it('covers the AprilTag dictionaries', () => {
    expect(markerCapacity({ ...BASE, rows: 11, cols: 15 })).toEqual({ firstId: 0, lastId: 81, count: 587, short: false });
  });

  it('says nothing for patterns without a dictionary', () => {
    expect(markerCapacity({ ...BASE, type: 'Checkerboard' })).toBeNull();
  });

  it('the same marker beyond the dictionary is what the renderer draws solid', () => {
    const svg = renderCharucoSvg(big, 0, 0);
    const last = charucoMarkers(big).at(-1)!;
    expect(last.id).toBe(53);
    expect(whiteCells(svg, last.x, last.y, last.size, 4).size).toBe(0);
    const ok = renderCharucoSvg({ ...big, dict: 'DICT_4X4_100' }, 0, 0);
    expect(whiteCells(ok, last.x, last.y, last.size, 4).size).toBeGreaterThan(0);
  });
});

describe('largerDictFor', () => {
  it('names the smallest dictionary of the same marker size that holds the IDs', () => {
    expect(largerDictFor('DICT_4X4_50', 54)).toBe('DICT_4X4_100');
    expect(largerDictFor('DICT_4X4_50', 101)).toBe('DICT_4X4_250');
    expect(largerDictFor('DICT_4X4_100', 101)).toBe('DICT_4X4_250');
    expect(largerDictFor('DICT_5X5_100', 150)).toBe('DICT_5X5_1000');
  });

  it('has nothing to offer when no larger dictionary of that size is on hand', () => {
    expect(largerDictFor('DICT_4X4_250', 300)).toBeUndefined();
    expect(largerDictFor('DICT_6X6_250', 300)).toBeUndefined();
    expect(largerDictFor('DICT_NOPE', 10)).toBeUndefined();
  });

  it('the larger 4 × 4 dictionaries start with the same 50 markers', () => {
    const a = getArUcoDict('DICT_4X4_50')!, b = getArUcoDict('DICT_4X4_100')!, c = getArUcoDict('DICT_4X4_250')!;
    expect(b.count).toBe(100);
    expect(c.count).toBe(250);
    expect(b.bits.slice(0, 50)).toEqual(a.bits);
    expect(c.bits.slice(0, 100)).toEqual(b.bits);
  });
});

describe('markerCapacity: AprilGrid tag families run out like dictionaries', () => {
  const grid = { type: 'AprilGrid (Kalibr)', rows: 6, cols: 6, square: 30, marker: 0, dict: '', paper: 'A3', startId: 0, scaleBar: true } as const;
  it('tag16h5 has 30 tags: a 6 x 6 grid is short, a 5 x 6 grid fits', () => {
    expect(markerCapacity({ ...grid, aprilFamily: '16h5' })).toEqual({ firstId: 0, lastId: 35, count: 30, short: true });
    expect(markerCapacity({ ...grid, aprilFamily: '16h5', rows: 5 })).toEqual({ firstId: 0, lastId: 29, count: 30, short: false });
    expect(markerCapacity({ ...grid, aprilFamily: '16h5', rows: 5, startId: 1 })!.short).toBe(true);
  });
  it('tag25h9 has 35 tags; tag36h11 (the default) has 587', () => {
    expect(markerCapacity({ ...grid, aprilFamily: '25h9' })).toMatchObject({ count: 35, short: true });
    expect(markerCapacity({ ...grid, aprilFamily: '25h9', rows: 5, cols: 7 })).toMatchObject({ count: 35, short: false });
    expect(markerCapacity(grid)).toMatchObject({ count: 587, short: false });
  });
});

