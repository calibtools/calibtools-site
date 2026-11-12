import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { DOC_COLORS, hexToUnitRgb } from './docColors';

const css = readFileSync('src/styles/global.css', 'utf8');
const cssVar = (name: string): string => {
  const m = css.match(new RegExp(`--color-${name}:\\s*([^;]+);`))!;
  const v = m[1].trim();
  if (v.startsWith('#')) return v.toUpperCase();
  return '#' + v.split(/\s+/).map((n) => (+n).toString(16).padStart(2, '0')).join('').toUpperCase();
};

describe('document colors', () => {
  it('are the site tokens', () => {
    expect(DOC_COLORS.ink).toBe(cssVar('ink'));
    expect(DOC_COLORS.inkMuted).toBe(cssVar('ink-muted'));
    expect(DOC_COLORS.inkSoft).toBe(cssVar('ink-soft'));
    expect(DOC_COLORS.lineStrong).toBe(cssVar('line-strong'));
    expect(DOC_COLORS.paperAlt).toBe(cssVar('ground-alt'));
    expect(DOC_COLORS.paper).toBe(cssVar('ground'));
    expect(DOC_COLORS.red).toBe(cssVar('brand'));
    expect(DOC_COLORS.redText).toBe(cssVar('brand-text'));
    expect(DOC_COLORS.redTint).toBe(cssVar('brand-tint'));
  });

  it('converts to the 0 to 1 form pdf-lib takes', () => {
    expect(hexToUnitRgb('#E60012')).toEqual([230 / 255, 0, 18 / 255]);
    expect(() => hexToUnitRgb('#abc')).toThrow();
  });

  it('table headers in the documents are dark red on the light red tint', () => {
    const doc = readFileSync('src/docs/ctdoc.ts', 'utf8');
    expect(doc).toMatch(/table\.t th \{[^}]*color: \$\{RED_TEXT\}; background: \$\{RED_TINT\};/);
  });
});

describe('no hand-written colors in the document and PDF code', () => {
  const files = [
    ...['src/docs', 'src/docs/build'].flatMap((d) => readdirSync(d).filter((f) => f.endsWith('.ts')).map((f) => join(d, f))),
    'src/lib/exportPdf.ts',
  ];
  // Pure black and pure white are the pattern itself and the page; everything else comes from docColors.ts.
  const allowed = new Set(['#000', '#fff', '#000000', '#ffffff']);

  for (const file of files) {
    it(file, () => {
      const src = readFileSync(file, 'utf8');
      const hex = [...src.matchAll(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g)].map((m) => m[0].toLowerCase()).filter((h) => !allowed.has(h));
      expect(hex, `colors written by hand in ${file}`).toEqual([]);
      const grays = [...src.matchAll(/rgb\(\s*(0?\.\d+)\s*,\s*(0?\.\d+)\s*,\s*(0?\.\d+)\s*\)/g)].map((m) => m[0]);
      expect(grays, `gray literals in ${file}`).toEqual([]);
    });
  }
});
