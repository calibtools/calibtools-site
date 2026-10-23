/**
 * Pattern geometry — v0. Units: millimetres. Origin top-left, x right, y down (OpenCV convention).
 * This file is the seed of packages/core; keep it free of DOM and framework code.
 */
import {
  BRAND_RED, BRAND_INK, BRAND_URL, patternSummary, logoSvgPaths,
} from './brand';
export interface PatternSpec {
  type: 'Checkerboard' | 'ChArUco' | 'AprilGrid (Kalibr)' | 'Asymmetric circles' | 'Symmetric circles' | 'ArUco grid' | 'HALCON-style dots';
  rows: number;
  cols: number;
  square: number;   // mm
  marker: number;   // mm, ChArUco/ArUco/AprilGrid only
  dict: string;
  paper: string;
  startId: number;
  scaleBar: boolean;
}

/** Inner corner coordinates (mm) for a rows×cols checkerboard, row-major, matching cv.findChessboardCorners order. */
export function innerCorners(rows: number, cols: number, square: number): Array<[number, number]> {
  const pts: Array<[number, number]> = [];
  for (let r = 1; r < rows; r++) for (let c = 1; c < cols; c++) pts.push([c * square, r * square]);
  return pts;
}

/** SVG of the pattern centred on a page of pw×ph mm, 1 user unit = 1 mm. */
export function checkerboardSvg(s: PatternSpec, pw: number, ph: number): string {
  const bw = s.cols * s.square, bh = s.rows * s.square;
  const ox = (pw - bw) / 2, oy = (ph - bh) / 2 - (s.scaleBar ? 6 : 0);
  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${pw}mm" height="${ph}mm" viewBox="0 0 ${pw} ${ph}" role="img" aria-label="${s.type} ${s.rows} by ${s.cols}">`);
  parts.push(`<rect width="${pw}" height="${ph}" fill="#fff"/>`);
  const isMarkerType = s.type === 'ChArUco' || s.type === 'ArUco grid' || s.type === 'AprilGrid (Kalibr)';
  const isCircles = s.type.includes('circles') || s.type.includes('dots');
  for (let r = 0; r < s.rows; r++) {
    for (let c = 0; c < s.cols; c++) {
      const x = ox + c * s.square, y = oy + r * s.square;
      const black = (r + c) % 2 === 0;
      if (isCircles) {
        const asym = s.type === 'Asymmetric circles';
        if (asym && (r + c) % 2 === 1) continue;
        parts.push(`<circle cx="${x + s.square / 2}" cy="${y + s.square / 2}" r="${s.square * 0.28}" fill="#000"/>`);
        continue;
      }
      if (black) {
        parts.push(`<rect x="${x}" y="${y}" width="${s.square}" height="${s.square}" fill="#000"/>`);
      } else if (isMarkerType) {
        // TODO: real marker bitmaps from dictionary data files; placeholder 6x6 pseudo-random bits.
        const m = s.marker, mx = x + (s.square - m) / 2, my = y + (s.square - m) / 2, n = 8, cell = m / n;
        const id = s.startId + Math.floor((r * s.cols + c) / 2);
        parts.push(`<rect x="${mx}" y="${my}" width="${m}" height="${m}" fill="#000"/>`);
        for (let i = 1; i < n - 1; i++) for (let j = 1; j < n - 1; j++) {
          const bit = ((id * 31 + i * 7 + j * 13) % 5) < 2;
          if (!bit) parts.push(`<rect x="${mx + j * cell}" y="${my + i * cell}" width="${cell}" height="${cell}" fill="#fff"/>`);
        }
      }
    }
  }
  if (s.scaleBar) {
    const y = oy + bh + 8;
    parts.push(`<rect x="${ox}" y="${y}" width="100" height="0.6" fill="#000"/>`);
    parts.push(`<text x="${ox}" y="${y + 4}" font-family="monospace" font-size="2.6" fill="#333">100 mm scale check</text>`);
    parts.push(`<text x="${ox + bw}" y="${y + 4}" font-family="monospace" font-size="2.6" fill="#333" text-anchor="end">${s.type.toLowerCase()} ${s.rows}x${s.cols} · ${s.square}/${s.marker} mm · ${s.dict} · Calib.Tools</text>`);
  }

  // Brand footer group
  const patternBottom = oy + bh;
  const scaleBarEnd = s.scaleBar ? patternBottom + 8 + 6 : patternBottom;
  const footerY = Math.max(scaleBarEnd + 4, patternBottom + 2 * s.square);
  if (footerY + 10 < ph) {
    const logoRects = logoSvgPaths({ x: ox, y: footerY, cellSize: 1.8, gap: 0.3 });
    const logoWidth = 3 * 1.8 + 2 * 0.3; // 3 cells + 2 gaps = 6
    const textX = ox + logoWidth + 2;
    const textY = footerY + 4.2;
    const summary = patternSummary({
      type: s.type, rows: s.rows, cols: s.cols, square: s.square,
      marker: s.marker, dict: s.dict, startId: s.startId,
    });
    const iso = new Date().toISOString().slice(0, 10);
    parts.push('<g id="calibtools-brand">');
    parts.push(...logoRects);
    parts.push(`<text x="${textX}" y="${textY}" font-family="'Geist', 'Inter', system-ui, sans-serif" font-size="4" font-weight="600" fill="${BRAND_INK}">calib<tspan fill="${BRAND_RED}">.tools</tspan></text>`);
    parts.push(`<path data-wordmark="outlined" aria-hidden="true" d=""/>`);
    parts.push(`<text x="${pw / 2}" y="${textY}" font-family="'JetBrains Mono', 'Courier New', monospace" font-size="2.4" text-anchor="middle" fill="#4A4A4A">${summary}</text>`);
    parts.push(`<text x="${ox + bw}" y="${textY}" font-family="'JetBrains Mono', 'Courier New', monospace" font-size="2.4" text-anchor="end" fill="#6B6B6B">${BRAND_URL} · ${iso}</text>`);
    parts.push('</g>');
  }

  parts.push('</svg>');
  return parts.join('');
}
