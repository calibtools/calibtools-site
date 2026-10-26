/**
 * Tests for serial register data integrity.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const SERIALS_PATH = resolve(process.cwd(), 'data/serials.json');

interface SerialRecord {
  sn: string;
  part_number: string;
  id_range: string;
  inspected_on: string;
  inspector: string;
  report_url: string;
}

describe('serial register', () => {
  it('data/serials.json exists and is valid JSON', () => {
    expect(existsSync(SERIALS_PATH)).toBe(true);
    const data = JSON.parse(readFileSync(SERIALS_PATH, 'utf-8'));
    expect(Array.isArray(data)).toBe(true);
  });

  it('seeded record SN 000311 exists', () => {
    const data: SerialRecord[] = JSON.parse(readFileSync(SERIALS_PATH, 'utf-8'));
    const record = data.find(r => r.sn === '000311');
    expect(record).toBeTruthy();
    expect(record!.part_number).toBe('CT-CHA-C-185110-6X6');
    expect(record!.id_range).toContain('41');
    expect(record!.inspected_on).toBe('2026-10-24');
    expect(record!.report_url).toBe('/files/reports/CT-IR-000311.pdf');
  });

  it('report PDF exists for SN 000311', () => {
    const reportPath = resolve(process.cwd(), 'public/files/reports/000311.pdf');
    expect(existsSync(reportPath)).toBe(true);
    const bytes = readFileSync(reportPath);
    expect(bytes.length).toBeGreaterThan(1000);
    // Check it starts with PDF header
    expect(bytes.slice(0, 5).toString()).toBe('%PDF-');
  });

  it('all records have required fields', () => {
    const data: SerialRecord[] = JSON.parse(readFileSync(SERIALS_PATH, 'utf-8'));
    for (const r of data) {
      expect(r.sn).toBeTruthy();
      expect(r.part_number).toMatch(/^CT-/);
      expect(r.inspected_on).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(r.inspector).toBeTruthy();
      expect(r.report_url).toMatch(/^\/files\/reports\//);
    }
  });

  it('unknown SN 999999 is not in the register', () => {
    const data: SerialRecord[] = JSON.parse(readFileSync(SERIALS_PATH, 'utf-8'));
    expect(data.find(r => r.sn === '999999')).toBeUndefined();
  });
});
