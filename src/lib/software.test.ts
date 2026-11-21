import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { software } from './software';
import { headerGroups, supportDropdown, ACADEMY_NAME } from './nav';

const root = resolve(__dirname, '..', '..');
const page = resolve(root, 'src/pages/plumbline/index.astro');

describe('software (Plumbline single source)', () => {
  it('has a page at its href', () => {
    expect(software.href).toBe('/plumbline/');
    expect(existsSync(page)).toBe(true);
  });

  it('claims no released feature or version before the first release', () => {
    if (software.status === 'unreleased') {
      expect(software.released).toEqual([]);
      expect(software.version).toBeNull();
    } else {
      expect(software.released.length).toBeGreaterThan(0);
      expect(software.version).toMatch(/^\d+\.\d+/);
    }
  });

  it('page offers no download before the first release', () => {
    const src = readFileSync(page, 'utf-8');
    if (software.status === 'unreleased') {
      expect(src).not.toMatch(/download now|downloadUrl|>\s*Download\s*</i);
      expect(src).toContain('software.planned');
    }
  });

  it('page does not hard-code the planned list or status', () => {
    const src = readFileSync(page, 'utf-8');
    for (const line of software.planned) expect(src).not.toContain(line.slice(0, 40));
  });
});

describe('header navigation', () => {
  it('puts Plumbline where Guides was, before Support', () => {
    const keys = headerGroups.map((g) => g.key);
    expect(keys).toEqual(['targets', 'tools', 'applications', 'plumbline', 'support']);
    const pl = headerGroups.find((g) => g.key === 'plumbline')!;
    expect(pl.label).toBe(software.name);
    expect(pl.href).toBe(software.href);
  });

  it('lists Calib Academy first under Support and lights Support on guide pages', () => {
    expect(ACADEMY_NAME).toBe('Calib Academy');
    expect(supportDropdown[0]).toEqual({ label: ACADEMY_NAME, href: '/guides/' });
    expect(headerGroups.find((g) => g.key === 'support')!.sections).toContain('guides');
    expect(headerGroups.some((g) => g.label === 'Guides')).toBe(false);
  });
});
