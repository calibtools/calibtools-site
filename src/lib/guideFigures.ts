/**
 * Figures for the guides, generated from pattern geometry and from measured detection results.
 * The SVG files under src/assets/guides/ are written by `pnpm guides:figures`; a test keeps them equal to this code.
 */
import { renderPatternSvg, type PatternSpec } from './patterns';
import { patternExtent } from './pageLayout';
import { usaf1951, usaf1951Svg } from './usaf1951';

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
