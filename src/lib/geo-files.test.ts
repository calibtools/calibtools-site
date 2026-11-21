import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { sourceFilesForPath } from '../../scripts/sitemap-lastmod.mjs';
import { pageInfo, buildLlmsTxt } from '../../scripts/llms-txt.mjs';

describe('sitemap lastmod sources', () => {
  it('dates each page by its template and the content file behind it', () => {
    expect(sourceFilesForPath('/applications/')).toEqual(['src/pages/applications/index.astro']);
    expect(sourceFilesForPath('/applications/robotics-calibration/'))
      .toEqual(['src/pages/applications/[slug].astro', 'src/content/applications/robotics-calibration.md']);
    expect(sourceFilesForPath('/targets/charuco-composite/'))
      .toEqual(['src/pages/targets/[handle].astro', 'src/content/products/charuco-composite.md']);
    expect(sourceFilesForPath('/tools/generator/charuco/'))
      .toEqual(['src/pages/tools/generator/charuco.astro', 'src/content/tools/generator-charuco.md']);
    expect(sourceFilesForPath('/tools/fov/')).toEqual(['src/pages/tools/fov.astro', 'src/content/tools/fov.md']);
    expect(sourceFilesForPath('/calibacademy/reprojection-error/')).toEqual(['src/content/guides/reprojection-error.md']);
    expect(sourceFilesForPath('/')).toEqual(['src/pages/index.astro']);
  });
});

describe('llms.txt', () => {
  const html = (title: string, desc: string) =>
    `<html><head><title>${title}</title><meta name="description" content="${desc}"></head><body></body></html>`;

  it('reads the title (without the site suffix) and description of a built page', () => {
    expect(pageInfo(html('ChArUco board generator — free PDF · Calib.Tools', 'Print-exact &amp; free.')))
      .toEqual({ title: 'ChArUco board generator — free PDF', description: 'Print-exact & free.' });
  });

  it('groups the published pages into sections, home first, every line a link with its description', () => {
    const txt = buildLlmsTxt([
      { url: 'https://calib.tools/', title: 'Calibration targets', description: 'Targets and free tools.' },
      { url: 'https://calib.tools/tools/generator/charuco/', title: 'ChArUco generator', description: 'Free PDF.' },
      { url: 'https://calib.tools/calibacademy/reprojection-error/', title: 'Reprojection error', description: 'What it means.' },
      { url: 'https://calib.tools/targets/charuco-composite/', title: 'ChArUco board, aluminum', description: 'Rigid board.' },
      { url: 'https://calib.tools/applications/robotics-calibration/', title: 'Robotics', description: 'Hand-eye.' },
      { url: 'https://calib.tools/plumbline/', title: 'Plumbline', description: 'Desktop software.' },
      { url: 'https://calib.tools/shipping/', title: 'Shipping', description: 'Where we ship.' },
    ]);
    expect(txt.startsWith('# Calib.Tools\n\n> Targets and free tools.\n')).toBe(true);
    const order = ['## Free tools', '## Calib Academy (guides)', '## Plumbline desktop software', '## Calibration targets', '## Applications', '## Company'].map((h) => txt.indexOf(h));
    expect(order.every((i, n) => i > 0 && (n === 0 || i > order[n - 1]))).toBe(true);
    expect(txt).toContain('- [ChArUco generator](https://calib.tools/tools/generator/charuco/): Free PDF.');
    expect(txt).toContain('- [Shipping](https://calib.tools/shipping/): Where we ship.');
    expect(txt).not.toMatch(/\]\(https:\/\/calib\.tools\/\)/);
  });
});

describe('robots.txt', () => {
  const robots = readFileSync(resolve(__dirname, '../../public/robots.txt'), 'utf-8');
  it('lets search and AI answers use the site; blocks AI training (decision 2026-11-19)', () => {
    expect(robots).toMatch(/^Content-Signal: search=yes, ai-input=yes, ai-train=no$/m);
    // training-only crawlers blocked, search and live-fetch agents not named in a Disallow group
    const groups = robots.split(/\n\s*\n/);
    const blocked = groups.filter((g) => /^Disallow: \/$/m.test(g)).join('\n');
    for (const bot of ['GPTBot', 'ClaudeBot', 'Google-Extended', 'CCBot']) expect(blocked).toContain(`User-agent: ${bot}`);
    for (const bot of ['OAI-SearchBot', 'ChatGPT-User', 'Claude-SearchBot', 'PerplexityBot', 'Googlebot', 'Bingbot', '*']) expect(blocked).not.toContain(`User-agent: ${bot}\n`);
    expect(robots).toMatch(/^User-agent: \*\nContent-Signal:[^\n]*\nAllow: \/$/m);
    expect(robots).toMatch(/^Allow: \/$/m);
    expect(robots).toMatch(/^Sitemap: https:\/\/calib\.tools\/sitemap-index\.xml$/m);
  });
});
