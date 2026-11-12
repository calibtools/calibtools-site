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

export interface PrintDefectRow { label: string; rms: number; edge: number }

/** Rows of the first results table in the printed-target guide: scenario, RMS and edge error. */
export function printDefectRowsFromGuide(markdown: string): PrintDefectRow[] {
  return [...markdown.matchAll(/^\| ([^|]+?) \| ([\d.]+) \| [^|]+ \| [^|]+ \| ([\d.]+) \| [^|]+ \|$/gm)].map((m) => ({ label: m[1].replace(' (reference)', '').replace(' (60 mm pitch)', ''), rms: +m[2], edge: +m[3] }));
}

/** Largest RMS on the left scale and the two ends of the logarithmic right scale. */
export const PRINT_DEFECT_SCALE = { rmsMax: 1.6, edgeMin: 1, edgeMax: 200, barMax: 232 };

/**
 * Two bars per scenario of the printed-target guide: what the calibration reports (RMS) beside how far
 * the fitted model is off at the frame corners. Narrow on purpose so the labels stay readable on a phone.
 */
export function printDefectFigureSvg(rows: PrintDefectRow[]): string {
  const { rmsMax, edgeMin, edgeMax, barMax } = PRINT_DEFECT_SCALE;
  const W = 640, x1 = 20, x2 = 336, top = 88, rowH = 54, H = top + rows.length * rowH + 8;
  const rmsW = (v: number) => +(Math.min(v, rmsMax) / rmsMax * barMax).toFixed(1);
  const edgeW = (v: number) => +(Math.log(Math.max(v, edgeMin) / edgeMin) / Math.log(edgeMax / edgeMin) * barMax).toFixed(1);
  let o = `<text x="${x1}" y="26" font-size="16" font-weight="600" fill="${INK}">Reprojection error</text><text x="${x1}" y="48" font-size="14" fill="${INK}">RMS in px, what you see</text>`;
  o += `<text x="${x2}" y="26" font-size="16" font-weight="600" fill="${INK}">Model error at the frame corners</text><text x="${x2}" y="48" font-size="14" fill="${INK}">px, logarithmic scale, what you get</text>`;
  // the 0.5 to 1.0 px band that the reprojection error guide marks as "something is wrong"
  o += `<rect x="${x1 + rmsW(0.5)}" y="${top - 12}" width="${+(rmsW(1) - rmsW(0.5)).toFixed(1)}" height="${H - top + 4}" fill="#FBE9EA"/><text x="${x1 + rmsW(0.5) + 4}" y="${top - 16}" font-size="12" fill="${RED_TEXT}" ${MONO}>0.5–1.0 px</text>`;
  rows.forEach((r, i) => {
    const y = top + i * rowH;
    o += `<text x="${x1}" y="${y + 14}" font-size="15" fill="${INK}">${r.label}</text>`;
    o += `<rect x="${x1}" y="${y + 22}" width="${Math.max(rmsW(r.rms), 2)}" height="16" fill="${INK}"/><text x="${x1 + Math.max(rmsW(r.rms), 2) + 6}" y="${y + 35}" font-size="14" fill="${INK}" ${MONO}>${r.rms.toFixed(2)}</text>`;
    o += `<rect x="${x2}" y="${y + 22}" width="${Math.max(edgeW(r.edge), 2)}" height="16" fill="${RED}"/><text x="${x2 + Math.max(edgeW(r.edge), 2) + 6}" y="${y + 35}" font-size="14" fill="${INK}" ${MONO}>${r.edge}</text>`;
    if (i > 0) o += `<line x1="${x1}" y1="${y - 4}" x2="${W - 20}" y2="${y - 4}" stroke="${LINE}" stroke-width="0.6"/>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Geist, system-ui, sans-serif" role="img"><rect width="${W}" height="${H}" fill="#fff"/>${o}</svg>`;
}

/* ---- Reprojection error guide: what the RMS hides ---- */

export interface HiddenErrorRow { group: string; label: string; rms: number; edge: number }

/** The three small tables under "What it hides": coverage, model complexity, one bad view. */
export function hiddenErrorRowsFromGuide(markdown: string): HiddenErrorRow[] {
  const part = markdown.slice(markdown.indexOf('## What it hides'), markdown.indexOf('## Check 1'));
  const rows: HiddenErrorRow[] = [];
  let group = '';
  for (const line of part.split('\n')) {
    const g = line.match(/^\*\*([^.*]+)\.\*\*/);
    if (g) group = g[1];
    const r = line.match(/^\| ([^|]+?) \| ([\d.]+) px \| ([\d.]+) px \|$/);
    if (r) rows.push({ group, label: /^\d+ %$/.test(r[1]) ? `Board fills ${r[1]}` : /^k\d/.test(r[1]) ? r[1] : r[1][0].toUpperCase() + r[1].slice(1), rms: +r[2], edge: +r[3] });
  }
  return rows;
}

export const HIDDEN_ERROR_SCALE = { rmsMax: 0.3, edgeMin: 0.5, edgeMax: 30, barMax: 232 };

/** Same layout as the printed-target figure: RMS on the left, true error at the frame corners on the right. */
export function hiddenErrorFigureSvg(rows: HiddenErrorRow[]): string {
  const { rmsMax, edgeMin, edgeMax, barMax } = HIDDEN_ERROR_SCALE;
  const W = 640, x1 = 20, x2 = 336, rowH = 54, groupH = 34;
  const rmsW = (v: number) => +(Math.min(v, rmsMax) / rmsMax * barMax).toFixed(1);
  const edgeW = (v: number) => +(Math.log(Math.max(v, edgeMin) / edgeMin) / Math.log(edgeMax / edgeMin) * barMax).toFixed(1);
  let o = `<text x="${x1}" y="26" font-size="16" font-weight="600" fill="${INK}">Reprojection error</text><text x="${x1}" y="48" font-size="14" fill="${INK}">RMS in px, what you see</text>`;
  o += `<text x="${x2}" y="26" font-size="16" font-weight="600" fill="${INK}">True error at the frame corners</text><text x="${x2}" y="48" font-size="14" fill="${INK}">px, logarithmic scale, what you get</text>`;
  let y = 64, last = '';
  for (const r of rows) {
    if (r.group !== last) {
      o += `<line x1="${x1}" y1="${y + 6}" x2="${W - 20}" y2="${y + 6}" stroke="${INK}" stroke-width="1"/><text x="${x1}" y="${y + 27}" font-size="13" font-weight="600" letter-spacing="0.08em" fill="${MUTED}">${r.group.toUpperCase()}</text>`;
      y += groupH; last = r.group;
    }
    o += `<text x="${x1}" y="${y + 14}" font-size="15" fill="${INK}">${r.label}</text>`;
    o += `<rect x="${x1}" y="${y + 22}" width="${Math.max(rmsW(r.rms), 2)}" height="16" fill="${INK}"/><text x="${x1 + Math.max(rmsW(r.rms), 2) + 6}" y="${y + 35}" font-size="14" fill="${INK}" ${MONO}>${r.rms}</text>`;
    o += `<rect x="${x2}" y="${y + 22}" width="${Math.max(edgeW(r.edge), 2)}" height="16" fill="${RED}"/><text x="${x2 + Math.max(edgeW(r.edge), 2) + 6}" y="${y + 35}" font-size="14" fill="${INK}" ${MONO}>${r.edge}</text>`;
    y += rowH;
  }
  const H = y + 4;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Geist, system-ui, sans-serif" role="img"><rect width="${W}" height="${H}" fill="#fff"/>${o}</svg>`;
}

/* ---- Camera calibration guide: where the board goes in the frame ---- */

type Quad = [number, number][];

/**
 * Board outlines in a 16:10 frame, in frame fractions (x right, y down).
 * Left: every view in the middle, facing the camera. Right: the corners and edges, tilted, one view running off the frame.
 */
export const COVERAGE_VIEWS: { centered: Quad[]; spread: Quad[] } = {
  centered: [
    [[0.36, 0.33], [0.62, 0.33], [0.62, 0.62], [0.36, 0.62]],
    [[0.40, 0.36], [0.66, 0.36], [0.66, 0.65], [0.40, 0.65]],
    [[0.33, 0.38], [0.59, 0.38], [0.59, 0.67], [0.33, 0.67]],
    [[0.38, 0.30], [0.64, 0.30], [0.64, 0.59], [0.38, 0.59]],
    [[0.42, 0.40], [0.68, 0.40], [0.68, 0.69], [0.42, 0.69]],
  ],
  spread: [
    [[0.02, 0.04], [0.30, 0.08], [0.29, 0.40], [0.03, 0.44]],   // top left, turned
    [[0.70, 0.03], [0.98, 0.06], [0.97, 0.42], [0.72, 0.36]],   // top right, turned the other way
    [[0.03, 0.60], [0.31, 0.56], [0.33, 0.95], [0.02, 0.97]],   // bottom left
    [[0.68, 0.62], [0.97, 0.58], [0.98, 0.96], [0.70, 0.93]],   // bottom right
    [[0.34, 0.30], [0.66, 0.34], [0.66, 0.66], [0.34, 0.70]],   // middle, tilted
    [[0.36, 0.02], [0.64, 0.02], [0.61, 0.24], [0.39, 0.24]],   // top edge, tipped back
    [[0.84, 0.30], [1.08, 0.27], [1.08, 0.73], [0.84, 0.70]],   // runs off the right edge
  ],
};

export function coverageFigureSvg(): string {
  const W = 640, fw = 290, fh = fw / 1.6, top = 14, gap = 20, x0 = 20;
  let o = '';
  const panels: [Quad[], string, string][] = [
    [COVERAGE_VIEWS.centered, 'Every view in the middle', 'The corners of the frame are never measured'],
    [COVERAGE_VIEWS.spread, 'Corners, edges and tilt', 'The whole frame is measured'],
  ];
  panels.forEach(([views, title, sub], i) => {
    const fx = x0 + i * (fw + gap);
    o += `<clipPath id="cov${i}"><rect x="${fx}" y="${top}" width="${fw}" height="${fh}"/></clipPath>`;
    o += `<rect x="${fx}" y="${top}" width="${fw}" height="${fh}" fill="#F4F3EF"/>`;
    o += `<g clip-path="url(#cov${i})">` + views.map((q) => `<polygon points="${q.map(([x, y]) => `${+(fx + x * fw).toFixed(1)},${+(top + y * fh).toFixed(1)}`).join(' ')}" fill="${INK}" fill-opacity="0.10" stroke="${INK}" stroke-width="1.4"/>`).join('') + '</g>';
    o += `<rect x="${fx}" y="${top}" width="${fw}" height="${fh}" fill="none" stroke="${INK}" stroke-width="1.5"/>`;
    o += `<text x="${fx}" y="${top + fh + 26}" font-size="16" font-weight="600" fill="${INK}">${title}</text><text x="${fx}" y="${top + fh + 47}" font-size="13.5" fill="${INK}">${sub}</text>`;
  });
  const H = +(top + fh + 60).toFixed(1);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Geist, system-ui, sans-serif" role="img"><rect width="${W}" height="${H}" fill="#fff"/>${o}</svg>`;
}

/* ---- Hand-eye guide: the two arrangements ---- */

/** Transform names in each panel; the last one is the unknown. Same names as the guide and OpenCV. */
export const HAND_EYE_PANELS = [
  { title: 'Eye-in-hand', sub: 'Camera on the robot, target fixed in the cell', known: ['T_gripper2base', 'T_target2cam'], unknown: 'T_cam2gripper' },
  { title: 'Eye-to-hand', sub: 'Camera fixed, target on the robot', known: ['T_gripper2base', 'T_target2cam'], unknown: 'T_cam2base' },
] as const;

export function handEyeFigureSvg(): string {
  const W = 640, ph = 300;
  const arrow = (x1: number, y1: number, x2: number, y2: number, color: string, dash = false) => {
    const a = Math.atan2(y2 - y1, x2 - x1), h = 9;
    const p = (d: number) => `${+(x2 - h * Math.cos(a + d)).toFixed(1)},${+(y2 - h * Math.sin(a + d)).toFixed(1)}`;
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${dash ? 2 : 1.5}"${dash ? ' stroke-dasharray="6 4"' : ''}/><polygon points="${x2},${y2} ${p(0.4)} ${p(-0.4)}" fill="${color}"/>`;
  };
  const label = (x: number, y: number, t: string, color: string, anchor = 'start') => `<text x="${x}" y="${y}" font-size="13" fill="${color}" text-anchor="${anchor}" ${MONO}>${t}</text>`;
  const board = (x: number, y: number, w: number, h: number) => {
    let b = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fff" stroke="${INK}" stroke-width="1.5"/>`;
    const n = 4, m = 3, cw = w / n, ch = h / m;
    for (let r = 0; r < m; r++) for (let c = 0; c < n; c++) if ((r + c) % 2 === 0) b += `<rect x="${+(x + c * cw).toFixed(1)}" y="${+(y + r * ch).toFixed(1)}" width="${+cw.toFixed(1)}" height="${+ch.toFixed(1)}" fill="${INK}"/>`;
    return b;
  };
  const camera = (x: number, y: number) => `<rect x="${x - 17}" y="${y - 12}" width="34" height="24" fill="#fff" stroke="${INK}" stroke-width="1.5"/><rect x="${x - 7}" y="${y + 12}" width="14" height="9" fill="${INK}"/>`;
  // robot: base block, two links, flange
  const robot = (bx: number, by: number, ex: number, ey: number, fx: number, fy: number) =>
    `<rect x="${bx - 34}" y="${by}" width="68" height="26" fill="${INK}"/><polyline points="${bx},${by} ${ex},${ey} ${fx},${fy}" fill="none" stroke="${INK}" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${bx}" cy="${by}" r="7" fill="#fff" stroke="${INK}" stroke-width="1.5"/><circle cx="${ex}" cy="${ey}" r="7" fill="#fff" stroke="${INK}" stroke-width="1.5"/><rect x="${fx - 15}" y="${fy - 5}" width="30" height="10" fill="#fff" stroke="${INK}" stroke-width="1.5"/>`;
  let o = '';
  HAND_EYE_PANELS.forEach((p, i) => {
    const y0 = i * ph;
    if (i > 0) o += `<line x1="20" y1="${y0}" x2="${W - 20}" y2="${y0}" stroke="${LINE}" stroke-width="0.8"/>`;
    o += `<text x="20" y="${y0 + 30}" font-size="17" font-weight="600" fill="${INK}">${p.title}</text><text x="20" y="${y0 + 52}" font-size="14" fill="${INK}">${p.sub}</text>`;
    const by = y0 + 256, bx = 120, ex = 190, ey = y0 + 120, fx = 300, fy = y0 + 150;
    o += `<line x1="20" y1="${by + 26}" x2="${W - 20}" y2="${by + 26}" stroke="${INK}" stroke-width="1"/>`;
    o += robot(bx, by, ex, ey, fx, fy);
    o += label(bx, by + 21, 'base', '#fff', 'middle') + label(fx, fy - 12, 'gripper', INK, 'middle');
    // gripper -> base (known, read from the controller)
    o += arrow(fx - 18, fy + 14, bx + 26, by - 10, INK) + label(232, y0 + 228, p.known[0], INK);
    if (i === 0) {
      const cx = fx + 56, cy = fy + 22, tx = 480, ty = y0 + 222;
      o += camera(cx, cy) + label(cx + 24, cy + 2, 'camera', INK);
      o += board(tx, ty, 100, 40) + label(tx + 50, ty - 8, 'target', INK, 'middle');
      o += arrow(tx + 40, ty - 22, cx + 12, cy + 26, INK) + label(456, y0 + 176, p.known[1], INK);
      o += arrow(cx - 4, cy - 16, fx + 12, fy - 8, RED_TEXT, true) + label(cx + 6, cy - 26, p.unknown, RED_TEXT);
    } else {
      const cx = 548, cy = y0 + 96, tx = fx + 22, ty = fy - 14;
      o += `<line x1="${cx}" y1="${cy - 12}" x2="${cx}" y2="${y0 + 66}" stroke="${INK}" stroke-width="3"/><line x1="${cx - 30}" y1="${y0 + 66}" x2="${cx + 30}" y2="${y0 + 66}" stroke="${INK}" stroke-width="3"/>`;
      o += camera(cx, cy) + label(cx - 24, cy + 2, 'camera', INK, 'end');
      o += board(tx, ty, 68, 28) + label(tx + 34, ty + 44, 'target', INK, 'middle');
      o += arrow(tx + 74, ty + 10, cx - 22, cy + 22, INK) + label(tx + 96, ty + 46, p.known[1], INK);
      // camera -> base, drawn as an elbow along the floor so it stays clear of the arm
      o += `<line x1="${cx}" y1="${cy + 24}" x2="${cx}" y2="${by - 6}" stroke="${RED_TEXT}" stroke-width="2" stroke-dasharray="6 4"/>` + arrow(cx, by - 6, bx + 40, by - 6, RED_TEXT, true) + label(380, by - 16, p.unknown, RED_TEXT);
    }
  });
  const H = HAND_EYE_PANELS.length * ph;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Geist, system-ui, sans-serif" role="img"><rect width="${W}" height="${H}" fill="#fff"/>${o}</svg>`;
}
