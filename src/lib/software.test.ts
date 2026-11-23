import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { software, SAMPLE, coveragePercent, RELEASE, fileUrl, sizeMb, downloadsByPlatform } from './software';
import { errorBarsFigureSvg, errorBarsScale } from './guideFigures';
import { headerGroups, footerGroups, supportDropdown, ACADEMY_NAME } from './nav';

const root = resolve(__dirname, '..', '..');
const page = resolve(root, 'src/pages/plumbline/index.astro');

describe('software (Plumbline single source)', () => {
  it('has a page at its href', () => {
    expect(software.href).toBe('/plumbline/');
    expect(existsSync(page)).toBe(true);
  });

  it('version, tag and file names say the same thing', () => {
    expect(software.version).toBe(RELEASE.version);
    expect(software.status).toBe(RELEASE.stage);
    expect(RELEASE.version).toMatch(/^\d+\.\d+\.\d+( (beta|rc) \d+)?$/);
    expect(RELEASE.fileVersion).toBe(RELEASE.version.replace(/ (beta|rc) /, '-$1.'));
    expect(RELEASE.tag).toBe(`v${RELEASE.fileVersion}`);
    expect(RELEASE.base).toBe(`https://github.com/calibtools/plumbline/releases/download/${RELEASE.tag}/`);
    expect(RELEASE.released).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    for (const f of RELEASE.files) {
      expect(f.file.startsWith(`Plumbline-${RELEASE.fileVersion}-`)).toBe(true);
      expect(f.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(fileUrl(f)).toBe(RELEASE.base + f.file);
    }
    expect(new Set(RELEASE.files.map((f) => f.file)).size).toBe(RELEASE.files.length);
    expect(new Set(RELEASE.files.map((f) => f.sha256)).size).toBe(RELEASE.files.length);
  });

  it('every platform has exactly one button file; sizes are shown in MB of 1,048,576 bytes', () => {
    const d = downloadsByPlatform();
    expect(d.map((x) => x.platform)).toEqual(software.platforms);
    for (const x of d) expect(RELEASE.files.filter((f) => f.platform === x.platform && f.primary)).toHaveLength(1);
    expect(d.map((x) => x.main.file.split('-').slice(3).join('-'))).toEqual(['windows-x64-setup.exe', 'macos-arm64.dmg', 'linux-x86_64.AppImage']);
    expect(d.map((x) => x.other?.label)).toEqual([undefined, 'Intel Mac', '.tar.xz']);
    // beta 1, as listed in the handover of 2026-11-23
    if (RELEASE.fileVersion === '0.1.0-beta.1') expect(RELEASE.files.map((f) => sizeMb(f.bytes))).toEqual(['66.5 MB', '46.7 MB', '66.7 MB', '134.3 MB', '101.5 MB']);
    expect(sizeMb(1_048_576)).toBe('1.0 MB');
  });

  it('page builds its downloads from RELEASE and reads its figures from SAMPLE', () => {
    const src = readFileSync(page, 'utf-8');
    for (const key of ['downloadsByPlatform()', 'fileUrl(d.main)', 'sizeMb(d.main.bytes)', 'RELEASE.version', 'RELEASE.released', 'RELEASE.notes', 'RELEASE.checksums', 'RELEASE.contents', 'RELEASE.limits', 'RELEASE.builtOn']) expect(src).toContain(key);
    // version, file names and addresses are not typed into the page
    expect(src).not.toMatch(/0\.1\.0|beta[ .-]?\d|github\.com|\.exe|\.dmg|\.AppImage|\d MB/);
    for (const key of ['SAMPLE.errorsPx', 'SAMPLE.coverage', 'SAMPLE.rmsPx', 'SAMPLE.focalPx', 'SAMPLE.spoiledImages', 'SAMPLE.kept.errorsPx', 'kept.rmsPx', 'kept.focalPx', 'SAMPLE.kept.cameraInfo']) expect(src).toContain(key);
    // numbers are not typed into the page
    expect(src).not.toMatch(/0\.048|0\.116|149[89]\.\d|77\s*(&nbsp;)?%|\b0?7 and 18\b/);
  });

  it('beta page says what a beta is, how to open an unsigned app, and what the sign-up email is used for', () => {
    const src = readFileSync(page, 'utf-8');
    expect(src).toContain('public test version');
    // the page lists RELEASE.limits, which says what the beta was checked with
    expect(src).toContain('RELEASE.limits');
    expect(RELEASE.limits.join(' ')).toContain('rendered images');
    expect(src).toContain('Run anyway');
    expect(src).toContain('Open Anyway');
    expect(src).toContain('chmod +x');
    expect(src).not.toMatch(/right-click|Control-click/i); // no longer works on current macOS
    expect(src).toContain('We use it for nothing else');
  });

  it('page is written for users: no licence, source or progress talk', () => {
    const src = readFileSync(page, 'utf-8').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
    expect(src).not.toMatch(/open[- ]source|\bMIT\b|licen[cs]e|roadmap|planned/i);
  });
});

describe('sample result', () => {
  const out = SAMPLE.spoiledImages.map((n) => n - 1);

  it('first run: 24 images, and the two spoiled ones are the two tallest bars', () => {
    expect(SAMPLE.errorsPx).toHaveLength(24);
    expect(SAMPLE.rmsPx).toBeGreaterThan(Math.min(...SAMPLE.errorsPx));
    expect(SAMPLE.rmsPx).toBeLessThan(Math.max(...SAMPLE.errorsPx));
    const tallest = [...SAMPLE.errorsPx.keys()].sort((a, b) => SAMPLE.errorsPx[b] - SAMPLE.errorsPx[a]).slice(0, out.length).sort((a, b) => a - b);
    expect(tallest).toEqual(out);
    const rest = SAMPLE.errorsPx.filter((_, i) => !out.includes(i));
    expect(Math.min(...out.map((i) => SAMPLE.errorsPx[i]))).toBeGreaterThan(3 * Math.max(...rest));
  });

  it('second run: without the two, the error falls by more than half and the focal length is closer to the truth', () => {
    expect(SAMPLE.kept.errorsPx).toHaveLength(SAMPLE.errorsPx.length - out.length);
    expect(SAMPLE.kept.rmsPx).toBeLessThan(SAMPLE.rmsPx / 2);
    expect(SAMPLE.kept.rmsPx).toBeGreaterThan(Math.min(...SAMPLE.kept.errorsPx));
    expect(SAMPLE.kept.rmsPx).toBeLessThan(Math.max(...SAMPLE.kept.errorsPx));
    expect(SAMPLE.kept.corners).toBeLessThan(SAMPLE.corners);
    const off = (f: number) => Math.abs(f - SAMPLE.trueFocalPx);
    expect(off(SAMPLE.kept.focalPx)).toBeLessThan(off(SAMPLE.focalPx));
    expect(off(SAMPLE.kept.focalPx)).toBeLessThan(1);
  });

  it('coverage map is 16 x 12 and 77 % covered', () => {
    expect(SAMPLE.coverage).toHaveLength(12);
    for (const row of SAMPLE.coverage) expect(row).toHaveLength(16);
    expect(coveragePercent(SAMPLE.coverage)).toBe(77);
  });

  it('camera_info snippet is the second run: same focal length, no version line', () => {
    expect(SAMPLE.kept.cameraInfo).toContain('distortion_model: plumb_bob');
    expect(SAMPLE.kept.cameraInfo.startsWith('image_width: 1280')).toBe(true);
    const fx = Number(/camera_matrix:[\s\S]*?data: \[([0-9.]+)/.exec(SAMPLE.kept.cameraInfo)![1]);
    expect(fx).toBeCloseTo(SAMPLE.kept.focalPx, 2);
  });
});

describe('error bar figure', () => {
  const out = SAMPLE.spoiledImages.map((n) => n - 1);

  it('keeps the fine scale for a clean set and widens it when a bar is taller', () => {
    expect(errorBarsScale(SAMPLE.kept.errorsPx).max).toBe(0.08);
    const wide = errorBarsScale(SAMPLE.errorsPx);
    expect(wide.max).toBeGreaterThanOrEqual(Math.max(...SAMPLE.errorsPx));
    expect(wide.ticks[0]).toBe(0);
    expect(wide.ticks.at(-1)).toBe(wide.max);
  });

  it('no bar leaves the plot, and every left-out image is an outline marked "out"', () => {
    const svg = errorBarsFigureSvg(SAMPLE.errorsPx, { leftOut: out, label: 'x' });
    const heights = [...svg.matchAll(/<rect [^>]*height="([0-9.]+)"/g)].map((m) => Number(m[1]));
    expect(heights).toHaveLength(SAMPLE.errorsPx.length);
    expect(Math.max(...heights)).toBeLessThanOrEqual(152);
    expect(svg.match(/fill="none"/g)).toHaveLength(out.length);
    expect(svg.match(/>out<\/text>/g)).toHaveLength(out.length);
    const one = errorBarsFigureSvg(SAMPLE.errorsPx, { leftOut: out[0], label: 'x' });
    expect(one.match(/fill="none"/g)).toHaveLength(1);
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
