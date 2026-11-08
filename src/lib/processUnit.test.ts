import { describe, it, expect } from 'vitest';
import { processUnitFor, PROCESS_UNITS } from './processUnit';

describe('processUnitFor', () => {
  it('maps every ceramic board to one unit, whatever the pattern or size', () => {
    const a = processUnitFor('CT-CHA-C-185X110-D6');
    const b = processUnitFor('CT-HAL-C-50X50-STD');
    const c = processUnitFor('CT-CHT-C-75X50-F');
    expect(a?.id).toBe('PU-C-CR-A');
    expect(b?.id).toBe(a?.id);
    expect(c?.goldenSample).toBe(a?.goldenSample);
  });

  it('keeps materials and processes apart', () => {
    expect(processUnitFor('CT-CHT-P-300X200-F')?.id).toBe('PU-P-UV-A');
    expect(processUnitFor('CT-CHT-G-100X100-F')?.id).toBe('PU-G-CR-A');
    expect(processUnitFor('CT-CHT-W-300X200-F')?.id).toBe('PU-W-CR-A');
    expect(processUnitFor('CT-CHT-F-50X50-F')?.id).toBe('PU-F-CR-A');
    expect(processUnitFor('CT-CHT-G-100X100-F')?.id).not.toBe(processUnitFor('CT-CHT-C-100X75-F')?.id);
  });

  it('golden sample id is derived from the unit, not the part number', () => {
    const u = processUnitFor('CT-CHA-C-110X85-D5')!;
    expect(u.goldenSample).toBe('GS-C-CR-A-01');
    expect(u.goldenSample).not.toMatch(/CHA|110X85|D5/);
  });

  it('returns null where no unit is defined yet (metal, film, services, kits)', () => {
    expect(processUnitFor('CT-DEP-M-100X100-ST3')).toBeNull();
    expect(processUnitFor('CT-RES-L-76X76-USAF')).toBeNull();
    expect(processUnitFor('CT-SVC-CERT-ILAC')).toBeNull();
    expect(processUnitFor('CT-KIT-X-001')).toBeNull();
  });

  it('returns null for an unparseable part number', () => {
    expect(processUnitFor('CHA-C-185X110')).toBeNull();
  });

  it('every unit has a distinct id and golden sample, and a plain-English label', () => {
    const ids = PROCESS_UNITS.map((u) => u.id);
    const gs = PROCESS_UNITS.map((u) => u.goldenSample);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(gs).size).toBe(gs.length);
    for (const u of PROCESS_UNITS) expect(u.label).toMatch(/^[A-Z][a-z]/);
  });
});
