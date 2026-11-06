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
  it('data/serials.json exists and is valid JSON array', () => {
    expect(existsSync(SERIALS_PATH)).toBe(true);
    const data = JSON.parse(readFileSync(SERIALS_PATH, 'utf-8'));
    expect(Array.isArray(data)).toBe(true);
  });

  it('register is empty before first production', () => {
    const data: SerialRecord[] = JSON.parse(readFileSync(SERIALS_PATH, 'utf-8'));
    expect(data).toHaveLength(0);
  });

  it('unknown SN 999999 is not in the register', () => {
    const data: SerialRecord[] = JSON.parse(readFileSync(SERIALS_PATH, 'utf-8'));
    expect(data.find(r => r.sn === '999999')).toBeUndefined();
  });
});
