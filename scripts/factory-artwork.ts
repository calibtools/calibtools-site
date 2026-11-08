/**
 * Factory artwork for a catalog board: 1:1 mm print file (SVG + PDF) with the
 * pattern from src/lib geometry and the brand label line, plus an A3 approval
 * drawing (dimensions, tolerances, marker ID map) and the OpenCV JSON.
 *
 * Usage:
 *   pnpm exec tsx scripts/factory-artwork.ts --pn CT-CHA-P-400X300-D5 [--rev A] [--out out/factory]
 *
 * All text is outlined (opentype.js), so the files open identically anywhere.
 * PDFs are rendered with Playwright Chromium (CT_CHROMIUM_PATH to use a system Chrome).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
// @ts-expect-error opentype.js ships no types
import opentype from 'opentype.js';
import { chromium } from '@playwright/test';
import { parse } from '../src/lib/partNumber';
import { COMPOSITE_SIZES } from '../src/lib/boardSizes';
import { renderCharucoSvg } from '../src/lib/renderCharuco';
import { opencvJson } from '../src/lib/exportConfig';
import { wordmarkSvgGroup, WORDMARK_VB, WORDMARK_ASPECT } from '../src/lib/exportBrand';
import type { PatternSpec } from '../src/lib/patterns';
import { COMPOSITE_FLATNESS, COMPOSITE_TOLERANCE } from '../src/lib/claims';

// ---------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------
const args = Object.fromEntries(process.argv.slice(2).map((a, i, arr) => (a.startsWith('--') ? [a.slice(2), arr[i + 1]] : [])).filter((p) => p.length));
const PN = args.pn ?? 'CT-CHA-P-400X300-D5';
const REV = args.rev ?? 'A';
const FOR = args.for ?? '';          // customer name for the approval drawing, optional
const OUT = resolve(args.out ?? 'out/factory', PN);
mkdirSync(OUT, { recursive: true });

const parsed = parse(PN);
if (!parsed.ok || !parsed.value) throw new Error(`Bad part number ${PN}: ${parsed.errors.join('; ')}`);
const { family, material, size, variant } = parsed.value;
if (family !== 'CHA' || material !== 'P') throw new Error('This script covers composite ChArUco boards (CT-CHA-P-…) for now.');
const [boardW, boardH] = size.split('X').map(Number);
const geom = COMPOSITE_SIZES.find((g) => g.label === `${boardW} × ${boardH}`);
if (!geom) throw new Error(`No catalog geometry for ${boardW} × ${boardH}`);
const DICTS: Record<string, string> = { D4: 'DICT_4X4_50', D5: 'DICT_5X5_100', D6: 'DICT_6X6_250', T36: 'DICT_APRILTAG_36h11' };
const dict = DICTS[variant];
if (!dict) throw new Error(`Unknown variant ${variant}`);

const spec: PatternSpec = {
  type: 'ChArUco', rows: geom.rows, cols: geom.cols, square: geom.square, marker: geom.marker,
  dict, paper: 'custom', startId: 0, scaleBar: false,
};
const patW = spec.cols * spec.square, patH = spec.rows * spec.square;
const ox = (boardW - patW) / 2, oy = (boardH - patH) / 2;
const whiteSquares = Math.floor((spec.rows * spec.cols) / 2);

// ---------------------------------------------------------------------------
// Fonts → outlined paths
// ---------------------------------------------------------------------------
const FONT_DIR = resolve('src/assets/fonts');
const mono: Font = opentype.parse(readFileSync(resolve(FONT_DIR, 'GeistMono-Regular.ttf')).buffer);
const sans: Font = opentype.parse(readFileSync(resolve(FONT_DIR, 'Geist-Regular.ttf')).buffer);
const sansBold: Font = opentype.parse(readFileSync(resolve(FONT_DIR, 'Geist-SemiBold.ttf')).buffer);

type Font = { unitsPerEm: number; getAdvanceWidth(t: string, size: number): number; getPath(t: string, x: number, y: number, size: number): FontPath };
type FontPath = { commands: Array<{ type: string; x: number; y: number; x1: number; y1: number; x2: number; y2: number }> };
function textWidth(text: string, font: Font, sizeMm: number): number {
  return font.getAdvanceWidth(text, sizeMm);
}
function text(textStr: string, font: Font, sizeMm: number, x: number, y: number, fill = '#333333', anchor: 'start' | 'middle' | 'end' = 'start'): string {
  const w = textWidth(textStr, font, sizeMm);
  const sx = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
  const d = pathData(font.getPath(textStr, sx, y, sizeMm));
  return d ? `<path d="${d}" fill="${fill}"/>` : '';
}
/** opentype's toPathData() emits NaN for coordinates that round to 0; serialize the commands ourselves. */
function pathData(p: FontPath): string {
  const n = (v: number) => (Math.abs(v) < 0.0005 ? '0' : v.toFixed(3));
  return p.commands.map((c) => {
    switch (c.type) {
      case 'M': return `M${n(c.x)} ${n(c.y)}`;
      case 'L': return `L${n(c.x)} ${n(c.y)}`;
      case 'Q': return `Q${n(c.x1)} ${n(c.y1)} ${n(c.x)} ${n(c.y)}`;
      case 'C': return `C${n(c.x1)} ${n(c.y1)} ${n(c.x2)} ${n(c.y2)} ${n(c.x)} ${n(c.y)}`;
      default: return 'Z';
    }
  }).join('');
}

// ---------------------------------------------------------------------------
// 1. Board artwork, 1:1 mm
// ---------------------------------------------------------------------------
const CAP = 0.01 * boardH;                 // brand: wordmark cap height = 1 % of board height
const wmH = CAP / (726 / WORDMARK_VB.height); // viewBox height includes the descender
const wmW = wmH * WORDMARK_ASPECT;
const labelSize = 0.86 * CAP;              // Geist Mono at 0.86 × cap height
const gap = labelSize * 1.8;               // ~three spaces
const summary = `ChArUco ${spec.cols} × ${spec.rows} · ${spec.square} mm square · ${spec.marker} mm marker · ${dict}`;
const labelBaseline = oy + patH + (boardH - oy - patH) / 2 + CAP / 2; // centered in the bottom margin
let lx = ox;
const labelParts: string[] = [];
labelParts.push(wordmarkSvgGroup({ x: lx, y: labelBaseline - CAP, heightMm: wmH }));
lx += wmW + gap;
for (const field of [PN, summary, `SN ________ · Rev ${REV}`]) {
  labelParts.push(text(field, mono, labelSize, lx, labelBaseline));
  lx += textWidth(field, mono, labelSize) + gap;
}
if (lx > boardW - ox) console.warn(`[factory] label line is ${(lx - ox).toFixed(1)} mm, wider than the pattern (${patW} mm)`);

const artworkSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${boardW}mm" height="${boardH}mm" viewBox="0 0 ${boardW} ${boardH}">
  <title>${PN} artwork, 1:1 mm</title>
  <rect width="${boardW}" height="${boardH}" fill="#FFFFFF"/>
  <g id="pattern">${renderCharucoSvg(spec, ox, oy)}</g>
  <g id="label">${labelParts.join('')}</g>
</svg>`;
writeFileSync(resolve(OUT, `${PN}-artwork.svg`), artworkSvg);

// ---------------------------------------------------------------------------
// 2. Approval drawing, A3 landscape (420 × 297), board at 1:2
// ---------------------------------------------------------------------------
const A3W = 420, A3H = 297;
const S = 0.5;
const dx = 34, dy = 48;
const bw = boardW * S, bh = boardH * S;
const dim = (x1: number, y1: number, x2: number, y2: number, label: string, offset: number, horizontal: boolean): string => {
  const c = '#B3000E';
  if (horizontal) {
    const y = y1 + offset;
    return `<g stroke="${c}" stroke-width="0.2" fill="none">
      <line x1="${x1}" y1="${y1}" x2="${x1}" y2="${y + Math.sign(offset) * 2}"/><line x1="${x2}" y1="${y1}" x2="${x2}" y2="${y + Math.sign(offset) * 2}"/>
      <line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}"/></g>${text(label, mono, 2.6, (x1 + x2) / 2, y - 0.8 * Math.sign(offset) + (offset > 0 ? 3.2 : 0), c, 'middle')}`;
  }
  const x = x1 + offset;
  return `<g stroke="${c}" stroke-width="0.2" fill="none">
      <line x1="${x1}" y1="${y1}" x2="${x + Math.sign(offset) * 2}" y2="${y1}"/><line x1="${x1}" y1="${y2}" x2="${x + Math.sign(offset) * 2}" y2="${y2}"/>
      <line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}"/></g><g transform="translate(${x + (offset > 0 ? 3.4 : -1.2)},${(y1 + y2) / 2}) rotate(-90)">${text(label, mono, 2.6, 0, 0, c, 'middle')}</g>`;
};

const rows: string[][] = [
  ['Part number', PN],
  ['Pattern', `ChArUco, ${spec.cols} × ${spec.rows} squares (OpenCV squaresX = ${spec.cols}, squaresY = ${spec.rows})`],
  ['Square / marker', `${spec.square} mm / ${spec.marker} mm (ratio ${(spec.marker / spec.square).toFixed(3)})`],
  ['Dictionary', `${dict}, ${whiteSquares} markers, IDs 0–${whiteSquares - 1}, row-major over white squares (OpenCV ≥ 4.6 layout)`],
  ['Pattern area', `${patW} × ${patH} mm, centered; margins ${ox} mm (left/right), ${oy} mm (top/bottom)`],
  ['Board', `${boardW} × ${boardH} × 6 mm aluminum composite (Al / LDPE / Al), matte white face`],
  ['Print', 'UV flatbed, matte black, no scaling; artwork file is 1:1 mm'],
  ['Feature tolerance', COMPOSITE_TOLERANCE],
  ['Flatness', COMPOSITE_FLATNESS],
  ['Acceptance', `10 squares = ${10 * spec.square} mm ±1 mm on both axes; no visible gap under a straightedge along each edge and both diagonals`],
  ['Verification', 'Before dispatch: 10-square accumulated length measured on both axes, straightedge check on all edges and both diagonals; values recorded on the inspection report shipped with the board'],
  ['Files supplied', 'This drawing, opencv.json (CharucoBoard parameters), marker ID table (CSV), datasheet and inspection report'],
  ['Revision', `${REV} · ${new Date().toISOString().slice(0, 10)}${FOR ? ` · prepared for ${FOR}` : ''}`],
];
const tableX = dx + bw + 28, tableY = dy - 4;
let tableSvg = '';
let rowY = tableY;
for (const [k, v] of rows) {
  tableSvg += text(k, sansBold, 2.8, tableX, rowY, '#111111');
  const words = v.split(' '); const lines: string[] = []; let line = ''; const maxW = A3W - dx - (tableX + 34);
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (textWidth(t, sans, 2.6) > maxW && line) { lines.push(line); line = w; } else line = t;
  }
  lines.push(line);
  lines.forEach((l, i) => { tableSvg += text(l, sans, 2.6, tableX + 34, rowY + i * 3.6, '#333333'); });
  rowY += Math.max(10, lines.length * 3.6 + 5);
}

// marker ID map (small, bottom-left)
let idMap = '';
{
  const cell = 6.5, mx0 = dx, my0 = dy + bh + 24;
  idMap += text('Marker IDs by square (row-major over white squares; black squares shown filled)', sans, 2.6, mx0, my0 - 3, '#333333');
  let idx = 0;
  for (let r = 0; r < spec.rows; r++) for (let c = 0; c < spec.cols; c++) {
    const x = mx0 + c * cell, y = my0 + r * cell;
    const black = (r + c) % 2 === 0;
    idMap += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" fill="${black ? '#111111' : '#FFFFFF'}" stroke="#999999" stroke-width="0.15"/>`;
    if (!black) { idMap += text(String(idx), mono, 2.4, x + cell / 2, y + cell / 2 + 0.9, '#333333', 'middle'); idx++; }
  }
}

const drawingSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${A3W}mm" height="${A3H}mm" viewBox="0 0 ${A3W} ${A3H}">
  <title>${PN} approval drawing</title>
  <rect width="${A3W}" height="${A3H}" fill="#FFFFFF"/>
  ${wordmarkSvgGroup({ x: dx, y: 8, heightMm: 6.5 })}
  ${text(`${PN} · drawing for approval · Rev ${REV}`, sansBold, 4, A3W - dx, 13, '#111111', 'end')}
  ${text('Scale 1:2 · all dimensions in mm · geometry follows OpenCV cv.aruco.CharucoBoard; the printed artwork is the same data at 1:1', sans, 2.6, A3W - dx, 18, '#666666', 'end')}
  <g id="signoff" transform="translate(${A3W - dx - 150},${A3H - 60})">
    <rect width="150" height="40" fill="none" stroke="#111111" stroke-width="0.3"/>
    <line x1="0" y1="10" x2="150" y2="10" stroke="#111111" stroke-width="0.3"/>
    <line x1="75" y1="10" x2="75" y2="40" stroke="#111111" stroke-width="0.3"/>
    ${text('Customer approval — please sign and return, or reply "approved" by email', sansBold, 2.6, 3, 6.5, '#111111')}
    ${text('Name / company', sans, 2.4, 3, 15, '#666666')}
    ${text('Date / signature', sans, 2.4, 78, 15, '#666666')}
    ${text('Changes requested (if any):', sans, 2.4, 3, 34, '#666666')}
  </g>
  <g transform="translate(${dx},${dy}) scale(${S})">
    <rect width="${boardW}" height="${boardH}" fill="#FFFFFF" stroke="#111111" stroke-width="0.4"/>
    ${renderCharucoSvg(spec, ox, oy)}
    <g>${labelParts.join('')}</g>
    <rect x="${ox}" y="${oy}" width="${patW}" height="${patH}" fill="none" stroke="#B3000E" stroke-width="0.3" stroke-dasharray="3 2"/>
  </g>
  ${dim(dx, dy, dx + bw, dy, `${boardW}`, -10, true)}
  ${dim(dx + ox * S, dy, dx + (ox + patW) * S, dy, `${patW} (${spec.cols} × ${spec.square})`, -20, true)}
  ${dim(dx, dy, dx, dy + bh, `${boardH}`, -10, false)}
  ${dim(dx, dy + oy * S, dx, dy + (oy + patH) * S, `${patH} (${spec.rows} × ${spec.square})`, -20, false)}
  ${dim(dx + bw, dy, dx + bw, dy + oy * S, `${oy}`, 6, false)}
  ${dim(dx, dy + bh, dx + ox * S, dy + bh, `${ox}`, 6, true)}
  ${text(`Square ${spec.square} mm, marker ${spec.marker} mm centered in each white square · square (0,0) at top-left is black · marker 0 at (row 0, col 1)`, sans, 2.6, dx, dy + bh + 16, '#333333')}
  ${tableSvg}
  ${idMap}
  ${text('calib.tools · hello@calib.tools', mono, 2.4, A3W - dx, A3H - 8, '#999999', 'end')}
</svg>`;
writeFileSync(resolve(OUT, `${PN}-drawing.svg`), drawingSvg);

// ---------------------------------------------------------------------------
// 3. OpenCV JSON + marker ID CSV
// ---------------------------------------------------------------------------
writeFileSync(resolve(OUT, `${PN}.opencv.json`), opencvJson(spec));
{
  const lines = ['row,col,marker_id,x_mm,y_mm'];
  let idx = 0;
  for (let r = 0; r < spec.rows; r++) for (let c = 0; c < spec.cols; c++) {
    if ((r + c) % 2 === 0) continue;
    lines.push(`${r},${c},${idx},${(c * spec.square + spec.square / 2).toFixed(1)},${(r * spec.square + spec.square / 2).toFixed(1)}`);
    idx++;
  }
  writeFileSync(resolve(OUT, `${PN}-marker-ids.csv`), lines.join('\n') + '\n');
}

// ---------------------------------------------------------------------------
// 4. PDFs via Chromium (exact mm pages, vector)
// ---------------------------------------------------------------------------
async function svgToPdf(svg: string, out: string, w: number, h: number) {
  const browser = await chromium.launch(process.env.CT_CHROMIUM_PATH ? { executablePath: process.env.CT_CHROMIUM_PATH } : {});
  const page = await browser.newPage();
  await page.setContent(`<!DOCTYPE html><html><head><style>@page{size:${w}mm ${h}mm;margin:0}html,body{margin:0;padding:0;width:${w}mm;height:${h}mm;overflow:hidden}svg{display:block}</style></head><body>${svg}</body></html>`);
  await page.pdf({ path: out, width: `${w}mm`, height: `${h}mm`, printBackground: true, preferCSSPageSize: true, pageRanges: '1', margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  await browser.close();
}
await svgToPdf(artworkSvg, resolve(OUT, `${PN}-artwork.pdf`), boardW, boardH);
await svgToPdf(drawingSvg, resolve(OUT, `${PN}-drawing.pdf`), A3W, A3H);
console.log(`[factory] wrote ${OUT}: artwork (${boardW}×${boardH} mm), drawing (A3), opencv.json, marker-ids.csv`);
