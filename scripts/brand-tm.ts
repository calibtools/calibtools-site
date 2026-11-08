/**
 * Adds a ™ to the framed wordmark (positive and negative) without touching the
 * brand-kit originals. Output: public/brand/wordmark-framed-{light,dark}-tm.svg.
 * ™ is set in Geist SemiBold, outlined (no font dependency), same color as the
 * letters, cap height ≈ 36 % of the wordmark cap height, top-aligned with the
 * frame and placed right of the top-right bracket.
 *   pnpm exec tsx scripts/brand-tm.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
// @ts-expect-error opentype.js ships no types
import opentype from 'opentype.js';

type Cmd = { type: string; x?: number; y?: number; x1?: number; y1?: number; x2?: number; y2?: number };
const n = (v: number) => (Math.abs(v) < 0.0005 ? '0' : v.toFixed(2));
function pathData(cmds: Cmd[]): string {
  return cmds.map((c) => {
    switch (c.type) {
      case 'M': return `M${n(c.x!)} ${n(c.y!)}`;
      case 'L': return `L${n(c.x!)} ${n(c.y!)}`;
      case 'Q': return `Q${n(c.x1!)} ${n(c.y1!)} ${n(c.x!)} ${n(c.y!)}`;
      case 'C': return `C${n(c.x1!)} ${n(c.y1!)} ${n(c.x2!)} ${n(c.y2!)} ${n(c.x!)} ${n(c.y!)}`;
      default: return 'Z';
    }
  }).join('');
}

const ROOT = resolve(import.meta.dirname, '..');
const buf = readFileSync(resolve(ROOT, 'src/assets/fonts/Geist-SemiBold.ttf'));
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));

// Wordmark geometry (brand kit units): letters cap height 710, frame top -1269.5, right bracket outer edge x 7497.
const WORD_CAP = 710;
const TM_CAP = Math.round(WORD_CAP * 0.36);             // 256, legible at a 40 px logo
const capRatio = (font.tables.os2?.sCapHeight ?? 0.7 * font.unitsPerEm) / font.unitsPerEm;
const size = TM_CAP / capRatio;
const FRAME_TOP = -1269.5;
const x0 = 7497 + 70;                                   // gap right of the bracket
const baseline = FRAME_TOP + TM_CAP;
const p = font.getPath('TM', x0, baseline, size);
const bb = p.getBoundingBox();
const tmD = pathData(p.commands as Cmd[]);

for (const [src, out, fill] of [
  ['wordmark-framed-light.svg', 'wordmark-framed-light-tm.svg', '#000000'],
  ['wordmark-framed-dark.svg', 'wordmark-framed-dark-tm.svg', '#FFFFFF'],
] as const) {
  let svg = readFileSync(resolve(ROOT, 'public/brand', src), 'utf-8');
  const m = svg.match(/viewBox="([-\d.]+) ([-\d.]+) ([\d.]+) ([\d.]+)"/);
  if (!m) throw new Error('viewBox not found in ' + src);
  const [vx, vy, , vh] = m.slice(1).map(Number);
  const newW = Math.ceil(bb.x2 + 14.2 - vx);             // same 14.2 margin the kit uses on the left
  svg = svg
    .replace(m[0], `viewBox="${vx} ${vy} ${newW} ${vh}"`)
    .replace(/width="[\d.]+" height="[\d.]+"/, `width="${newW}" height="${vh}"`)
    .replace(/<title>([^<]*)<\/title>/, '<title>$1 with TM</title>')
    .replace('</svg>', `<path d="${tmD}" fill="${fill}"/></svg>`);
  if (/NaN/.test(svg)) throw new Error('NaN in ' + out);
  writeFileSync(resolve(ROOT, 'public/brand', out), svg);
  console.log(out, 'width', newW, 'TM box', bb.x1.toFixed(0), bb.y1.toFixed(0), bb.x2.toFixed(0), bb.y2.toFixed(0));
}
