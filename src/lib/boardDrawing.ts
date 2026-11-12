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
import { renderCharucoSvg, renderArucoGridSvg } from './renderCharuco';
import { renderCheckerboardSvg } from './renderCheckerboard';
import { renderAprilGridSvg, aprilGridTags } from './renderAprilGrid';
import { renderCirclesSvg } from './renderCircles';
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

/** Pattern types this module can draw. */
const RENDERERS: Partial<Record<PatternSpec['type'], (s: PatternSpec, ox: number, oy: number) => string>> = {
  ChArUco: renderCharucoSvg,
  'ArUco grid': renderArucoGridSvg,
  Checkerboard: renderCheckerboardSvg,
  'AprilGrid (Kalibr)': renderAprilGridSvg,
  'Symmetric circles': renderCirclesSvg,
  'Asymmetric circles': renderCirclesSvg,
};

/**
 * Where a pattern's ink is, relative to the origin its renderer is called with, and what
 * the pattern dimension measures. Read off the renderers, never guessed:
 * - squares: the block of squares, cols × square by rows × square;
 * - AprilGrid: first tag edge to last tag edge (tags plus the gaps between them);
 * - circle grids: the renderer centers each circle in a spacing-sized cell, so the ink starts
 *   half a spacing minus the radius in; the dimension runs between the outermost circle centers.
 */
interface PatternFrame {
  box: { x: number; y: number; w: number; h: number };
  dimX: { from: number; to: number; text: string };
  dimY: { from: number; to: number; text: string };
  origin: { x: number; y: number };
  /** Kalibr frame: origin at the bottom-left of the pattern, y pointing up. */
  yUp?: boolean;
}

export function patternFrame(s: PatternSpec): PatternFrame {
  if (s.type === 'AprilGrid (Kalibr)') {
    const tags = aprilGridTags(s);
    const w = Math.max(...tags.map((t) => t.x + t.size)), h = Math.max(...tags.map((t) => t.y + t.size));
    const gap = s.cols > 1 ? tags[1].x - tags[0].x - s.square : 0;
    const part = (n: number) => (n > 1 ? `${n} × ${fmt(s.square)} + ${n - 1} × ${fmt(gap)}` : `${fmt(s.square)}`);
    return {
      box: { x: 0, y: 0, w, h },
      dimX: { from: 0, to: w, text: `${fmt(w)} = ${part(s.cols)}` },
      dimY: { from: 0, to: h, text: `${fmt(h)} = ${part(s.rows)}` },
      origin: { x: 0, y: h },
      yUp: true,
    };
  }
  if (s.type === 'Symmetric circles' || s.type === 'Asymmetric circles') {
    const sx = s.circleSpacingX ?? s.square, sy = s.circleSpacingY ?? s.square;
    const d = s.circleDiameter ?? s.square * 0.56;
    const spanX = (s.cols - 1) * sx, spanY = (s.rows - 1) * sy;
    return {
      box: { x: sx / 2 - d / 2, y: sy / 2 - d / 2, w: spanX + d, h: spanY + d },
      dimX: { from: sx / 2, to: sx / 2 + spanX, text: `${fmt(spanX)} = ${s.cols - 1} × ${fmt(sx)}` },
      dimY: { from: sy / 2, to: sy / 2 + spanY, text: `${fmt(spanY)} = ${s.rows - 1} × ${fmt(sy)}` },
      origin: { x: sx / 2, y: sy / 2 },
    };
  }
  if (s.type === 'ArUco grid') {
    // GridBoard: first marker edge to last marker edge.
    const gap = s.square - s.marker, gw = s.cols * s.square - gap, gh = s.rows * s.square - gap;
    const part = (n: number) => `${n} × ${fmt(s.marker)}${n > 1 ? ` + ${n - 1} × ${fmt(gap)}` : ''}`;
    return {
      box: { x: 0, y: 0, w: gw, h: gh },
      dimX: { from: 0, to: gw, text: `${fmt(gw)} = ${part(s.cols)}` },
      dimY: { from: 0, to: gh, text: `${fmt(gh)} = ${part(s.rows)}` },
      origin: { x: 0, y: 0 },
    };
  }
  const w = s.cols * s.square, h = s.rows * s.square;
  return {
    box: { x: 0, y: 0, w, h },
    dimX: { from: 0, to: w, text: `${fmt(w)} = ${s.cols} × ${fmt(s.square)}` },
    dimY: { from: 0, to: h, text: `${fmt(h)} = ${s.rows} × ${fmt(s.square)}` },
    origin: { x: 0, y: 0 },
  };
}

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
  const f = patternFrame(spec);
  const patW = f.box.w, patH = f.box.h;
  if (patW > boardW + 1e-6 || patH > boardH + 1e-6) throw new Error(`Pattern ${fmt(patW)} × ${fmt(patH)} mm does not fit on a ${boardW} × ${boardH} mm board`);
  // The ink is centered on the board. (rx, ry) is where the renderer starts; (ox, oy) is the ink's top-left corner.
  const ox = r2((boardW - patW) / 2), oy = r2((boardH - patH) / 2);
  const rx = r2(ox - f.box.x), ry = r2(oy - f.box.y);
  const dx1 = r2(rx + f.dimX.from), dx2 = r2(rx + f.dimX.to), dy1 = r2(ry + f.dimY.from), dy2 = r2(ry + f.dimY.to);

  // Line weights and text scale with the board so every size reads the same on screen.
  const u = Math.max(boardW, boardH) / 400;
  const thin = 0.45 * u;
  const d1 = 14 * u, d2 = 31 * u; // offsets of the inner (pattern) and outer (board) dimension lines
  const over = 3 * u;
  const padL = 6 * u, padB = 6 * u;
  const padT = dimensions ? d2 + 8 * u : 6 * u, padR = dimensions ? d2 + 8 * u : 6 * u;

  // The pattern, from the shared renderer; black is drawn in ink so the drawing matches the page.
  const pattern = render(spec, rx, ry).replaceAll('fill="#000"', `fill="${INK}"`);

  const axisLen = Math.min(patW, patH) * 0.16;
  const gapX = Math.min(oy, 6 * u) / 2 + 1.5 * u; // X arrow sits in the top margin, Y arrow in the left margin
  const gapY = Math.min(ox, 6 * u) / 2 + 1.5 * u;
  const head = 2.6 * u;
  // OpenCV frame: X arrow in the top margin, Y arrow down the left margin from the top.
  // Kalibr frame (AprilGrid): X arrow in the bottom margin, Y arrow up the left margin from the bottom.
  const up = f.yUp === true;
  const oyAxis = r2(ry + f.origin.y);
  const xa = { x1: ox, y: up ? r2(oyAxis + gapX) : r2(oy - gapX), x2: r2(ox + axisLen) };
  const ya = { x: r2(ox - gapY), y1: up ? oyAxis : oy, y2: up ? r2(oyAxis - axisLen) : r2(oy + axisLen) };
  const yHead = up ? -head : head; // arrow head points along the axis
  const yLabel = up ? r2(ya.y2 - 3 * u) : r2(ya.y2 + 8 * u);

  const gridW = f.dimX.text;
  const gridH = f.dimY.text;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${fmt(-padL)} ${fmt(-padT)} ${fmt(boardW + padL + padR)} ${fmt(boardH + padT + padB)}" role="img" aria-label="Line drawing of ${label}: board ${fmt(boardW)} × ${fmt(boardH)} mm, pattern area ${fmt(patW)} × ${fmt(patH)} mm, ${spec.cols} × ${spec.rows} squares of ${fmt(spec.square)} mm" font-family="${MONO}" fill="${INK}">`,
    `<rect class="board" x="0" y="0" width="${fmt(boardW)}" height="${fmt(boardH)}" fill="#fff" stroke="${INK}" stroke-width="${fmt(1.2 * u)}"/>`,
    `<g class="pattern">${pattern}</g>`,
    // Origin and axes, as printed on the boards: X right in red, Y in green (down, or up for the Kalibr frame)
    `<g class="axes" stroke-width="${fmt(0.9 * u)}" fill="none">`,
    `<line class="axis-x" x1="${fmt(xa.x1)}" y1="${fmt(xa.y)}" x2="${fmt(xa.x2)}" y2="${fmt(xa.y)}" stroke="${RED}"/>`,
    `<path d="M${fmt(xa.x2 - head)} ${fmt(xa.y - head * 0.5)}L${fmt(xa.x2)} ${fmt(xa.y)}L${fmt(xa.x2 - head)} ${fmt(xa.y + head * 0.5)}" stroke="${RED}"/>`,
    `<line class="axis-y" x1="${fmt(ya.x)}" y1="${fmt(ya.y1)}" x2="${fmt(ya.x)}" y2="${fmt(ya.y2)}" stroke="${GREEN}"/>`,
    `<path d="M${fmt(ya.x - head * 0.5)} ${fmt(ya.y2 - yHead)}L${fmt(ya.x)} ${fmt(ya.y2)}L${fmt(ya.x + head * 0.5)} ${fmt(ya.y2 - yHead)}" stroke="${GREEN}"/>`,
    `</g>`,
    `<text x="${fmt(xa.x2 + 2 * u)}" y="${fmt(xa.y + 2.2 * u)}" font-size="${fmt(6 * u)}" fill="${RED}">X</text>`,
    `<text x="${fmt(ya.x)}" y="${fmt(yLabel)}" font-size="${fmt(6 * u)}" text-anchor="middle" fill="#007A3D">Y</text>`,
    `<circle class="origin" cx="${fmt(rx + f.origin.x)}" cy="${fmt(ry + f.origin.y)}" r="${fmt(1.7 * u)}" fill="${RED}"/>`,
    ...(dimensions ? [
    // Dimension and extension lines
    `<g class="dims" stroke="${INK}" stroke-width="${fmt(thin)}">`,
    ext(0, 0, 0, -d2 - over), ext(boardW, 0, boardW, -d2 - over),
    ext(dx1, oy, dx1, -d1 - over), ext(dx2, oy, dx2, -d1 - over),
    ext(boardW, 0, boardW + d2 + over, 0), ext(boardW, boardH, boardW + d2 + over, boardH),
    ext(ox + patW, dy1, boardW + d1 + over, dy1), ext(ox + patW, dy2, boardW + d1 + over, dy2),
    `<g stroke-width="${fmt(thin)}" fill="${INK}">`,
    dim('board-w', 0, -d2, boardW, -d2, boardW, fmt(boardW), u),
    dim('pattern-w', dx1, -d1, dx2, -d1, f.dimX.to - f.dimX.from, gridW, u),
    dim('board-h', boardW + d2, 0, boardW + d2, boardH, boardH, fmt(boardH), u),
    dim('pattern-h', boardW + d1, dy1, boardW + d1, dy2, f.dimY.to - f.dimY.from, gridH, u),
    `</g></g>`,
    ] : []),
    `</svg>`,
  ].join('').replace(/<text /g, '<text stroke="none" ');
}

/** Drawing of a stock ChArUco, checkerboard, AprilGrid or circle-grid target by part number; undefined for anything else. */
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
