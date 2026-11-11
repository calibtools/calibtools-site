/**
 * Share image (Open Graph, 1200 × 630) in the drawing-sheet style: paper ground, a white
 * sheet with bracket corners, a plain label, the title, and a line drawing where one exists.
 * Pure string building; scripts/generate-placeholders.ts renders it to PNG.
 */
import { wordmarkSvgGroup } from './exportBrand';

export const OG_W = 1200;
export const OG_H = 630;

const PAPER = '#F4F3EF';
const SHEET = '#FFFFFF';
const HAIRLINE = '#D6D3CB';
const INK = '#141414';
const INK_SOFT = '#6B6862';
const RED_TEXT = '#B3000E';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Breaks a title into lines of at most maxChars, at spaces. A single longer word stays whole. */
export function wrapTitle(title: string, maxChars: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of title.trim().split(/\s+/)) {
    if (line && (line + ' ' + word).length > maxChars) { lines.push(line); line = word; }
    else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines;
}

/** Re-homes a standalone SVG (with a viewBox) into a box, keeping its aspect ratio. */
export function placeSvg(svg: string, x: number, y: number, w: number, h: number): string {
  const vb = /viewBox="([^"]+)"/.exec(svg)?.[1];
  if (!vb) throw new Error('Drawing has no viewBox');
  const inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  return `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${vb}" preserveAspectRatio="xMidYMid meet">${inner}</svg>`;
}

export interface OgOptions {
  /** Plain label above the title, e.g. "Calibration target" or "Guide". */
  label: string;
  title: string;
  /** Standalone line drawing (SVG with a viewBox), shown on the right. */
  drawing?: string;
  /** One line under the title, e.g. a part number or a size range. */
  note?: string;
  /** A sentence under the title, wrapped to at most three lines. */
  sub?: string;
}

export function ogSvg({ label, title, drawing, note, sub }: OgOptions): string {
  const M = 40;                       // paper margin around the sheet
  const sx = M, sy = M, sw = OG_W - 2 * M, sh = OG_H - 2 * M;
  const pad = 56;
  const textW = drawing ? 520 : sw - 2 * pad;
  const lines = wrapTitle(title, drawing ? 19 : 34);
  const size = lines.length > 3 ? 44 : 56;
  const lead = Math.round(size * 1.12);
  const tx = sx + pad;
  const titleTop = sy + pad + 80;
  const b = 34;                        // bracket arm length
  const corner = (x: number, y: number, dx: number, dy: number) =>
    `<path d="M${x + dx * b} ${y}H${x}V${y + dy * b}" fill="none" stroke="${INK}" stroke-width="3"/>`;

  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_W}" height="${OG_H}" viewBox="0 0 ${OG_W} ${OG_H}">`,
    `<rect width="${OG_W}" height="${OG_H}" fill="${PAPER}"/>`,
    `<rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" fill="${SHEET}" stroke="${HAIRLINE}" stroke-width="1"/>`,
    corner(sx, sy, 1, 1), corner(sx + sw, sy, -1, 1), corner(sx, sy + sh, 1, -1), corner(sx + sw, sy + sh, -1, -1),
    `<text x="${tx}" y="${sy + pad + 8}" font-family="Geist Mono" font-size="20" letter-spacing="1.2" fill="${RED_TEXT}">${esc(label.toUpperCase())}</text>`,
    ...lines.map((l, i) => `<text x="${tx}" y="${titleTop + i * lead}" font-family="Geist" font-weight="600" font-size="${size}" letter-spacing="-0.6" fill="${INK}">${esc(l)}</text>`),
  ];
  let y = titleTop + (lines.length - 1) * lead + 62;
  if (sub) {
    for (const l of wrapTitle(sub, drawing ? 34 : 62).slice(0, 3)) {
      parts.push(`<text x="${tx}" y="${y}" font-family="Geist" font-size="${drawing ? 26 : 30}" fill="${INK_SOFT}">${esc(l)}</text>`);
      y += drawing ? 36 : 42;
    }
    y += 10;
  }
  if (note) parts.push(`<text x="${tx}" y="${y}" font-family="Geist Mono" font-size="22" fill="${INK_SOFT}">${esc(note)}</text>`);
  if (drawing) parts.push(placeSvg(drawing, sx + pad + textW + 24, sy + 48, sw - 2 * pad - textW - 24, sh - 96));
  parts.push(wordmarkSvgGroup({ x: tx, y: sy + sh - pad - 30, heightMm: 30 }));
  parts.push('</svg>');
  return parts.join('\n');
}
