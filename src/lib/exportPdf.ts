/**
 * PDF export — browser-side, 1:1 mm output using pdf-lib.
 * All coordinates come from src/lib/patterns.ts geometry; this file only handles rendering.
 * 1 PDF point = 1/72 inch. 1 mm = 72/25.4 pt ≈ 2.8346 pt.
 */
import { PDFDocument, rgb } from 'pdf-lib';
import type { PatternSpec } from './patterns';

/** Conversion factor: millimetres → PDF points. */
export const MM = 72 / 25.4;

export interface PdfExportOptions {
  spec: PatternSpec;
  /** Page width in mm */
  pw: number;
  /** Page height in mm */
  ph: number;
}

/**
 * Generate a 1:1 millimetre-accurate PDF of the calibration pattern.
 * Returns raw PDF bytes (Uint8Array).
 */
export async function exportPdf({ spec, pw, ph }: PdfExportOptions): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([pw * MM, ph * MM]);
  const pageH = ph * MM;

  /** Convert mm x/y to PDF points (flip y). */
  const pt = (xMm: number, yMm: number): [number, number] => [xMm * MM, pageH - yMm * MM];

  const bw = spec.cols * spec.square;
  const bh = spec.rows * spec.square;
  const ox = (pw - bw) / 2;
  const oy = (ph - bh) / 2 - (spec.scaleBar ? 6 : 0);

  const isMarkerType = spec.type === 'ChArUco' || spec.type === 'ArUco grid' || spec.type === 'AprilGrid (Kalibr)';
  const isCircles = spec.type.includes('circles') || spec.type.includes('dots');

  // Draw pattern squares / circles
  for (let r = 0; r < spec.rows; r++) {
    for (let c = 0; c < spec.cols; c++) {
      const x = ox + c * spec.square;
      const y = oy + r * spec.square;
      const black = (r + c) % 2 === 0;

      if (isCircles) {
        const asym = spec.type === 'Asymmetric circles';
        if (asym && (r + c) % 2 === 1) continue;
        const cx = x + spec.square / 2;
        const cy = y + spec.square / 2;
        const radius = spec.square * 0.28;
        // Approximate circle with 4 Bézier curves
        drawCircle(page, pt, cx, cy, radius);
        continue;
      }

      if (black) {
        const [px, py] = pt(x, y + spec.square);
        page.drawRectangle({ x: px, y: py, width: spec.square * MM, height: spec.square * MM, color: rgb(0, 0, 0) });
      } else if (isMarkerType) {
        // Marker placeholder — same pseudo-random pattern as SVG
        const m = spec.marker;
        const mx = x + (spec.square - m) / 2;
        const my = y + (spec.square - m) / 2;
        const n = 8;
        const cell = m / n;
        const id = spec.startId + Math.floor((r * spec.cols + c) / 2);

        // Black marker background
        const [pmx, pmy] = pt(mx, my + m);
        page.drawRectangle({ x: pmx, y: pmy, width: m * MM, height: m * MM, color: rgb(0, 0, 0) });

        // White bits
        for (let i = 1; i < n - 1; i++) {
          for (let j = 1; j < n - 1; j++) {
            const bit = ((id * 31 + i * 7 + j * 13) % 5) < 2;
            if (!bit) {
              const [bx, by] = pt(mx + j * cell, my + i * cell + cell);
              page.drawRectangle({ x: bx, y: by, width: cell * MM, height: cell * MM, color: rgb(1, 1, 1) });
            }
          }
        }
      }
    }
  }

  // Scale bar
  if (spec.scaleBar) {
    const sbY = oy + bh + 8;
    const [sx, sy] = pt(ox, sbY);
    // 100 mm horizontal line, 0.6 mm thick
    page.drawRectangle({ x: sx, y: sy - 0.6 * MM, width: 100 * MM, height: 0.6 * MM, color: rgb(0, 0, 0) });

    // Label text (left)
    const helvetica = await doc.embedFont('Helvetica' as any);
    const fontSize = 2.6 * MM;
    const [tx, ty] = pt(ox, sbY + 4);
    page.drawText('100 mm scale check', { x: tx, y: ty, size: fontSize, font: helvetica, color: rgb(0.2, 0.2, 0.2) });

    // Label text (right)
    const rightText = `${spec.type.toLowerCase()} ${spec.rows}x${spec.cols} · ${spec.square}/${spec.marker} mm · ${spec.dict} · calib.tools`;
    const rightW = helvetica.widthOfTextAtSize(rightText, fontSize);
    const [rx, ry] = pt(ox + bw, sbY + 4);
    page.drawText(rightText, { x: rx - rightW, y: ry, size: fontSize, font: helvetica, color: rgb(0.2, 0.2, 0.2) });
  }

  return doc.save();
}

/** Draw a filled black circle using 4 Bézier quarter-arcs. */
function drawCircle(
  page: ReturnType<PDFDocument['addPage']>,
  pt: (x: number, y: number) => [number, number],
  cx: number,
  cy: number,
  r: number,
) {
  // Bézier approximation constant for quarter-circle
  const k = r * 0.5522847498;
  // We use moveTo + 4 cubicCurveTo + fill
  // Points in mm, convert to pt
  const [pcx, pcy] = pt(cx, cy);
  const rPt = r * MM;
  const kPt = k * MM;

  page.drawSvgPath(
    [
      `M ${0} ${-rPt}`,
      `C ${kPt} ${-rPt} ${rPt} ${-kPt} ${rPt} ${0}`,
      `C ${rPt} ${kPt} ${kPt} ${rPt} ${0} ${rPt}`,
      `C ${-kPt} ${rPt} ${-rPt} ${kPt} ${-rPt} ${0}`,
      `C ${-rPt} ${-kPt} ${-kPt} ${-rPt} ${0} ${-rPt}`,
      'Z',
    ].join(' '),
    { x: pcx, y: pcy, color: rgb(0, 0, 0) },
  );
}
