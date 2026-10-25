import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

const SRC = join(__dirname, '..');

/** Recursively collect all files under a directory. */
function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walk(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

/** Files that legitimately contain `<svg` (pattern renderers, stamp, export helpers). */
const SVG_ALLOW = [
  'src/lib/icons.ts',
  'src/lib/stamp.ts',
  'src/lib/stamp.test.ts',
  'src/lib/svgLayers.ts',
  'src/lib/svgLayers.test.ts',
  'src/lib/exportPng.ts',
  'src/lib/exportPng.test.ts',
  'src/lib/renderCheckerboard.ts',
  'src/lib/renderCharuco.ts',
  'src/lib/renderAprilGrid.ts',
  'src/lib/renderCircles.ts',
  'src/lib/renderMarkerSheet.ts',
  'src/lib/renderMarkerSheet.test.ts',
  'src/lib/renderPuzzleBoard.ts',
  'src/lib/renderPuzzleBoard.test.ts',
  'src/lib/exportDxf.ts',
  'src/lib/exportDxf.test.ts',
  'src/lib/brand.ts',
  'src/lib/brand.test.ts',
  'src/lib/brand-overlay.test.ts',
  'src/lib/icons.test.ts',
  'src/docs/ctdoc.ts',
];

/**
 * Unicode characters previously used as icons.
 * We test for these appearing in JSX/HTML text contexts — not inside
 * comments, test descriptions, regex literals, or string comparisons.
 */
const ICON_GLYPHS = /[✓✕✗☰]/;

/** Match `<svg` that looks like inline icon markup (not a string literal in a renderer). */
const INLINE_SVG = /<svg[\s>]/;

describe('icon hygiene', () => {
  const files = walk(SRC)
    .filter((f) => /\.(astro|tsx|ts)$/.test(f))
    .filter((f) => !f.includes('node_modules'));

  it('no inline <svg> outside allowed files', () => {
    const violations: string[] = [];
    for (const file of files) {
      const rel = relative(join(SRC, '..'), file).replace(/\\/g, '/');
      if (SVG_ALLOW.some((a) => rel.endsWith(a))) continue;
      // FovCalculator has a functional SVG diagram (not an icon)
      if (rel.includes('FovCalculator')) continue;

      const content = readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Skip comments and test descriptions
        if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*')) continue;
        if (INLINE_SVG.test(line)) {
          violations.push(`${rel}:${i + 1}`);
        }
      }
    }
    expect(violations, `Files still containing <svg:\n${violations.join('\n')}`).toEqual([]);
  });

  it('no Unicode icon glyphs in JSX/HTML text', () => {
    const violations: string[] = [];
    for (const file of files) {
      const rel = relative(join(SRC, '..'), file).replace(/\\/g, '/');
      // Exclude test files and non-UI source
      if (rel.endsWith('.test.ts')) continue;
      if (rel.includes('lib/stamp') || rel.includes('svgLayers') || rel.includes('exportPng')) continue;

      const content = readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Skip comments
        if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*')) continue;
        // Skip lines that are clearly regex or split operations (e.g. split(/[x×]/) )
        if (/split\(/.test(line)) continue;
        if (ICON_GLYPHS.test(line)) {
          violations.push(`${rel}:${i + 1}: ${line.trim()}`);
        }
      }
    }
    expect(violations, `Files still containing Unicode icon glyphs:\n${violations.join('\n')}`).toEqual([]);
  });
});
