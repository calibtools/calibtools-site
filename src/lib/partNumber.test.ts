import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse, build, core, fileStem, MAX_LENGTH } from './partNumber';
import { parseCsv, checkRegistry } from '../../scripts/check-part-numbers';

describe('partNumber.parse', () => {
  it.each([
    'CT-CHT-P-300X200-F',
    'CT-CHA-P-800X600-D6',
    'CT-CHA-C-110X85-D5',
    'CT-APR-P-600X400-T36',
    'CT-CIR-P-400X300-ASY',
    'CT-HAL-P-300X200-STD',
    'CT-CIR-G-200X150-SYM-NEG',
    'CT-LDR-M-300X300-R50-905',
    'CT-IQC-L-A3-ESFR',
    'CT-IQC-L-A3-NOIS',
    'CT-RES-G-L300-SCL',
    'CT-ACC-M-FIX14',
    'CT-SVC-CERT-ILAC',
    'CT-SVC-RECAL',
    'CT-KIT-X-001',
    'CT-CHA-P-1200X900-D6-LG',
    // v5 codes (2026-11-06)
    'CT-ARU-P-300X200-D6',
    'CT-ARU-P-200X150-T36',
    'CT-GRD-G-100X100-XG',
    'CT-DEP-C-100X100-ST5',
    'CT-LSC-G-600X30',
    'CT-RDR-M-D150-TRI',
    'CT-RDR-H-600X400-FUS',
    'CT-CIR-C-150X100-CON',
    'CT-RES-G-76X76-STAR-NEG',
    'CT-IRT-P-600X400-TOF',
    'CT-CHA-P-300X200-D6-SFR',
  ])('accepts %s and round-trips', (pn) => {
    const r = parse(pn);
    expect(r.errors).toEqual([]);
    expect(build(r.value!)).toBe(pn);
  });

  it.each([
    ['ct-cha-p-300x200-d6', 'upper case'],
    ['CHA-P-300X200-D6', 'CT-'],
    ['CT-CHA-O-300X200-D6', 'material'],
    ['CT-CHA-Q-300X200-D6', 'material'],
    ['CT-CHA-P-300200-D6', 'size'],
    ['CT-CHA-P-300X200-6X6', 'variant'],
    ['CT-CIR-P-300X200-ASYM', 'variant'],
    ['CT-CHT-P-300X200-F-LG-NEG', 'order'],
    ['CT-CHT-P-300X200-F-905', 'wavelength'],
    ['CT-CHA-P-0300X200-D6', 'leading zeros'],
    ['CT-ACC-FIX-14', 'accessory'],
    ['CT-CHA-P-300X200-D6 ', 'A–Z'],
    ['CT-CHA-X-300X200-D6', 'material X'],
    ['CT-CHA-P-A3-D6', 'size form'],
    ['CT-CHT-P-D25-F', 'size form'],
    ['CT-CHA-P-200X300-D6', 'width ≥ height'],
    ['CT-LDR-M-300X300-R5-905-1550', 'mutually exclusive'],
    ['CT-RES-G-L0100-SCL', 'leading zeros'],
    ['CT-LDR-M-300X300-R05', 'leading zeros'],
    ['CT-CHT-P-300X200-G0X0', 'zero count'],
    ['CT-KIT-X-000', 'kit format'],
    ['CT-SVC-0-0', 'service type'],
    ['CT-ACC-M-FIXFIX', 'accessory'],
    ['CT-ACC-M-BOX10', 'accessory type'],
    ['CT-CHT-P-300X200-F-SFR', 'option SFR only for CHA'],
    ['CT-GRD-G-100X100-ST3', 'variant'],
    ['CT-LSC-G-600X30-XG-LG-NEG-SFR', 'format'],
    ['CT-RDR-M-A3-TRI', 'size form'],
  ])('rejects %s (%s)', (pn, why) => {
    const r = parse(pn);
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toContain(why);
  });

  it('core strips options and fileStem lower-cases', () => {
    expect(core('CT-CIR-G-200X150-SYM-NEG')).toBe('CT-CIR-G-200X150-SYM');
    expect(fileStem('CT-CHA-P-300X200-D6')).toBe('ct-cha-p-300x200-d6');
  });
});

describe('public registry data/part-numbers.csv', () => {
  const rows = parseCsv(readFileSync(resolve('data/part-numbers.csv'), 'utf-8'));
  const result = checkRegistry(rows);

  it('has no validation errors', () => {
    expect(result.errors).toEqual([]);
  });
  it('stays within the hard length limit', () => {
    expect(result.summary.maxLength).toBeLessThanOrEqual(MAX_LENGTH);
  });
  it('maps every legacy Shopify SKU exactly once', () => {
    const legacy = rows.map((r) => r.legacy_sku).filter(Boolean);
    expect(new Set(legacy).size).toBe(legacy.length);
    expect(legacy.length).toBe(57);
  });
  it('does not publish supply-chain codes or planned items', () => {
    expect(Object.keys(rows[0])).not.toContain('supply_code');
    expect(rows.every((r) => ['active', 'draft', 'paused', 'discontinued'].includes(r.status))).toBe(true);
  });
});
