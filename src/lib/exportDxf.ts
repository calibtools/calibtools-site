/**
 * DXF R12 (ASCII) export for calibration patterns.
 * Units: millimetres (INSUNITS=4). Y-up coordinate system (DXF convention).
 * Pattern geometry on layer "0"; brand elements on layer "CALIBTOOLS_BRAND".
 */
import type { PatternSpec } from './patterns';
import { BRAND_URL, LOGO_CELLS, patternSummary, brandLine } from './brand';

export interface DxfExportOptions {
  spec: PatternSpec;
  /** Page width in mm */
  pw: number;
  /** Page height in mm */
  ph: number;
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
    gc(70, 2) +
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
    gc(0, 'ENDTAB') +
    gc(0, 'ENDSEC')
  );
}

function entitiesSection(spec: PatternSpec, pw: number, ph: number): string {
  const parts: string[] = [];
  parts.push(gc(0, 'SECTION'));
  parts.push(gc(2, 'ENTITIES'));

  const bw = spec.cols * spec.square;
  const bh = spec.rows * spec.square;
  const ox = (pw - bw) / 2;
  const oy = (ph - bh) / 2 - (spec.scaleBar ? 6 : 0);

  const isMarkerType = spec.type === 'ChArUco' || spec.type === 'ArUco grid' || spec.type === 'AprilGrid (Kalibr)';
  const isCircles = spec.type.includes('circles') || spec.type.includes('dots');

  // --- Pattern entities ---
  for (let r = 0; r < spec.rows; r++) {
    for (let c = 0; c < spec.cols; c++) {
      const xMm = ox + c * spec.square;
      const yTopMm = oy + r * spec.square;          // y-down top of square
      const yBottomMm = yTopMm + spec.square;       // y-down bottom of square

      if (isCircles) {
        const asym = spec.type === 'Asymmetric circles';
        if (asym && (r + c) % 2 === 1) continue;
        const cxMm = xMm + spec.square / 2;
        const cyMm = yTopMm + spec.square / 2;
        const rad = spec.square * 0.28;
        parts.push(circle('0', cxMm, dxfY(cyMm, ph), rad));
        continue;
      }

      const black = (r + c) % 2 === 0;
      if (black) {
        // Convert: DXF SOLID y1=bottom (y-up), y2=top (y-up)
        const yDxfBottom = dxfY(yBottomMm, ph);
        parts.push(solid('0', xMm, yDxfBottom, spec.square, spec.square));
      } else if (isMarkerType) {
        const m = spec.marker;
        const mx = xMm + (spec.square - m) / 2;
        const myTop = yTopMm + (spec.square - m) / 2;
        const myBottom = myTop + m;
        const yDxfBottom = dxfY(myBottom, ph);
        parts.push(solid('0', mx, yDxfBottom, m, m));
      }
    }
  }

  // --- Brand footer ---
  // patternBottomDxf: the DXF Y of the bottom edge of the pattern grid (y-up)
  const patternBottomDxf = dxfY(oy + bh, ph);
  const footerY = patternBottomDxf - 2 * spec.square;

  const cellSize = 1.8;
  const gap = 0.3;
  const step = cellSize + gap;
  const textBaseY = footerY + cellSize; // approximate vertical centre of logo

  // Logo: 3x3 grid of SOLID entities
  for (const cell of LOGO_CELLS) {
    const cx = ox + cell.col * step;
    // Logo rows: row 0 is top in screen coords → row 0 should be at top in DXF (highest Y)
    // Flip rows: cy_dxf = footerY + (2 - cell.row) * step
    const cyDxfBottom = footerY + (2 - cell.row) * step;
    parts.push(solid('CALIBTOOLS_BRAND', cx, cyDxfBottom, cellSize, cellSize));
  }

  const logoWidth = 3 * cellSize + 2 * gap; // = 6.0 mm
  const textX = ox + logoWidth + 2;

  // Wordmark: "calib.tools"
  parts.push(text('CALIBTOOLS_BRAND', textX, textBaseY, 3, 'calib.tools'));

  // Pattern summary (centred at pattern midpoint)
  const summary = patternSummary({
    type: spec.type, rows: spec.rows, cols: spec.cols, square: spec.square,
    marker: spec.marker, dict: spec.dict, startId: spec.startId,
  });
  const centrePt = ox + bw / 2;
  parts.push(textCentre('CALIBTOOLS_BRAND', centrePt, textBaseY, 2.4, summary));

  // URL + date (right-aligned)
  const iso = new Date().toISOString().slice(0, 10);
  const rightText = `${BRAND_URL} · ${iso}`;
  const rightX = ox + bw;
  parts.push(textRight('CALIBTOOLS_BRAND', rightX, textBaseY, 2.4, rightText));

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
export function exportDxf({ spec, pw, ph }: DxfExportOptions): string {
  const summary = patternSummary({
    type: spec.type, rows: spec.rows, cols: spec.cols, square: spec.square,
    marker: spec.marker, dict: spec.dict, startId: spec.startId,
  });
  const comment = brandLine({ summary });

  const parts: string[] = [];
  parts.push(gc(999, comment));
  parts.push(headerSection());
  parts.push(tablesSection());
  parts.push(entitiesSection(spec, pw, ph));
  parts.push(gc(0, 'EOF'));

  return parts.join('');
}
