/**
 * Line drawings of stock boards (VI v3 §4.5): board outline, the real pattern,
 * origin with axes, and dimension lines for the board and the pattern area.
 *
 * Nothing is drawn by hand. The pattern comes from the same renderer the
 * generator and the print files use, sizes come from boardSizes.ts and the
 * catalog. One SVG user unit is one millimeter. Every dimension line carries
 * its value in `data-mm`; boardDrawing.test.ts reads the SVG back and compares
 * `data-mm`, the drawn length and boardSizes.ts.
 */
import type { PatternSpec } from './patterns';
import { renderCharucoSvg } from './renderCharuco';
import { renderCheckerboardSvg } from './renderCheckerboard';
import { patternExtent } from './pageLayout';
import { CATALOG, specFromEntry } from './catalogPatterns';
import { GENERATOR_DEFAULT } from './patternLink';
import { ALL_CHARUCO_SIZES } from './boardSizes';

const INK = '#141414';
const RED = '#E60012';
const GREEN = '#00A651';
const MONO = "'Geist Mono', ui-monospace, monospace";

const r2 = (v: number) => Math.round(v * 100) / 100;
const fmt = (v: number) => String(r2(v));

export interface BoardDrawingInput {
  /** Board outline, mm. */
  boardW: number;
  boardH: number;
  /** Pattern, centered on the board. */
  spec: PatternSpec;
  /** Accessible name, e.g. the part number. */
  label: string;
  /** Dimension lines (default true). Off for small cards, where the values would not be readable. */
  dimensions?: boolean;
}

/** Pattern types this module can draw; their extent is exactly cols × square by rows × square. */
const RENDERERS: Partial<Record<PatternSpec['type'], (s: PatternSpec, ox: number, oy: number) => string>> = {
  ChArUco: renderCharucoSvg,
  'ArUco grid': renderCharucoSvg,
  Checkerboard: renderCheckerboardSvg,
};

/** One dimension line with end ticks and its value; `data-mm` is the dimension in mm. */
function dim(name: string, x1: number, y1: number, x2: number, y2: number, mm: number, text: string, u: number): string {
  const horizontal = y1 === y2;
  const t = 2 * u; // half tick length
  const tick = (x: number, y: number) => `<line x1="${fmt(x - t)}" y1="${fmt(y + t)}" x2="${fmt(x + t)}" y2="${fmt(y - t)}"/>`;
  const fs = 7.5 * u;
  const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
  const w = text.length * fs * 0.62 + 2 * u; // knockout behind the value
  const label = horizontal
    ? `<rect class="dim-knockout" x="${fmt(cx - w / 2)}" y="${fmt(cy - fs * 0.7)}" width="${fmt(w)}" height="${fmt(fs * 1.4)}" fill="#fff" stroke="none"/><text x="${fmt(cx)}" y="${fmt(cy + fs * 0.36)}" text-anchor="middle" font-size="${fmt(fs)}">${text}</text>`
    : `<g transform="rotate(-90 ${fmt(cx)} ${fmt(cy)})"><rect class="dim-knockout" x="${fmt(cx - w / 2)}" y="${fmt(cy - fs * 0.7)}" width="${fmt(w)}" height="${fmt(fs * 1.4)}" fill="#fff" stroke="none"/><text x="${fmt(cx)}" y="${fmt(cy + fs * 0.36)}" text-anchor="middle" font-size="${fmt(fs)}">${text}</text></g>`;
  return `<g class="dim" data-dim="${name}" data-mm="${fmt(mm)}"><line class="dim-line" x1="${fmt(x1)}" y1="${fmt(y1)}" x2="${fmt(x2)}" y2="${fmt(y2)}"/>${tick(x1, y1)}${tick(x2, y2)}${label}</g>`;
}

/** Extension line from the object to just past the dimension line. */
const ext = (x1: number, y1: number, x2: number, y2: number) => `<line x1="${fmt(x1)}" y1="${fmt(y1)}" x2="${fmt(x2)}" y2="${fmt(y2)}"/>`;

export function boardDrawingSvg({ boardW, boardH, spec, label, dimensions = true }: BoardDrawingInput): string {
  const render = RENDERERS[spec.type];
  if (!render) throw new Error(`No line drawing for pattern type "${spec.type}"`);
  const { bw: patW, bh: patH } = patternExtent(spec);
  if (patW > boardW + 1e-6 || patH > boardH + 1e-6) throw new Error(`Pattern ${patW} × ${patH} mm does not fit on a ${boardW} × ${boardH} mm board`);
  const ox = r2((boardW - patW) / 2), oy = r2((boardH - patH) / 2);

  // Line weights and text scale with the board so every size reads the same on screen.
  const u = Math.max(boardW, boardH) / 400;
  const thin = 0.45 * u;
  const d1 = 14 * u, d2 = 31 * u; // offsets of the inner (pattern) and outer (board) dimension lines
  const over = 3 * u;
  const padL = 6 * u, padB = 6 * u;
  const padT = dimensions ? d2 + 8 * u : 6 * u, padR = dimensions ? d2 + 8 * u : 6 * u;

  // The pattern, from the shared renderer; black is drawn in ink so the drawing matches the page.
  const pattern = render(spec, ox, oy).replaceAll('fill="#000"', `fill="${INK}"`);

  const axisLen = Math.min(patW, patH) * 0.16;
  const gapX = Math.min(oy, 6 * u) / 2 + 1.5 * u; // X arrow sits in the top margin, Y arrow in the left margin
  const gapY = Math.min(ox, 6 * u) / 2 + 1.5 * u;
  const head = 2.6 * u;
  const xa = { x1: ox, y: r2(oy - gapX), x2: r2(ox + axisLen) };
  const ya = { x: r2(ox - gapY), y1: oy, y2: r2(oy + axisLen) };

  const gridW = `${fmt(patW)} = ${spec.cols} × ${fmt(spec.square)}`;
  const gridH = `${fmt(patH)} = ${spec.rows} × ${fmt(spec.square)}`;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${fmt(-padL)} ${fmt(-padT)} ${fmt(boardW + padL + padR)} ${fmt(boardH + padT + padB)}" role="img" aria-label="Line drawing of ${label}: board ${fmt(boardW)} × ${fmt(boardH)} mm, pattern area ${fmt(patW)} × ${fmt(patH)} mm, ${spec.cols} × ${spec.rows} squares of ${fmt(spec.square)} mm" font-family="${MONO}" fill="${INK}">`,
    `<rect class="board" x="0" y="0" width="${fmt(boardW)}" height="${fmt(boardH)}" fill="#fff" stroke="${INK}" stroke-width="${fmt(1.2 * u)}"/>`,
    `<g class="pattern">${pattern}</g>`,
    // Origin and axes, as printed on the boards: X right in red, Y down in green
    `<g class="axes" stroke-width="${fmt(0.9 * u)}" fill="none">`,
    `<line class="axis-x" x1="${fmt(xa.x1)}" y1="${fmt(xa.y)}" x2="${fmt(xa.x2)}" y2="${fmt(xa.y)}" stroke="${RED}"/>`,
    `<path d="M${fmt(xa.x2 - head)} ${fmt(xa.y - head * 0.5)}L${fmt(xa.x2)} ${fmt(xa.y)}L${fmt(xa.x2 - head)} ${fmt(xa.y + head * 0.5)}" stroke="${RED}"/>`,
    `<line class="axis-y" x1="${fmt(ya.x)}" y1="${fmt(ya.y1)}" x2="${fmt(ya.x)}" y2="${fmt(ya.y2)}" stroke="${GREEN}"/>`,
    `<path d="M${fmt(ya.x - head * 0.5)} ${fmt(ya.y2 - head)}L${fmt(ya.x)} ${fmt(ya.y2)}L${fmt(ya.x + head * 0.5)} ${fmt(ya.y2 - head)}" stroke="${GREEN}"/>`,
    `</g>`,
    `<text x="${fmt(xa.x2 + 2 * u)}" y="${fmt(xa.y + 2.2 * u)}" font-size="${fmt(6 * u)}" fill="${RED}">X</text>`,
    `<text x="${fmt(ya.x)}" y="${fmt(ya.y2 + 8 * u)}" font-size="${fmt(6 * u)}" text-anchor="middle" fill="#007A3D">Y</text>`,
    `<circle class="origin" cx="${fmt(ox)}" cy="${fmt(oy)}" r="${fmt(1.7 * u)}" fill="${RED}"/>`,
    ...(dimensions ? [
    // Dimension and extension lines
    `<g class="dims" stroke="${INK}" stroke-width="${fmt(thin)}">`,
    ext(0, 0, 0, -d2 - over), ext(boardW, 0, boardW, -d2 - over),
    ext(ox, oy, ox, -d1 - over), ext(ox + patW, oy, ox + patW, -d1 - over),
    ext(boardW, 0, boardW + d2 + over, 0), ext(boardW, boardH, boardW + d2 + over, boardH),
    ext(ox + patW, oy, boardW + d1 + over, oy), ext(ox + patW, oy + patH, boardW + d1 + over, oy + patH),
    `<g stroke-width="${fmt(thin)}" fill="${INK}">`,
    dim('board-w', 0, -d2, boardW, -d2, boardW, fmt(boardW), u),
    dim('pattern-w', ox, -d1, ox + patW, -d1, patW, gridW, u),
    dim('board-h', boardW + d2, 0, boardW + d2, boardH, boardH, fmt(boardH), u),
    dim('pattern-h', boardW + d1, oy, boardW + d1, oy + patH, patH, gridH, u),
    `</g></g>`,
    ] : []),
    `</svg>`,
  ].join('').replace(/<text /g, '<text stroke="none" ');
}

/** Drawing of a stock ChArUco or checkerboard target by part number; undefined for anything else. */
export function drawingForPartNumber(partNumber: string, opts: { dimensions?: boolean } = {}): string | undefined {
  const entry = CATALOG.find((e) => e.partNumber === partNumber && RENDERERS[e.spec.type]);
  if (!entry) return undefined;
  const m = /-(\d+)X(\d+)-/.exec(partNumber);
  if (!m) return undefined;
  const spec = { ...GENERATOR_DEFAULT, ...specFromEntry(entry) } as PatternSpec;
  return boardDrawingSvg({ boardW: Number(m[1]), boardH: Number(m[2]), spec, label: partNumber, dimensions: opts.dimensions });
}

/**
 * The stock board shown for a product on cards: the 400 × 300 mm size where the product has one,
 * else the second size; first variant (default dictionary or fine grid). Undefined when we cannot draw it.
 */
export function representativePartNumber(handle: string): string | undefined {
  const entries = CATALOG.filter((e) => e.handle === handle && RENDERERS[e.spec.type]);
  if (!entries.length) return undefined;
  const sizes = [...new Set(entries.map((e) => e.partNumber.split('-')[3]))];
  const size = sizes.includes('400X300') ? '400X300' : sizes[Math.min(1, sizes.length - 1)];
  return entries.find((e) => e.partNumber.split('-')[3] === size)?.partNumber;
}

/**
 * Board outlines side by side at one common scale (1:scale), bottom-aligned,
 * for the category tiles. Sizes must be stock sizes ("400 × 300").
 */
export function toScaleOutlines(labels: string[], scale: number): { svg: string; caption: string } {
  const sizes = labels.map((label) => {
    if (!ALL_CHARUCO_SIZES.some((s) => s.label === label)) throw new Error(`"${label}" is not a stock size`);
    const [w, h] = label.split(' × ').map(Number);
    return { w, h };
  });
  const gap = 10, stroke = 1;
  const maxH = Math.max(...sizes.map((s) => s.h)) / scale;
  let x = stroke / 2;
  const rects = sizes.map((s) => {
    const w = s.w / scale, h = s.h / scale;
    const out = `<rect class="outline" x="${fmt(x)}" y="${fmt(maxH - h + stroke / 2)}" width="${fmt(w)}" height="${fmt(h)}" data-mm="${s.w}x${s.h}" fill="#fff" stroke="${INK}" stroke-width="${stroke}"/>`;
    x += w + gap;
    return out;
  });
  const totalW = x - gap + stroke / 2;
  const names = sizes.map((s) => `${s.w} × ${s.h} mm`).join(', ');
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${fmt(totalW)} ${fmt(maxH + stroke)}" width="${fmt(totalW)}" height="${fmt(maxH + stroke)}" role="img" aria-label="Board outlines to scale 1:${scale}: ${names}">${rects.join('')}</svg>`,
    caption: `${sizes.map((s) => s.w).join(' · ')} mm, 1:${scale}`,
  };
}
