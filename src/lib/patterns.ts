/**
 * Pattern geometry — v0. Units: millimeters. Origin top-left, x right, y down (OpenCV convention).
 * This file is the seed of packages/core; keep it free of DOM and framework code.
 */
import { svgOpen, svgClose, scaleBarSvg, axesSvg, cornerIdBadgeSvg, brandFooterSvg } from './svgLayers';
import type { SvgContext } from './svgLayers';
import { renderCheckerboardSvg } from './renderCheckerboard';
import { renderCharucoSvg, renderArucoGridSvg } from './renderCharuco';
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
  aprilFamily?: string;      // tag family: '16h5' | '25h9' | '36h11'
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
  monochromeAxes?: boolean;  // solid/dashed instead of colored (for ceramic/glass)

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

import { patternExtent, type PageLayout } from './pageLayout';

/**
 * The pattern alone (no page, scale bar, axes or brand block), top-left at (ox, oy) mm.
 * Every output format draws from this: SVG uses it as is, PDF and DXF read its shapes
 * through patternShapes(), so the three can never disagree.
 */
export function renderPatternSvg(s: PatternSpec, ox: number, oy: number): string {
  if (s.type === 'PuzzleBoard') return renderPuzzleBoardSvg(s, ox, oy);
  if (s.type === 'Marker sheet') return renderMarkerSheetSvg(s, ox, oy);
  if (s.type.includes('circles') || s.type.includes('dots')) return renderCirclesSvg(s, ox, oy);
  if (s.type === 'AprilGrid (Kalibr)') return renderAprilGridSvg(s, ox, oy);
  if (s.type === 'ChArUco') return renderCharucoSvg(s, ox, oy);
  if (s.type === 'ArUco grid') return renderArucoGridSvg(s, ox, oy);
  return renderCheckerboardSvg(s, ox, oy);
}

/**
 * SVG of the pattern centered on a page of pw×ph mm, 1 user unit = 1 mm.
 * If a PageLayout is provided, its geometry (orientation, ox/oy, brand, axes) is used.
 */
export function checkerboardSvg(s: PatternSpec, pw: number, ph: number, layout?: PageLayout): string {
  const bw = layout?.bw ?? patternExtent(s).bw;
  const bh = layout?.bh ?? patternExtent(s).bh;
  const ox = layout?.ox ?? (pw - bw) / 2;
  const oy = layout?.oy ?? ((ph - bh) / 2 - (s.scaleBar ? 6 : 0));
  const usePw = layout?.pw ?? pw;
  const usePh = layout?.ph ?? ph;
  const ctx: SvgContext = {
    spec: s, pw: usePw, ph: usePh, ox, oy, bw, bh,
    brand: layout?.brand,
    axes: layout?.axes,
  };

  const parts: string[] = [];
  parts.push(svgOpen(ctx));

  parts.push(renderPatternSvg(s, ox, oy));

  parts.push(scaleBarSvg(ctx));
  parts.push(axesSvg(ctx));
  parts.push(cornerIdBadgeSvg(ctx));
  parts.push(brandFooterSvg(ctx));
  parts.push(svgClose());
  return parts.join('');
}
