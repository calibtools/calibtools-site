/**
 * Pattern geometry — v0. Units: millimetres. Origin top-left, x right, y down (OpenCV convention).
 * This file is the seed of packages/core; keep it free of DOM and framework code.
 */
import { svgOpen, svgClose, scaleBarSvg, axesSvg, cornerIdBadgeSvg, brandFooterSvg } from './svgLayers';
import type { SvgContext } from './svgLayers';
import { renderCheckerboardSvg } from './renderCheckerboard';
import { renderCharucoSvg } from './renderCharuco';
import { renderAprilGridSvg } from './renderAprilGrid';
import { renderCirclesSvg } from './renderCircles';
import { renderMarkerSheetSvg } from './renderMarkerSheet';
import { renderPuzzleBoardSvg } from './renderPuzzleBoard';

export interface PatternSpec {
  type: 'Checkerboard' | 'ChArUco' | 'AprilGrid (Kalibr)' | 'Asymmetric circles' | 'Symmetric circles' | 'ArUco grid' | 'HALCON-style dots' | 'Marker sheet' | 'PuzzleBoard';
  rows: number;
  cols: number;
  square: number;   // mm
  marker: number;   // mm, ChArUco/ArUco/AprilGrid only
  dict: string;
  paper: string;
  startId: number;
  scaleBar: boolean;

  // Checkerboard options (Step 1)
  finderMarkers?: boolean;   // OpenCV CALIB_CB_MARKER layout — 3 circles
  radonCheckers?: boolean;   // Radon (rounded) checkers
  invert?: boolean;          // swap black/white

  // ChArUco options (Step 2)
  legacyLayout?: boolean;    // OpenCV ≤ 4.5 legacy ChArUco marker order

  // AprilGrid options (Step 3)
  aprilFamily?: string;      // tag family: '16h5' | '25h9' | '36h11' | '41h12' | '52h13'
  borderBits?: number;       // 1 (AprilTag 3) or 2
  tagSpacing?: number;       // ratio of spacing/tagSize (e.g. 0.3)
  showTagIds?: boolean;      // display ID labels under each tag
  symmetricCorners?: boolean; // symmetric corner squares for sub-pixel refinement
  tagIdList?: string;        // explicit comma/range list e.g. "0-9,15,20-24"

  // Circle options (Step 5)
  circleDiameter?: number;   // mm, default square × 0.56
  circleSpacingX?: number;   // mm, override square for X spacing
  circleSpacingY?: number;   // mm, override square for Y spacing

  // Axes options (Step 7b)
  showAxes?: boolean;        // default true — draw coordinate-frame axes
  monochromeAxes?: boolean;  // solid/dashed instead of coloured (for ceramic/glass)

  // Corner ID badge (Step B5)
  showCornerBadge?: boolean;  // corner ID badge when startId ≠ 0 (default true)

  // PuzzleBoard options (Step C3)
  puzzleOffsetX?: number;     // starting X position within encoding space
  puzzleOffsetY?: number;     // starting Y position within encoding space
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

  if (s.type === 'PuzzleBoard') {
    parts.push(renderPuzzleBoardSvg(s, ox, oy));
  } else if (s.type === 'Marker sheet') {
    parts.push(renderMarkerSheetSvg(s, ox, oy));
  } else if (isCircles) {
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
  parts.push(axesSvg(ctx));
  parts.push(cornerIdBadgeSvg(ctx));
  parts.push(brandFooterSvg(ctx));
  parts.push(svgClose());
  return parts.join('');
}
