/**
 * Figures for the guides, generated from pattern geometry and from measured detection results.
 * The SVG files under src/assets/guides/ are written by `pnpm guides:figures`; a test keeps them equal to this code.
 */
import { renderPatternSvg, type PatternSpec } from './patterns';
import { patternExtent } from './pageLayout';
import { usaf1951, usaf1951Svg } from './usaf1951';
import { aprilGridTags } from './renderAprilGrid';

const base = { paper: 'A4', startId: 0, scaleBar: false, marker: 0, dict: 'DICT_6X6_250' } as const;

/** Share of the board width that is inside the camera frame in the partial-view figure. */
export const PARTIAL_VIEW_VISIBLE = 0.55;
/** White margin around the visible part of the board in the test image, mm. */
export const PARTIAL_VIEW_MARGIN = 20;

export interface PartialViewCase { key: 'checkerboard' | 'charuco' | 'aprilgrid'; label: string; unit: string; total: number; spec: PatternSpec }

/** The three boards of the partial-view figure. The detection script reads the same list. */
export const PARTIAL_VIEW_CASES: PartialViewCase[] = [
  { key: 'checkerboard', label: 'Checkerboard', unit: 'inner corners', total: 6 * 9, spec: { ...base, type: 'Checkerboard', rows: 7, cols: 10, square: 25 } },
  { key: 'charuco', label: 'ChArUco', unit: 'inner corners', total: 6 * 9, spec: { ...base, type: 'ChArUco', rows: 7, cols: 10, square: 25, marker: 18 } },
  { key: 'aprilgrid', label: 'AprilGrid', unit: 'tag corners', total: 5 * 7 * 4, spec: { ...base, type: 'AprilGrid (Kalibr)', rows: 5, cols: 7, square: 30, tagSpacing: 0.3, aprilFamily: '36h11', borderBits: 2 } },
];

/** What the detector returned for one board: points in mm from the top-left corner of the pattern. */
export interface PartialViewResult { key: string; found: boolean; points: [number, number][] }
export interface PartialViewData { opencv: string; visible: number; pxPerMm: number; results: PartialViewResult[] }

const INK = '#141414', MUTED = '#4A4A47', RED = '#E60012', LINE = '#A8A59C';

/** Three boards with their right part outside the camera frame, and the points OpenCV still returns. */
export function partialViewFigureSvg(data: PartialViewData): string {
  const panelW = 380, gap = 30, W = 3 * panelW + 2 * gap, top = 16, boardH = 230, H = top + boardH + 78;
  const r = (v: number) => +v.toFixed(2);
  let out = '';
  PARTIAL_VIEW_CASES.forEach((c, i) => {
    const { bw, bh } = patternExtent(c.spec);
    const res = data.results.find((x) => x.key === c.key)!;
    const s = Math.min((panelW - 40) / bw, (boardH - 40) / bh); // px per mm
    const x0 = i * (panelW + gap) + (panelW - bw * s) / 2, y0 = top + (boardH - bh * s) / 2;
    const cut = x0 + bw * s * data.visible;                      // right edge of the camera frame
    const frameX = x0 - 14, frameY = y0 - 14, frameH = bh * s + 28;
    const id = `pv${i}`;
    out += `<clipPath id="${id}in"><rect x="${r(frameX)}" y="${r(frameY)}" width="${r(cut - frameX)}" height="${r(frameH)}"/></clipPath>`;
    out += `<clipPath id="${id}out"><rect x="${r(cut)}" y="${r(frameY)}" width="${r(x0 + bw * s + 14 - cut)}" height="${r(frameH)}"/></clipPath>`;
    const board = `<g transform="translate(${r(x0)} ${r(y0)}) scale(${+s.toFixed(5)})"><rect x="-6" y="-6" width="${bw + 12}" height="${bh + 12}" fill="#fff"/>${renderPatternSvg(c.spec, 0, 0)}</g>`;
    out += `<g clip-path="url(#${id}out)" opacity="0.16">${board}</g><g clip-path="url(#${id}in)">${board}</g>`;
    out += `<rect x="${r(frameX)}" y="${r(frameY)}" width="${r(cut - frameX)}" height="${r(frameH)}" fill="none" stroke="${INK}" stroke-width="1.5"/>`;
    out += `<line x1="${r(cut)}" y1="${r(frameY - 6)}" x2="${r(cut)}" y2="${r(frameY + frameH + 6)}" stroke="${INK}" stroke-width="1.5" stroke-dasharray="5 4"/>`;
    for (const [px, py] of res.points) out += `<circle cx="${r(x0 + px * s)}" cy="${r(y0 + py * s)}" r="3.2" fill="${RED}" stroke="#fff" stroke-width="0.8"/>`;
    const cx = i * (panelW + gap) + panelW / 2, ty = top + boardH + 30;
    out += `<text x="${cx}" y="${ty}" text-anchor="middle" font-size="17" font-weight="600" fill="${INK}">${c.label}</text>`;
    out += `<text x="${cx}" y="${ty + 24}" text-anchor="middle" font-size="15" fill="${res.points.length ? INK : MUTED}" font-family="'Geist Mono', ui-monospace, monospace">${res.points.length} of ${c.total} ${c.unit}</text>`;
    if (i > 0) out += `<line x1="${i * (panelW + gap) - gap / 2}" y1="${top}" x2="${i * (panelW + gap) - gap / 2}" y2="${H - 10}" stroke="${LINE}" stroke-width="1"/>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Geist, system-ui, sans-serif" role="img"><rect width="${W}" height="${H}" fill="#fff"/>${out}</svg>`;
}

/** USAF 1951 target, groups 0 to 3, for the lp/mm guide. */
export function usafFigureSvg(): string {
  return usaf1951Svg(usaf1951(0, 3, 1.5)).replace(/#000/g, INK);
}

const GREEN = '#00A651', RED_TEXT = '#B3000E', GREEN_TEXT = '#007A3D';
const MONO = `font-family="'Geist Mono', ui-monospace, monospace"`;

/** The AprilGrid of the Kalibr figure: small enough to label every tag. */
export const KALIBR_FIGURE_SPEC: PatternSpec = { ...base, type: 'AprilGrid (Kalibr)', rows: 3, cols: 4, square: 40, tagSpacing: 0.3, aprilFamily: '36h11', borderBits: 2 };

/** AprilGrid with tag IDs, Kalibr's origin and axes, and what tagSize and tagSpacing measure. Units: mm of the board. */
export function kalibrFrameFigureSvg(): string {
  const s = KALIBR_FIGURE_SPEC, tags = aprilGridTags(s);
  const tag = s.square, gap = tag * s.tagSpacing!, { bw, bh } = patternExtent(s);
  const ox = 34, oy = 30, W = ox + bw + 16, H = oy + bh + 40;
  const r = (v: number) => +v.toFixed(3);
  let o = renderPatternSvg(s, ox, oy);
  // tag IDs under each tag
  for (const t of tags) o += `<text x="${r(ox + t.x + tag / 2)}" y="${r(oy + t.y + tag + 8.6)}" text-anchor="middle" font-size="7.5" fill="${INK}" ${MONO}>${t.id}</text>`;
  // tagSize over the top-left tag, the gap over the first gap
  const dimY = oy - 8, tick = (x: number) => `<line x1="${r(x)}" y1="${dimY - 3}" x2="${r(x)}" y2="${dimY + 3}" stroke="${INK}" stroke-width="0.6"/>`;
  o += `<line x1="${ox}" y1="${dimY}" x2="${ox + tag}" y2="${dimY}" stroke="${INK}" stroke-width="0.6"/>${tick(ox)}${tick(ox + tag)}`;
  o += `<text x="${ox + tag / 2}" y="${dimY - 5}" text-anchor="middle" font-size="6.5" fill="${INK}" ${MONO}>tagSize</text>`;
  o += `<line x1="${ox + tag}" y1="${dimY}" x2="${r(ox + tag + gap)}" y2="${dimY}" stroke="${RED_TEXT}" stroke-width="0.6"/>${tick(ox + tag + gap)}`;
  o += `<text x="${r(ox + tag + gap + 3)}" y="${dimY - 5}" font-size="6.5" fill="${RED_TEXT}" ${MONO}>tagSpacing × tagSize</text>`;
  // origin at the bottom-left corner of tag 0; x to the right, y up
  const oxA = ox, oyA = oy + bh, axY = oyA + 24, axX = ox - 16, len = 46, h = 5;
  o += `<line x1="${oxA}" y1="${axY}" x2="${oxA + len}" y2="${axY}" stroke="${RED}" stroke-width="1.6"/><path d="M${oxA + len - h} ${axY - h / 2}L${oxA + len} ${axY}L${oxA + len - h} ${axY + h / 2}" fill="none" stroke="${RED}" stroke-width="1.6"/>`;
  o += `<text x="${oxA + len + 5}" y="${axY + 2.6}" font-size="7.5" font-weight="600" fill="${RED_TEXT}" ${MONO}>x</text>`;
  o += `<line x1="${axX}" y1="${oyA}" x2="${axX}" y2="${oyA - len}" stroke="${GREEN}" stroke-width="1.6"/><path d="M${axX - h / 2} ${oyA - len + h}L${axX} ${oyA - len}L${axX + h / 2} ${oyA - len + h}" fill="none" stroke="${GREEN}" stroke-width="1.6"/>`;
  o += `<text x="${axX}" y="${oyA - len - 4}" text-anchor="middle" font-size="7.5" font-weight="600" fill="${GREEN_TEXT}" ${MONO}>y</text>`;
  o += `<line x1="${axX}" y1="${oyA}" x2="${oxA}" y2="${oyA}" stroke="${LINE}" stroke-width="0.5" stroke-dasharray="2 2"/><line x1="${oxA}" y1="${oyA}" x2="${oxA}" y2="${axY}" stroke="${LINE}" stroke-width="0.5" stroke-dasharray="2 2"/>`;
  o += `<circle cx="${oxA}" cy="${oyA}" r="2.6" fill="${RED}" stroke="#fff" stroke-width="0.8"/>`;
  o += `<text x="${oxA + len + 16}" y="${axY + 2.6}" font-size="6.5" fill="${MUTED}" ${MONO}>origin: bottom-left corner of tag 0</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${r(W * 4)}" height="${r(H * 4)}" viewBox="0 0 ${r(W)} ${r(H)}" role="img"><rect width="${r(W)}" height="${r(H)}" fill="#fff"/>${o}</svg>`;
}

/** Boards of the multi-board figure: the same 7 × 10 ChArUco board four times, each starting where the last one ended. */
export const MULTI_BOARD_SPECS: PatternSpec[] = [0, 1, 2, 3].map((i) => ({ ...base, type: 'ChArUco', rows: 7, cols: 10, square: 25, marker: 18, startId: i * 35 }));

/** Four boards in a 2 × 2 arrangement with their marker ID ranges. */
export function multiBoardFigureSvg(): string {
  const cellW = 440, cellH = 372, W = 2 * cellW, H = 2 * cellH;
  let o = '';
  MULTI_BOARD_SPECS.forEach((s, i) => {
    const { bw, bh } = patternExtent(s), k = 360 / bw;
    const x0 = (i % 2) * cellW + (cellW - bw * k) / 2, y0 = Math.floor(i / 2) * cellH + 24;
    const first = s.startId, last = s.startId + Math.floor((s.rows * s.cols) / 2) - 1;
    o += `<g transform="translate(${x0} ${y0}) scale(${+k.toFixed(5)})"><rect x="-8" y="-8" width="${bw + 16}" height="${bh + 16}" fill="#fff" stroke="${LINE}" stroke-width="${+(1 / k).toFixed(3)}"/>${renderPatternSvg(s, 0, 0)}</g>`;
    const cx = (i % 2) * cellW + cellW / 2, ty = y0 + bh * k + 44;
    o += `<text x="${cx}" y="${ty}" text-anchor="middle" font-size="19" font-weight="600" fill="${INK}">Board ${i + 1}</text>`;
    o += `<text x="${cx}" y="${ty + 26}" text-anchor="middle" font-size="17" fill="${INK}" ${MONO}>start ID ${first} · IDs ${first}–${last}</text>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Geist, system-ui, sans-serif" role="img"><rect width="${W}" height="${H}" fill="#fff"/>${o}</svg>`;
}

/** Board of the fill figure: the 14 × 9 board of the guide's test. */
export const FILL_FIGURE_SPEC: PatternSpec = { ...base, type: 'ChArUco', rows: 9, cols: 14, square: 25, marker: 18 };

export interface FillRow { fill: number; pxPerSquare: number; cornerErrorPx: number }

/**
 * Two camera frames with the board at a small and at the recommended share of the frame width.
 * The numbers under each frame are rows of the guide's results table, passed in by the caller.
 * The frame is drawn 16:10; only the board's share of the width is to scale.
 */
export function fillFigureSvg(rows: [FillRow, FillRow]): string {
  const fw = 430, fh = fw / 1.6, gap = 60, W = 2 * fw + gap + 40, H = fh + 96, top = 14;
  const { bw, bh } = patternExtent(FILL_FIGURE_SPEC);
  let o = '';
  rows.forEach((row, i) => {
    const fx = 20 + i * (fw + gap), k = (fw * row.fill) / 100 / bw;
    const bx = fx + (fw - bw * k) / 2, by = top + (fh - bh * k) / 2;
    o += `<rect x="${fx}" y="${top}" width="${fw}" height="${fh}" fill="#F4F3EF" stroke="${INK}" stroke-width="1.5"/>`;
    o += `<g transform="translate(${+bx.toFixed(2)} ${+by.toFixed(2)}) scale(${+k.toFixed(5)})"><rect x="-10" y="-10" width="${bw + 20}" height="${bh + 20}" fill="#fff"/>${renderPatternSvg(FILL_FIGURE_SPEC, 0, 0)}</g>`;
    // width bracket under the board
    const y = top + fh - 16;
    o += `<line x1="${+bx.toFixed(2)}" y1="${y}" x2="${+(bx + bw * k).toFixed(2)}" y2="${y}" stroke="${RED_TEXT}" stroke-width="1.2"/><line x1="${+bx.toFixed(2)}" y1="${y - 5}" x2="${+bx.toFixed(2)}" y2="${y + 5}" stroke="${RED_TEXT}" stroke-width="1.2"/><line x1="${+(bx + bw * k).toFixed(2)}" y1="${y - 5}" x2="${+(bx + bw * k).toFixed(2)}" y2="${y + 5}" stroke="${RED_TEXT}" stroke-width="1.2"/>`;
    const cx = fx + fw / 2, ty = top + fh + 30;
    o += `<text x="${cx}" y="${ty}" text-anchor="middle" font-size="18" font-weight="600" fill="${INK}">Board fills ${row.fill} % of the frame width</text>`;
    o += `<text x="${cx}" y="${ty + 26}" text-anchor="middle" font-size="15" fill="${INK}" ${MONO}>${row.pxPerSquare} px per square · ${row.cornerErrorPx} px error at the frame corners</text>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${+H.toFixed(1)}" viewBox="0 0 ${W} ${+H.toFixed(1)}" font-family="Geist, system-ui, sans-serif" role="img"><rect width="${W}" height="${+H.toFixed(1)}" fill="#fff"/>${o}</svg>`;
}

/** Rows of the "Board fill" table in the target-size guide. */
export function fillRowsFromGuide(markdown: string): FillRow[] {
  return [...markdown.matchAll(/^\| (\d+) % \| (\d+) \| [\d.]+ px \| [\d.]+ % \| ([\d.]+) px \|$/gm)].map((m) => ({ fill: +m[1], pxPerSquare: +m[2], cornerErrorPx: +m[3] }));
}
