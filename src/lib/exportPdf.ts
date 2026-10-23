/**
 * PDF export — browser-side, 1:1 mm output using pdf-lib.
 * All coordinates come from src/lib/patterns.ts geometry; this file only handles rendering.
 * 1 PDF point = 1/72 inch. 1 mm = 72/25.4 pt ≈ 2.8346 pt.
 */
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { PatternSpec } from './patterns';
import {
  BRAND_RED_RGB,
  BRAND_INK_RGB,
  BRAND_NAME,
  BRAND_URL,
  LOGO_CELLS,
  patternSummary,
} from './brand';

/** Conversion factor: millimetres → PDF points. */
export const MM = 72 / 25.4;

export interface PdfExportOptions {
  spec: PatternSpec;
  /** Page width in mm */
  pw: number;
  /** Page height in mm */
  ph: number;
  /** Pre-loaded font bytes for Node/test environments. Browser loads via fetch if omitted. */
  fontBytes?: {
    regular: ArrayBuffer;
    semiBold: ArrayBuffer;
    mono: ArrayBuffer;
  };
}

/** Load font bytes — uses provided bytes or fetches from assets in browser. */
async function loadFontBytes(
  fontBytes: PdfExportOptions['fontBytes'],
): Promise<{ regular: ArrayBuffer; semiBold: ArrayBuffer; mono: ArrayBuffer }> {
  if (fontBytes) return fontBytes;

  const [regular, semiBold, mono] = await Promise.all([
    fetch(new URL('../assets/fonts/Geist-Regular.ttf', import.meta.url)).then(r => r.arrayBuffer()),
    fetch(new URL('../assets/fonts/Geist-SemiBold.ttf', import.meta.url)).then(r => r.arrayBuffer()),
    fetch(new URL('../assets/fonts/GeistMono-Regular.ttf', import.meta.url)).then(r => r.arrayBuffer()),
  ]);
  return { regular, semiBold, mono };
}

/**
 * Generate a 1:1 millimetre-accurate PDF of the calibration pattern.
 * Returns raw PDF bytes (Uint8Array).
 */
export async function exportPdf({ spec, pw, ph, fontBytes }: PdfExportOptions): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
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

  // --- Embed fonts ---
  const fonts = await loadFontBytes(fontBytes);
  const fontRegular = await doc.embedFont(fonts.regular, { subset: true });
  const fontSemiBold = await doc.embedFont(fonts.semiBold, { subset: true });
  const fontMono = await doc.embedFont(fonts.mono, { subset: true });

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
  let scaleBarBottom = 0;
  if (spec.scaleBar) {
    const sbY = oy + bh + 8;
    const [sx, sy] = pt(ox, sbY);
    // 100 mm horizontal line, 0.6 mm thick
    page.drawRectangle({ x: sx, y: sy - 0.6 * MM, width: 100 * MM, height: 0.6 * MM, color: rgb(0, 0, 0) });

    // Label text (left) — use Geist Mono
    const fontSize = 2.6 * MM;
    const [tx, ty] = pt(ox, sbY + 4);
    page.drawText('100 mm scale check', { x: tx, y: ty, size: fontSize, font: fontMono, color: rgb(0.2, 0.2, 0.2) });

    // Label text (right) — use patternSummary + brand
    const summary = patternSummary(spec);
    const rightText = `${summary} \u00B7 ${BRAND_NAME}`;
    const rightW = fontMono.widthOfTextAtSize(rightText, fontSize);
    const [rx, ry] = pt(ox + bw, sbY + 4);
    page.drawText(rightText, { x: rx - rightW, y: ry, size: fontSize, font: fontMono, color: rgb(0.2, 0.2, 0.2) });

    scaleBarBottom = sbY + 4 + 2.6; // sbY + label offset + approx text height
  }

  // --- Brand footer (3-tier fallback — never silently omitted) ---
  const patternBottom = oy + bh;
  const fullFooterY = Math.max(scaleBarBottom + 4, patternBottom + 2 * spec.square);

  if (fullFooterY + 10 < ph) {
    // Tier 1: Full footer
    const cellSize = 1.8;
    const gap = 0.3;
    const step = cellSize + gap;

    for (const cell of LOGO_CELLS) {
      const cx = ox + cell.col * step;
      const cy = fullFooterY + cell.row * step;
      const fillRgb = cell.fill === '#E60012' ? BRAND_RED_RGB : BRAND_INK_RGB;
      const [rx, ry] = pt(cx, cy + cellSize);
      page.drawRectangle({
        x: rx, y: ry,
        width: cellSize * MM, height: cellSize * MM,
        color: rgb(fillRgb.r, fillRgb.g, fillRgb.b),
      });
    }

    const wordmarkX = ox + 6 + 2;
    const wordmarkFontSize = 4 * MM;
    const wordmarkY = fullFooterY + 3;
    const [wmx, wmy] = pt(wordmarkX, wordmarkY + 4);

    const calibWidth = fontSemiBold.widthOfTextAtSize('calib', wordmarkFontSize);
    page.drawText('calib', {
      x: wmx, y: wmy, size: wordmarkFontSize, font: fontSemiBold,
      color: rgb(BRAND_INK_RGB.r, BRAND_INK_RGB.g, BRAND_INK_RGB.b),
    });
    page.drawText('.tools', {
      x: wmx + calibWidth, y: wmy, size: wordmarkFontSize, font: fontSemiBold,
      color: rgb(BRAND_RED_RGB.r, BRAND_RED_RGB.g, BRAND_RED_RGB.b),
    });

    const summary = patternSummary(spec);
    const centreText = `${summary} \u00B7 ${bw} \u00D7 ${bh} mm`;
    const centreFontSize = 2.4 * MM;
    const centreW = fontMono.widthOfTextAtSize(centreText, centreFontSize);
    const centreXPt = (ox + bw / 2) * MM - centreW / 2;
    const centreYPt = pageH - (fullFooterY + 3 + 2.4) * MM;
    page.drawText(centreText, {
      x: centreXPt, y: centreYPt, size: centreFontSize, font: fontMono,
      color: rgb(0.4, 0.4, 0.4),
    });

    const dateStr = new Date().toISOString().slice(0, 10);
    const rightText = `${BRAND_URL} \u00B7 ${dateStr}`;
    const rightFontSize = 2.4 * MM;
    const rightW = fontRegular.widthOfTextAtSize(rightText, rightFontSize);
    const rightXPt = (ox + bw) * MM - rightW;
    const rightYPt = pageH - (fullFooterY + 3 + 2.4) * MM;
    page.drawText(rightText, {
      x: rightXPt, y: rightYPt, size: rightFontSize, font: fontRegular,
      color: rgb(0.4, 0.4, 0.4),
    });
  } else {
    // Tier 2: Compact one-line footer
    const compactY = Math.max(scaleBarBottom + 2, patternBottom + 4);
    if (compactY + 6 < ph) {
      const cellSize = 1.2;
      const gap = 0.2;
      const step = cellSize + gap;

      for (const cell of LOGO_CELLS) {
        const cx = ox + cell.col * step;
        const cy = compactY + cell.row * step;
        const fillRgb = cell.fill === '#E60012' ? BRAND_RED_RGB : BRAND_INK_RGB;
        const [rx, ry] = pt(cx, cy + cellSize);
        page.drawRectangle({
          x: rx, y: ry,
          width: cellSize * MM, height: cellSize * MM,
          color: rgb(fillRgb.r, fillRgb.g, fillRgb.b),
        });
      }

      const logoWidth = 3 * cellSize + 2 * gap;
      const textX = ox + logoWidth + 1.5;
      const textY = compactY + 2.8;
      const summary = patternSummary(spec);
      const compactText = `${summary} \u00B7 calib.tools`;
      const compactFontSize = 2 * MM;
      const [tx, ty] = pt(textX, textY);
      page.drawText(compactText, {
        x: tx, y: ty, size: compactFontSize, font: fontMono,
        color: rgb(0.4, 0.4, 0.4),
      });
    } else {
      // Tier 3: Warning text — never silently omit
      const warningText = 'Brand footer omitted \u2014 page too small';
      const warningFontSize = 1.8 * MM;
      const warningW = fontMono.widthOfTextAtSize(warningText, warningFontSize);
      const warningXPt = (pw / 2) * MM - warningW / 2;
      const warningYPt = pageH - (ph - 2) * MM;
      page.drawText(warningText, {
        x: warningXPt, y: warningYPt, size: warningFontSize, font: fontMono,
        color: rgb(0.6, 0.6, 0.6),
      });
    }
  }

  // --- PDF metadata ---
  const summary = patternSummary(spec);
  doc.setTitle(`${summary} \u2014 ${BRAND_NAME} pattern`);
  doc.setAuthor(BRAND_NAME);
  doc.setSubject('Camera calibration pattern');
  doc.setKeywords([
    spec.type,
    `${spec.rows}x${spec.cols}`,
    `${spec.square}mm`,
    spec.dict,
    'calibration',
    BRAND_NAME,
  ]);
  doc.setProducer(`${BRAND_NAME} pdf-lib`);
  doc.setCreator(BRAND_URL);

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
