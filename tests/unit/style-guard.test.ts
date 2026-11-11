import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * DESIGN.md: no shadows, no gradients, no backdrop blur, no dark marketing pages.
 * This guard fails the build when one comes back.
 */
const BANNED: [label: string, pattern: RegExp][] = [
  ['shadow utility', /(?<![\w-])(?:drop-)?shadow-(?!none\b)[\w\[]/],
  ['box-shadow', /box-shadow\s*:(?!\s*none)/],
  ['gradient', /bg-gradient-|(?:linear|radial|conic)-gradient\(/],
  ['backdrop blur', /backdrop-(?:blur|filter)/],
  ['dark page theme', /theme\s*=\s*["']dark["']/],
];

/** Lightbox scrim (photo viewer overlay) is the one dark surface we keep. */
const ALLOW_LINE = /lightbox/;

function walk(dir: string, exts: string[]): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full, exts));
    else if (exts.some((x) => e.name.endsWith(x)) && !/\.test\.[tj]sx?$/.test(e.name)) out.push(full);
  }
  return out;
}

describe('style guard (DESIGN.md)', () => {
  it('no shadows, gradients, backdrop blur or dark pages in pages, components, islands and styles', () => {
    const root = process.cwd();
    const files = ['src/pages', 'src/components', 'src/islands', 'src/layouts', 'src/styles'].flatMap((d) => walk(join(root, d), ['.astro', '.tsx', '.css']));
    const hits: string[] = [];
    for (const f of files) {
      readFileSync(f, 'utf-8').split('\n').forEach((line, i) => {
        if (ALLOW_LINE.test(line)) return;
        for (const [label, re] of BANNED) if (re.test(line)) hits.push(`${relative(root, f)}:${i + 1} ${label}: ${line.trim().slice(0, 90)}`);
      });
    }
    expect(hits, `Banned styles:\n${hits.join('\n')}`).toEqual([]);
  });

  it('the guard itself catches each banned style', () => {
    const samples = ['class="shadow-lg"', 'box-shadow: 0 1px 2px #000;', 'class="bg-gradient-to-t"', 'background: linear-gradient(red, blue);', 'class="backdrop-blur-md"', '<Base theme="dark">'];
    for (const s of samples) expect(BANNED.some(([, re]) => re.test(s)), s).toBe(true);
    for (const ok of ['class="shadow-none"', 'box-shadow: none;', 'const shadowRoot = 1']) expect(BANNED.some(([, re]) => re.test(ok)), ok).toBe(false);
  });
});
