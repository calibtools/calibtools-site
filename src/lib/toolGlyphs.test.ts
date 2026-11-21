/**
 * Home-page tool glyphs: one SVG per tool, all drawn in the same 40 × 40 box with a 30 × 24 live area,
 * site inks only, so the seven read as one set.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { tools } from './tools';

const file = (key: string) => new URL(`../../public/icons/tools/${key}.svg`, import.meta.url);

describe('tool glyphs', () => {
  it('every live tool has one', () => {
    for (const t of tools.filter((x) => x.live)) expect(existsSync(file(t.key)), t.key).toBe(true);
  });
  it('all share the 40 × 40 box and use only the site inks', () => {
    for (const t of tools.filter((x) => x.live)) {
      const svg = readFileSync(file(t.key), 'utf-8');
      expect(svg, t.key).toMatch(/viewBox="0 0 40 40"/);
      const colors = new Set([...svg.matchAll(/#[0-9A-Fa-f]{6}/g)].map((m) => m[0].toUpperCase()));
      for (const c of colors) expect(['#141414', '#E60012', '#FFFFFF'], `${t.key} ${c}`).toContain(c);
    }
  });
});
