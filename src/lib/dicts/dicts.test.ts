import { describe, it, expect } from 'vitest';
import {
  getArUcoDict, decodeMarkerBits, arucoDictNames,
  getAprilFamily, decodeAprilBits, aprilFamilyNames,
} from './dicts';

// ArUco checksums from scripts/gen-dicts.py
const ARUCO_CHECKSUMS: Record<string, {marker0: string; marker1: string}> = {
  "DICT_4X4_50": { marker0: "b532eb484cad12d7", marker1: "0f9a654759f0e2a6" },
  "DICT_5X5_100": { marker0: "a2d95e00522ed9013d4da201cdba2500", marker1: "0e037300b0c685006760380050b18601" },
  "DICT_6X6_250": { marker0: "1e3dd82a06e3ba4631096541bbc70898c625dc07", marker1: "0efba38901d7e618050e891c5df7007a01867e0b" },
  "DICT_7X7_1000": { marker0: "dd5c6ca5ca0a0163b3ade431b400a829d29b1d5d0116c613dae6e300", marker1: "e41bf13e40ab0011fd890bb52a016a813e47ec1301aa56e848dfc400" },
  "DICT_ARUCO_ORIGINAL": { marker0: "8421080000000f0108421001f8000000", marker1: "84210b0108420f01e8421001f8210800" },
  "DICT_ARUCO_MIP_36h12": { marker0: "d2b63a090d45685db704b905c6d40b2edba16a02", marker1: "6001134e051c62609801a72c8800068190646308" },
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
