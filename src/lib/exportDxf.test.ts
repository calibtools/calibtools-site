import { describe, it, expect } from 'vitest';
import { exportDxf } from './exportDxf';
import type { PatternSpec } from './patterns';

const spec: PatternSpec = {
  type: 'ChArUco', rows: 7, cols: 10, square: 25, marker: 18,
  dict: 'DICT_6X6_250', paper: 'A4', startId: 0, scaleBar: true,
};

describe('exportDxf', () => {
  it('starts with 999 comment containing brand line', () => {
    const dxf = exportDxf({ spec, pw: 210, ph: 297 });
    const lines = dxf.split('\n');
    expect(lines[0]).toBe('999');
    expect(lines[1]).toContain('calib.tools');
  });

  it('contains HEADER section with R12 version', () => {
    const dxf = exportDxf({ spec, pw: 210, ph: 297 });
    expect(dxf).toContain('HEADER');
    expect(dxf).toContain('AC1009');
  });

  it('defines CALIBTOOLS_BRAND layer', () => {
    const dxf = exportDxf({ spec, pw: 210, ph: 297 });
    expect(dxf).toContain('CALIBTOOLS_BRAND');
  });

  it('has SOLID entities on layer 0 for pattern', () => {
    const dxf = exportDxf({ spec, pw: 210, ph: 297 });
    // Find SOLID entities followed by layer 0
    const solidOnZero = dxf.match(/\n0\nSOLID\n8\n0\n/g);
    expect(solidOnZero).not.toBeNull();
    expect(solidOnZero!.length).toBeGreaterThan(0);
  });

  it('has TEXT entities on CALIBTOOLS_BRAND layer', () => {
    const dxf = exportDxf({ spec, pw: 210, ph: 297 });
    expect(dxf).toContain('TEXT\n8\nCALIBTOOLS_BRAND');
  });

  it('has brand SOLID entities on CALIBTOOLS_BRAND layer', () => {
    const dxf = exportDxf({ spec, pw: 210, ph: 297 });
    expect(dxf).toContain('SOLID\n8\nCALIBTOOLS_BRAND');
  });

  it('ends with EOF', () => {
    const dxf = exportDxf({ spec, pw: 210, ph: 297 });
    expect(dxf.trimEnd()).toMatch(/\n0\nEOF$/);
  });

  it('contains INSUNITS set to 4 (mm)', () => {
    const dxf = exportDxf({ spec, pw: 210, ph: 297 });
    expect(dxf).toContain('$INSUNITS');
    expect(dxf).toContain('\n70\n4\n');
  });

  it('contains TABLES section with layer definitions', () => {
    const dxf = exportDxf({ spec, pw: 210, ph: 297 });
    expect(dxf).toContain('TABLES');
    expect(dxf).toContain('LAYER');
  });

  it('has correct number of pattern SOLID entities for ChArUco 7x10', () => {
    const dxf = exportDxf({ spec, pw: 210, ph: 297 });
    // Black squares: (r+c) % 2 === 0 → ceil(7*10/2) = 35
    // Marker background squares: (r+c) % 2 === 1 → floor(7*10/2) = 35
    // Total SOLID entities on layer 0 = 35 (black) + 35 (marker bg) = 70
    const solidOnZero = dxf.match(/\n0\nSOLID\n8\n0\n/g);
    expect(solidOnZero).not.toBeNull();
    expect(solidOnZero!.length).toBe(70);
  });

  it('has POLYLINE entities for wordmark on CALIBTOOLS_BRAND layer', () => {
    const dxf = exportDxf({ spec, pw: 210, ph: 297 });
    expect(dxf).toContain('POLYLINE\n8\nCALIBTOOLS_BRAND');
    // At least one SEQEND for closing polylines
    expect(dxf).toContain('SEQEND');
  });

  it('has SOLID entities for wordmark frame/dot on CALIBTOOLS_BRAND layer', () => {
    const dxf = exportDxf({ spec, pw: 210, ph: 297 });
    // 8 frame rects + 1 dot = 9 SOLID on brand layer
    const brandSolids = dxf.match(/\n0\nSOLID\n8\nCALIBTOOLS_BRAND\n/g);
    expect(brandSolids).not.toBeNull();
    expect(brandSolids!.length).toBe(9);
  });

  it('works for Checkerboard pattern type', () => {
    const cbSpec: PatternSpec = { ...spec, type: 'Checkerboard' };
    const dxf = exportDxf({ spec: cbSpec, pw: 210, ph: 297 });
    expect(dxf.split('\n')[0]).toBe('999');
    expect(dxf.trimEnd()).toMatch(/\n0\nEOF$/);
  });

  it('works for circle pattern types with CIRCLE entities', () => {
    const circSpec: PatternSpec = { ...spec, type: 'Symmetric circles' };
    const dxf = exportDxf({ spec: circSpec, pw: 210, ph: 297 });
    expect(dxf).toContain('\n0\nCIRCLE\n');
  });

  it('uses CIRCLE entities for Asymmetric circles', () => {
    const asymSpec: PatternSpec = { ...spec, type: 'Asymmetric circles' };
    const dxf = exportDxf({ spec: asymSpec, pw: 210, ph: 297 });
    expect(dxf).toContain('\n0\nCIRCLE\n');
    // Asymmetric circles only draw on (r+c) % 2 === 0 → 35 circles for 7x10
    const circles = dxf.match(/\n0\nCIRCLE\n8\n0\n/g);
    expect(circles).not.toBeNull();
    expect(circles!.length).toBe(35);
  });
});
