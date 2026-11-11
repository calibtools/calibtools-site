/**
 * DXF R12 (ASCII) export for calibration patterns.
 * Units: millimeters (INSUNITS=4). Y-up coordinate system (DXF convention).
 * Pattern geometry on layer "0"; brand elements on layer "CALIBTOOLS_BRAND".
 */
import type { PatternSpec } from './patterns';
import { idRange } from './idRange';
import {
  patternSummary,
  provenanceLine,
  PRINT_NOTE,
  SITE_URL,
  brandLine,
} from './exportBrand';
import {
  WORDMARK_POLYLINES,
  WORDMARK_FRAME_RECTS as WM_FRAME_RECTS,
  WORDMARK_DOT_RECT as WM_DOT_RECT,
  WORDMARK_VIEWBOX as WM_VB,
} from './wordmarkDxf';
import { patternExtent, type PageLayout } from './pageLayout';
import { patternShapes } from './patternShapes';
import { isKalibrFrame, axesOffset } from './renderAprilGrid';

export interface DxfExportOptions {
  spec: PatternSpec;
  /** Page width in mm */
  pw: number;
  /** Page height in mm */
  ph: number;
  /** Layout-computed geometry. When provided, overrides pw/ph and inline ox/oy. */
  layout?: PageLayout;
}

// ---------------------------------------------------------------------------
// Low-level DXF helpers
// ---------------------------------------------------------------------------

/** Emit a single group-code/value pair. */
function gc(code: number, value: string | number): string {
  return `${code}\n${value}\n`;
}

/** Format a floating-point number for DXF (up to 6 decimal places, no trailing zeros). */
function f(n: number): string {
  // DXF R12 uses decimal notation; avoid exponential form for small numbers.
  const s = n.toFixed(6);
  // Strip trailing zeros after decimal point, but keep at least one decimal digit.
  return s.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '.0');
}

/** Convert pattern Y (top-left origin, y-down, mm) to DXF Y (y-up, mm). */
function dxfY(yDown: number, ph: number): number {
  return ph - yDown;
}

// ---------------------------------------------------------------------------
// Entity builders
// ---------------------------------------------------------------------------

/**
 * SOLID entity (filled quadrilateral — all four corners the same square for us).
 * DXF SOLID corner order: p1=bottom-left, p2=bottom-right, p3=top-left, p4=top-right.
 */
function solid(layer: string, x: number, yBottom: number, w: number, h: number): string {
  const x1 = x, x2 = x + w;
  const y1 = yBottom, y2 = yBottom + h;
  return (
    gc(0, 'SOLID') +
    gc(8, layer) +
    gc(10, f(x1)) + gc(20, f(y1)) +   // bottom-left
    gc(11, f(x2)) + gc(21, f(y1)) +   // bottom-right
    gc(12, f(x1)) + gc(22, f(y2)) +   // top-left
    gc(13, f(x2)) + gc(23, f(y2))     // top-right
  );
}

/** CIRCLE entity on layer "0". */
function circle(layer: string, cx: number, cy: number, r: number): string {
  return (
    gc(0, 'CIRCLE') +
    gc(8, layer) +
    gc(10, f(cx)) + gc(20, f(cy)) +
    gc(40, f(r))
  );
}

/** TEXT entity (left-aligned by default). */
function text(layer: string, x: number, y: number, height: number, str: string): string {
  return (
    gc(0, 'TEXT') +
    gc(8, layer) +
    gc(10, f(x)) + gc(20, f(y)) +
    gc(40, f(height)) +
    gc(1, str)
  );
}

/** TEXT entity right-aligned (group 72=2, with alignment point group 11/21). */
function textRight(layer: string, x: number, y: number, height: number, str: string): string {
  return (
    gc(0, 'TEXT') +
    gc(8, layer) +
    gc(10, f(x)) + gc(20, f(y)) +
    gc(40, f(height)) +
    gc(72, 2) +
    gc(11, f(x)) + gc(21, f(y)) +
    gc(1, str)
  );
}

/** POLYLINE entity (2D) with VERTEX entries. */
function polyline(layer: string, verts: readonly [number, number][], closed = true): string {
  let out = gc(0, 'POLYLINE') + gc(8, layer) + gc(66, 1) + gc(70, closed ? 1 : 0);
  for (const [vx, vy] of verts) {
    out += gc(0, 'VERTEX') + gc(8, layer) + gc(10, f(vx)) + gc(20, f(vy));
  }
  out += gc(0, 'SEQEND') + gc(8, layer);
  return out;
}

/** TEXT entity centre-aligned (group 72=1, with alignment point group 11/21). */
function textCentre(layer: string, x: number, y: number, height: number, str: string): string {
  return (
    gc(0, 'TEXT') +
    gc(8, layer) +
    gc(10, f(x)) + gc(20, f(y)) +
    gc(40, f(height)) +
    gc(72, 1) +
    gc(11, f(x)) + gc(21, f(y)) +
    gc(1, str)
  );
}

// ---------------------------------------------------------------------------
// Section builders
// ---------------------------------------------------------------------------

function headerSection(): string {
  return (
    gc(0, 'SECTION') +
    gc(2, 'HEADER') +
    gc(9, '$ACADVER') + gc(1, 'AC1009') +
    gc(9, '$INSUNITS') + gc(70, 4) +
    gc(0, 'ENDSEC')
  );
}

function tablesSection(): string {
  return (
    gc(0, 'SECTION') +
    gc(2, 'TABLES') +
    gc(0, 'TABLE') +
    gc(2, 'LAYER') +
    gc(70, 5) +
    // Layer "0"
    gc(0, 'LAYER') +
    gc(2, '0') +
    gc(70, 0) +
    gc(62, 7) +   // color white/default
    gc(6, 'CONTINUOUS') +
    // Layer "CALIBTOOLS_BRAND"
    gc(0, 'LAYER') +
    gc(2, 'CALIBTOOLS_BRAND') +
    gc(70, 0) +
    gc(62, 1) +   // color red
    gc(6, 'CONTINUOUS') +
    // Layer "AXES"
    gc(0, 'LAYER') +
    gc(2, 'AXES') +
    gc(70, 0) +
    gc(62, 1) +   // color red
    gc(6, 'CONTINUOUS') +
    // Layer "PATTERN_WHITE": white shapes on top of black ink
    gc(0, 'LAYER') +
    gc(2, 'PATTERN_WHITE') +
    gc(70, 0) +
    gc(62, 9) +   // light gray, so it shows on both light and dark CAD backgrounds
    gc(6, 'CONTINUOUS') +
    // Layer "PATTERN_LABELS": printed marker and tag IDs
    gc(0, 'LAYER') +
    gc(2, 'PATTERN_LABELS') +
    gc(70, 0) +
    gc(62, 8) +   // gray
    gc(6, 'CONTINUOUS') +
    gc(0, 'ENDTAB') +
    gc(0, 'ENDSEC')
  );
}

function entitiesSection(spec: PatternSpec, pw: number, ph: number, layout?: PageLayout): string {
  const parts: string[] = [];
  parts.push(gc(0, 'SECTION'));
  parts.push(gc(2, 'ENTITIES'));

  const bw = layout?.bw ?? patternExtent(spec).bw;
  const bh = layout?.bh ?? patternExtent(spec).bh;
  const ox = layout?.ox ?? (pw - bw) / 2;
  const oy = layout?.oy ?? ((ph - bh) / 2 - (spec.scaleBar ? 6 : 0));

  // --- Pattern entities: the shapes the SVG renderer draws, y flipped for DXF ---
  // Black ink on layer "0". White shapes (marker bits, circles on an inverted board) sit on
  // PATTERN_WHITE and are knocked out of the black beneath them. ID labels on PATTERN_LABELS.
  for (const sh of patternShapes(spec, ox, oy)) {
    const white = sh.fill.toLowerCase() === '#fff' || sh.fill.toLowerCase() === '#ffffff';
    if (sh.kind === 'rect') parts.push(solid(white ? 'PATTERN_WHITE' : '0', sh.x, dxfY(sh.y + sh.h, ph), sh.w, sh.h));
    else if (sh.kind === 'circle') parts.push(circle(white ? 'PATTERN_WHITE' : '0', sh.cx, dxfY(sh.cy, ph), sh.r));
    else if (sh.anchor === 'middle') parts.push(textCentre('PATTERN_LABELS', sh.x, dxfY(sh.y, ph), sh.size, sh.text));
    else parts.push(text('PATTERN_LABELS', sh.x, dxfY(sh.y, ph), sh.size, sh.text));
  }

  // --- Brand footer: bracket-framed wordmark as polylines ---
  const patternBottomDxf = dxfY(oy + bh, ph);
  const footerTopMm = oy + bh + 2 * spec.square; // y-down mm
  const footerTopDxf = dxfY(footerTopMm, ph);
  const wmHMm = 5; // wordmark height in mm
  const wmScale = wmHMm / WM_VB.height;

  // Transform SVG (y-down) to DXF (y-up):
  // dxfX = ox + (svgX - WM_VB.minX) * wmScale
  // dxfY = footerTopDxf - (svgY - WM_VB.minY) * wmScale (flip y, top of wordmark at footerTopDxf)
  const wmOffX = ox - WM_VB.minX * wmScale;
  const wmOffY = footerTopDxf + WM_VB.minY * wmScale;

  // Letter outlines as POLYLINE
  for (const pl of WORDMARK_POLYLINES) {
    const verts: [number, number][] = pl.map(([sx, sy]) => [
      wmOffX + sx * wmScale,
      wmOffY - sy * wmScale,
    ]);
    parts.push(polyline('CALIBTOOLS_BRAND', verts));
  }

  // Frame bracket rects as SOLID
  for (const [rx, ry, rw, rh] of WM_FRAME_RECTS) {
    const x1 = wmOffX + rx * wmScale;
    const y1 = wmOffY - (ry + rh) * wmScale;
    parts.push(solid('CALIBTOOLS_BRAND', x1, y1, rw * wmScale, rh * wmScale));
  }

  // Red dot as SOLID
  {
    const [dx, dy, dw, dh] = WM_DOT_RECT;
    const x1 = wmOffX + dx * wmScale;
    const y1 = wmOffY - (dy + dh) * wmScale;
    parts.push(solid('CALIBTOOLS_BRAND', x1, y1, dw * wmScale, dh * wmScale));
  }

  // Text lines below wordmark
  const textBaseY = footerTopDxf - wmHMm - 2;
  const summary = patternSummary({
    type: spec.type, rows: spec.rows, cols: spec.cols, square: spec.square,
    marker: spec.marker, dict: spec.dict, startId: spec.startId,
  });
  const centrePt = ox + bw / 2;
  parts.push(textCentre('CALIBTOOLS_BRAND', centrePt, textBaseY, 2.2, summary));

  const provenance = provenanceLine('generator');
  parts.push(textCentre('CALIBTOOLS_BRAND', centrePt, textBaseY - 3.2, 1.8, provenance));

  parts.push(textCentre('CALIBTOOLS_BRAND', centrePt, textBaseY - 6, 1.6, PRINT_NOTE));

  // --- Corner ID badge ---
  if (spec.startId !== 0 && spec.showCornerBadge !== false) {
    const range = idRange(spec);
    if (range) {
      const badgeX = ox - 1.5 * spec.square;
      const badgeYDxf = dxfY(oy - 1.5 * spec.square + 10, ph);
      parts.push(text('CALIBTOOLS_BRAND', badgeX, badgeYDxf, 10, `#${spec.startId}`));
    }
  }

  // --- Axes ---
  if (spec.showAxes !== false) {
    const ax = layout?.axes;
    const isKalibr = ax ? ax.isKalibr : isKalibrFrame(spec);
    const shorter = Math.min(bw, bh);
    const arrowLen = ax?.arrowLen ?? Math.max(15, Math.min(40, shorter * 0.15));
    const headLen = ax?.headLen ?? Math.min(3, arrowLen * 0.2);

    // Origin in pattern coords (y-down)
    const axOriginX = ax?.originX ?? ox - axesOffset(spec).x;
    const axOriginYDown = ax?.originY ?? (isKalibr ? oy + bh + axesOffset(spec).y : oy - axesOffset(spec).y);

    // Convert to DXF y-up
    const axOriginYDxf = dxfY(axOriginYDown, ph);

    // X arrow: pointing right (same in both coord systems)
    const xEndX = axOriginX + arrowLen;
    parts.push(
      gc(0, 'LINE') + gc(8, 'AXES') +
      gc(10, f(axOriginX)) + gc(20, f(axOriginYDxf)) +
      gc(11, f(xEndX - headLen)) + gc(21, f(axOriginYDxf))
    );
    parts.push(text('AXES', xEndX + 1, axOriginYDxf, 2.5, 'X'));

    // Y arrow: in DXF y-up, OpenCV Y-down becomes DXF negative-Y, Kalibr Y-up becomes DXF positive-Y
    const yDirDxf = isKalibr ? 1 : -1;
    const yEndDxf = axOriginYDxf + yDirDxf * arrowLen;
    parts.push(
      gc(0, 'LINE') + gc(8, 'AXES') +
      gc(10, f(axOriginX)) + gc(20, f(axOriginYDxf)) +
      gc(11, f(axOriginX)) + gc(21, f(yEndDxf - yDirDxf * headLen))
    );
    parts.push(text('AXES', axOriginX + 1.5, yEndDxf + yDirDxf * 2.5, 2.5, 'Y'));

    // Origin dot as tiny circle
    parts.push(circle('AXES', axOriginX, axOriginYDxf, 0.8));

    // Caption
    const captionText = isKalibr ? 'Kalibr frame - origin bottom-left' : 'OpenCV frame - origin top-left';
    parts.push(text('AXES', axOriginX + 3, axOriginYDxf + (isKalibr ? -3 : 2), 1.8, captionText));
  }

  parts.push(gc(0, 'ENDSEC'));
  return parts.join('');
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Generate an ASCII DXF R12 string for the given pattern.
 *
 * - Pattern entities on layer "0"
 * - Brand elements (logo + text) on layer "CALIBTOOLS_BRAND"
 */
export function exportDxf({ spec, pw: rawPw, ph: rawPh, layout }: DxfExportOptions): string {
  const pw = layout?.pw ?? rawPw;
  const ph = layout?.ph ?? rawPh;
  const summary = patternSummary({
    type: spec.type, rows: spec.rows, cols: spec.cols, square: spec.square,
    marker: spec.marker, dict: spec.dict, startId: spec.startId,
  });
  const comment = brandLine({ summary });

  const parts: string[] = [];
  parts.push(gc(999, comment));
  parts.push(headerSection());
  parts.push(tablesSection());
  parts.push(entitiesSection(spec, pw, ph, layout));
  parts.push(gc(0, 'EOF'));

  return parts.join('');
}
