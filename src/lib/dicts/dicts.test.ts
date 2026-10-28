import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import {
  getArUcoDict, decodeMarkerBits, arucoDictNames,
  getAprilFamily, decodeAprilBits, aprilFamilyNames,
} from './dicts';

// ArUco checksums — regenerated from OpenCV generateImageMarker (row-major MSB-first)
const ARUCO_CHECKSUMS: Record<string, {marker0: string; marker1: string}> = {
  "DICT_4X4_50": { marker0: "b0503020", marker1: "00f090a0" },
  "DICT_5X5_100": { marker0: "a05860a8e0", marker1: "08c008b830" },
  "DICT_6X6_250": { marker0: "1c8cdc602898", marker1: "0cbcb88c8844" },
  "DICT_7X7_1000": { marker0: "dcae1a945c502a", marker1: "e40cfc26e404ac" },
  "DICT_ARUCO_ORIGINAL": { marker0: "8080808080", marker1: "80808080b8" },
  "DICT_ARUCO_MIP_36h12": { marker0: "d0ac60e80874", marker1: "6000104c4c94" },
};

// AprilTag checksums from scripts/gen-apriltag.mjs
const APRILTAG_CHECKSUMS: Record<string, {code0: string; code1: string}> = {
  "16h5": { code0: "00000000000027c8", code1: "00000000000031b6" },
  "25h9": { code0: "000000000156f1f4", code1: "0000000001f28cd5" },
  "36h11": { code0: "0000000d7e00984b", code1: "0000000dda664ca7" },
  "41h12": { code0: "000001bd8a64ad10", code1: "000001bdc4f3b2d5" },
  "52h13": { code0: "0004064a19651ff1", code1: "0004064a53f425b6" },
};

describe('ArUco dictionaries', () => {
  it('all 6 dictionaries load', () => {
    const names = arucoDictNames();
    expect(names).toHaveLength(6);
    expect(names).toContain('DICT_6X6_250');
    expect(names).toContain('DICT_7X7_1000');
    expect(names).toContain('DICT_ARUCO_MIP_36h12');
  });

  it('DICT_6X6_250 has markerSize 6 and 250 markers', () => {
    const d = getArUcoDict('DICT_6X6_250')!;
    expect(d.markerSize).toBe(6);
    expect(d.count).toBe(250);
    expect(d.bits).toHaveLength(250);
  });

  it('DICT_7X7_1000 has markerSize 7 and 1000 markers', () => {
    const d = getArUcoDict('DICT_7X7_1000')!;
    expect(d.markerSize).toBe(7);
    expect(d.count).toBe(1000);
  });

  it('marker 0 and 1 checksums match for each dictionary', () => {
    for (const [name, expected] of Object.entries(ARUCO_CHECKSUMS)) {
      const d = getArUcoDict(name)!;
      expect(d, `dictionary ${name} should exist`).toBeDefined();
      expect(d.bits[0]).toBe(expected.marker0);
      expect(d.bits[1]).toBe(expected.marker1);
    }
  });

  it('decodeMarkerBits returns correct grid size', () => {
    const d = getArUcoDict('DICT_6X6_250')!;
    const grid = decodeMarkerBits(d.bits[0], d.markerSize);
    expect(grid).toHaveLength(6);
    expect(grid[0]).toHaveLength(6);
    grid.flat().forEach(b => expect(b === 0 || b === 1).toBe(true));
  });

  it('getArUcoDict returns undefined for unknown name', () => {
    expect(getArUcoDict('DICT_FAKE')).toBeUndefined();
  });

  it('decodeMarkerBits matches OpenCV reference PNGs', async () => {
    const fixtureDir = resolve(__dirname, '../../../tests/fixtures/aruco');
    const cases: { dict: string; id: number; markerSize: number }[] = [
      { dict: 'DICT_4X4_50', id: 0, markerSize: 4 },
      { dict: 'DICT_4X4_50', id: 1, markerSize: 4 },
      { dict: 'DICT_6X6_250', id: 0, markerSize: 6 },
      { dict: 'DICT_6X6_250', id: 1, markerSize: 6 },
      { dict: 'DICT_6X6_250', id: 249, markerSize: 6 },
      { dict: 'DICT_7X7_1000', id: 0, markerSize: 7 },
      { dict: 'DICT_7X7_1000', id: 999, markerSize: 7 },
      { dict: 'DICT_ARUCO_ORIGINAL', id: 0, markerSize: 5 },
      { dict: 'DICT_ARUCO_MIP_36h12', id: 0, markerSize: 6 },
    ];

    for (const { dict, id, markerSize } of cases) {
      const pngPath = resolve(fixtureDir, `${dict}_id${id}.png`);
      if (!existsSync(pngPath)) continue;

      // Read reference PNG and extract inner data bits
      const { data, info } = await sharp(pngPath)
        .greyscale()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const cell = info.width / (markerSize + 2);
      const refGrid: number[][] = [];
      for (let r = 0; r < markerSize; r++) {
        const row: number[] = [];
        for (let c = 0; c < markerSize; c++) {
          const y = Math.floor((r + 1) * cell + cell / 2);
          const x = Math.floor((c + 1) * cell + cell / 2);
          row.push(data[y * info.width + x] > 127 ? 1 : 0);
        }
        refGrid.push(row);
      }

      // Decode from our JSON data
      const d = getArUcoDict(dict)!;
      const ourGrid = decodeMarkerBits(d.bits[id], d.markerSize);

      expect(ourGrid, `${dict} id ${id}`).toEqual(refGrid);
    }
  });
});

describe('AprilTag families', () => {
  it('all 5 families load', () => {
    const names = aprilFamilyNames();
    expect(names).toHaveLength(5);
    expect(names).toContain('36h11');
    expect(names).toContain('16h5');
  });

  it('36h11 has 587 codes and d=6', () => {
    const f = getAprilFamily('36h11')!;
    expect(f.d).toBe(6);
    expect(f.count).toBe(587);
    expect(f.codes).toHaveLength(587);
  });

  it('code 0 and 1 checksums match for each family', () => {
    for (const [name, expected] of Object.entries(APRILTAG_CHECKSUMS)) {
      const f = getAprilFamily(name)!;
      expect(f, `family ${name} should exist`).toBeDefined();
      expect(f.codes[0]).toBe(expected.code0);
      expect(f.codes[1]).toBe(expected.code1);
    }
  });

  it('decodeAprilBits returns correct grid size', () => {
    const f = getAprilFamily('36h11')!;
    const grid = decodeAprilBits(f.codes[0], f.d);
    expect(grid).toHaveLength(6);
    expect(grid[0]).toHaveLength(6);
    grid.flat().forEach(b => expect(b === 0 || b === 1).toBe(true));
  });

  it('getAprilFamily returns undefined for unknown name', () => {
    expect(getAprilFamily('99h99')).toBeUndefined();
  });
});
