/**
 * ChArUco and ArUco grid with OpenCV's DICT_APRILTAG_* dictionaries: the markers carry the family's bits,
 * laid out as ArUco markers with a one-cell border. They were once drawn as solid black squares.
 */
import { describe, it, expect } from 'vitest';
import { renderCharucoSvg, renderArucoGridSvg, charucoMarkers } from './renderCharuco';
import { getMarkerDict, getAprilFamily, decodeAprilBits, decodeMarkerBits, getArUcoDict } from './dicts/dicts';
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
