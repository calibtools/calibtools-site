/**
 * Pattern geometry — v0. Units: millimetres. Origin top-left, x right, y down (OpenCV convention).
 * This file is the seed of packages/core; keep it free of DOM and framework code.
 */
import { svgOpen, svgClose, scaleBarSvg, brandFooterSvg } from './svgLayers';
import type { SvgContext } from './svgLayers';
import { renderCheckerboardSvg } from './renderCheckerboard';
import { renderCharucoSvg } from './renderCharuco';
import { renderAprilGridSvg } from './renderAprilGrid';
import { renderCirclesSvg } from './renderCircles';

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
  const ctx: SvgContext = { spec: s, pw, ph, ox, oy, bw, bh };

  const parts: string[] = [];
  parts.push(svgOpen(ctx));

  // Dispatch to per-type renderer
  const isCircles = s.type.includes('circles') || s.type.includes('dots');
  const isMarkerType = s.type === 'ChArUco' || s.type === 'ArUco grid' || s.type === 'AprilGrid (Kalibr)';

  if (isCircles) {
    parts.push(renderCirclesSvg(s, ox, oy));
  } else if (isMarkerType) {
    if (s.type === 'AprilGrid (Kalibr)') {
      parts.push(renderAprilGridSvg(s, ox, oy));
    } else {
      parts.push(renderCharucoSvg(s, ox, oy));
    }
  } else {
    parts.push(renderCheckerboardSvg(s, ox, oy));
  }

  parts.push(scaleBarSvg(ctx));
  parts.push(brandFooterSvg(ctx));
  parts.push(svgClose());
  return parts.join('');
}
