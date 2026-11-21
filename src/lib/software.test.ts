import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { software, SAMPLE, coveragePercent } from './software';
import { headerGroups, footerGroups, supportDropdown, ACADEMY_NAME } from './nav';

const root = resolve(__dirname, '..', '..');
const page = resolve(root, 'src/pages/plumbline/index.astro');

describe('software (Plumbline single source)', () => {
  it('has a page at its href', () => {
    expect(software.href).toBe('/plumbline/');
    expect(existsSync(page)).toBe(true);
  });

  it('has no version before the first release', () => {
    if (software.status === 'unreleased') expect(software.version).toBeNull();
    else expect(software.version).toMatch(/^\d+\.\d+/);
  });

  it('page offers no download before the first release and reads its figures from SAMPLE', () => {
    const src = readFileSync(page, 'utf-8');
    if (software.status === 'unreleased') expect(src).not.toMatch(/download now|downloadUrl/i);
    for (const key of ['SAMPLE.errorsPx', 'SAMPLE.coverage', 'SAMPLE.rmsPx', 'SAMPLE.focalPx', 'SAMPLE.cameraInfo']) expect(src).toContain(key);
    // numbers are not typed into the page
    expect(src).not.toMatch(/0\.048|1499\.7|77\s*(&nbsp;)?%/);
  });

  it('page is written for users: no licence, source or progress talk', () => {
    const src = readFileSync(page, 'utf-8').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
    expect(src).not.toMatch(/open[- ]source|\bMIT\b|licen[cs]e|roadmap|planned/i);
  });
});

describe('sample result', () => {
  it('is one consistent run: 24 images, overall RMS between the per-image extremes', () => {
    expect(SAMPLE.errorsPx).toHaveLength(24);
    expect(SAMPLE.rmsPx).toBeGreaterThan(Math.min(...SAMPLE.errorsPx));
    expect(SAMPLE.rmsPx).toBeLessThan(Math.max(...SAMPLE.errorsPx));
    expect(Math.abs(SAMPLE.focalPx - SAMPLE.trueFocalPx)).toBeLessThan(1);
  });

  it('coverage map is 16 x 12 and 77 % covered', () => {
    expect(SAMPLE.coverage).toHaveLength(12);
    for (const row of SAMPLE.coverage) expect(row).toHaveLength(16);
    expect(coveragePercent(SAMPLE.coverage)).toBe(77);
  });

  it('camera_info snippet carries the same focal length', () => {
    expect(SAMPLE.cameraInfo).toContain('distortion_model: plumb_bob');
    expect(SAMPLE.cameraInfo).toContain(`data: [${SAMPLE.focalPx}`);
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
    expect(supportDropdown[0]).toEqual({ label: ACADEMY_NAME, href: '/calibacademy/' });
    expect(headerGroups.find((g) => g.key === 'support')!.sections).toContain('guides');
    expect(headerGroups.some((g) => g.label === 'Guides')).toBe(false);
  });

  it('footer carries the same names: Calib Academy first under Support, Plumbline under Tools', () => {
    const col = (h: string) => footerGroups.find((g) => g.heading === h)!.items;
    expect(col('Support')[0]).toEqual({ label: ACADEMY_NAME, href: '/calibacademy/' });
    expect(col('Tools').at(-1)).toEqual({ label: software.name, href: software.href });
    expect(footerGroups.flatMap((g) => g.items).some((i) => i.label === 'Guides')).toBe(false);
  });
});
