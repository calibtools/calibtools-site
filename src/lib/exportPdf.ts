/**
 * PDF export — browser-side, 1:1 mm output using pdf-lib.
 * All coordinates come from src/lib/patterns.ts geometry; this file only handles rendering.
 * 1 PDF point = 1/72 inch. 1 mm = 72/25.4 pt ≈ 2.8346 pt.
 */
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { PatternSpec } from './patterns';
import { BRAND_RED_RGB, BRAND_INK_RGB } from './brand';
import {
  BRAND_NAME,
  SITE_URL,
  PRINT_NOTE,
  patternSummary,
  provenanceLine,
  WORDMARK_PATHS,
  WORDMARK_FRAME_RECTS,
  WORDMARK_DOT_RECT,
  WORDMARK_VB,
} from './exportBrand';

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
    const rightText = `${summary} \u00B7 ${SITE_URL}`;
    const rightW = fontMono.widthOfTextAtSize(rightText, fontSize);
    const [rx, ry] = pt(ox + bw, sbY + 4);
    page.drawText(rightText, { x: rx - rightW, y: ry, size: fontSize, font: fontMono, color: rgb(0.2, 0.2, 0.2) });

    scaleBarBottom = sbY + 4 + 2.6; // sbY + label offset + approx text height
  }

  // --- Brand footer (3-tier fallback — never silently omitted) ---
  const patternBottom = oy + bh;
  const fullFooterY = Math.max(scaleBarBottom + 4, patternBottom + 2 * spec.square);

  /** Draw the bracket-framed wordmark at (xMm, yMm) with given height in mm. */
  const drawWordmark = (xMm: number, yMm: number, hMm: number) => {
    const s = hMm * MM / WORDMARK_VB.height;
    // PDF drawSvgPath: pdfX = x + svgX*s, pdfY = y - svgY*s
    const pdfX = xMm * MM - WORDMARK_VB.minX * s;
    const pdfY = pageH - yMm * MM + WORDMARK_VB.minY * s;
    // Letter outlines (black)
    for (const d of WORDMARK_PATHS) {
      page.drawSvgPath(d, {
        x: pdfX, y: pdfY, scale: s,
        color: rgb(BRAND_INK_RGB.r, BRAND_INK_RGB.g, BRAND_INK_RGB.b),
      });
    }
    // Frame bracket rects (black)
    for (const [rx, ry, rw, rh] of WORDMARK_FRAME_RECTS) {
      page.drawRectangle({
        x: pdfX + rx * s,
        y: pdfY - (ry + rh) * s,
        width: rw * s, height: rh * s,
        color: rgb(BRAND_INK_RGB.r, BRAND_INK_RGB.g, BRAND_INK_RGB.b),
      });
    }
    // Red dot
    const [dx, dy, dw, dh] = WORDMARK_DOT_RECT;
    page.drawRectangle({
      x: pdfX + dx * s,
      y: pdfY - (dy + dh) * s,
      width: dw * s, height: dh * s,
      color: rgb(BRAND_RED_RGB.r, BRAND_RED_RGB.g, BRAND_RED_RGB.b),
    });
  };

  if (fullFooterY + 14 < ph) {
    // Tier 1: Full footer — wordmark + parameter + provenance + print note
    drawWordmark(ox, fullFooterY, 5);

    const summary = patternSummary(spec);
    const provenance = provenanceLine('generator');
    const paramFontSize = 2.2 * MM;
    const provFontSize = 1.8 * MM;
    const noteFontSize = 1.6 * MM;

    const textCentreX = (ox + bw / 2) * MM;

    // Parameter line
    const paramText = summary;
    const paramW = fontMono.widthOfTextAtSize(paramText, paramFontSize);
    const paramYPt = pageH - (fullFooterY + 5 + 2) * MM;
    page.drawText(paramText, {
      x: textCentreX - paramW / 2, y: paramYPt, size: paramFontSize, font: fontMono,
      color: rgb(0.2, 0.2, 0.2),
    });

    // Provenance line
    const provW = fontMono.widthOfTextAtSize(provenance, provFontSize);
    const provYPt = paramYPt - 3.2 * MM;
    page.drawText(provenance, {
      x: textCentreX - provW / 2, y: provYPt, size: provFontSize, font: fontMono,
      color: rgb(0.4, 0.4, 0.4),
    });

    // Print note
    const noteW = fontMono.widthOfTextAtSize(PRINT_NOTE, noteFontSize);
    const noteYPt = provYPt - 2.8 * MM;
    page.drawText(PRINT_NOTE, {
      x: textCentreX - noteW / 2, y: noteYPt, size: noteFontSize, font: fontMono,
      color: rgb(0.6, 0.6, 0.6),
    });
  } else {
    // Tier 2: Compact one-line footer
    const compactY = Math.max(scaleBarBottom + 2, patternBottom + 4);
    if (compactY + 6 < ph) {
      drawWordmark(ox, compactY, 3);
      const wmWidth = 3 * (WORDMARK_VB.width / WORDMARK_VB.height);
      const summary = patternSummary(spec);
      const provenance = provenanceLine('generator');
      const compactText = `${summary} \u00B7 ${provenance}`;
      const compactFontSize = 1.8 * MM;
      const [tx, ty] = pt(ox + wmWidth + 2, compactY + 3 * 0.7);
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

  // --- XY orientation axes (same geometry as SVG/DXF) ---
  if (spec.showAxes !== false) {
    const isKalibr = spec.type === 'AprilGrid (Kalibr)' && spec.symmetricCorners;
    const shorter = Math.min(bw, bh);
    const arrowLen = Math.max(15, Math.min(40, shorter * 0.15));
    const shaftW = 0.4;
    const headLen = Math.min(3, arrowLen * 0.2);
    const headW = headLen * 0.6;
    const axGap = 0.5 * spec.square;

    // Origin in mm (y-down pattern coords)
    const axOx = ox - axGap;
    const axOy = isKalibr ? oy + bh + axGap : oy - axGap;

    const xColor = rgb(230 / 255, 0, 18 / 255); // #E60012
    const yColor = rgb(27 / 255, 165 / 255, 90 / 255); // #1BA55A

    // X arrow: pointing right
    const xEnd = axOx + arrowLen;
    const [xShaftX, xShaftY] = pt(axOx, axOy);
    const [xShaftEndX] = pt(xEnd - headLen, axOy);
    page.drawRectangle({
      x: xShaftX, y: xShaftY - shaftW / 2 * MM,
      width: (arrowLen - headLen) * MM, height: shaftW * MM,
      color: xColor,
    });
    // X arrowhead (triangle via SVG path)
    const [xTipX, xTipY] = pt(xEnd, axOy);
    page.drawSvgPath(
      `M 0 0 L ${-headLen * MM} ${-headW * MM} L ${-headLen * MM} ${headW * MM} Z`,
      { x: xTipX, y: xTipY, color: xColor },
    );
    // X label
    const [xlX, xlY] = pt(xEnd + 1, axOy + 1);
    page.drawText('X', { x: xlX, y: xlY, size: 2.5 * MM, font: fontMono, color: xColor });

    // Y arrow: pointing down (OpenCV) or up (Kalibr)
    const yDir = isKalibr ? -1 : 1;
    const yEnd = axOy + yDir * arrowLen;
    const [yShaftX2, yShaftY2] = pt(axOx, axOy);
    // Shaft as a thin rectangle
    const yShaftLen = (arrowLen - headLen) * MM;
    if (isKalibr) {
      // y-up in pattern coords → y-down in PDF → draw upward from origin
      page.drawRectangle({
        x: yShaftY2 - shaftW / 2 * MM, y: yShaftY2,
        width: shaftW * MM, height: yShaftLen,
        color: yColor,
      });
    }
    // Use line approach: draw shaft as a very thin rect along Y axis
    const yShaftTopMm = Math.min(axOy, yEnd - yDir * headLen);
    const yShaftBotMm = Math.max(axOy, yEnd - yDir * headLen);
    const [ysX, ysTopY] = pt(axOx - shaftW / 2, yShaftTopMm);
    const [, ysBotY] = pt(axOx, yShaftBotMm);
    page.drawRectangle({
      x: ysX, y: ysBotY,
      width: shaftW * MM, height: (yShaftBotMm - yShaftTopMm) * MM,
      color: yColor,
    });
    // Y arrowhead
    const [yTipX, yTipY] = pt(axOx, yEnd);
    const yHeadDir = isKalibr ? 1 : -1; // In PDF y-up coords: OpenCV arrow points down (negative), Kalibr up (positive)
    page.drawSvgPath(
      `M 0 0 L ${-headW * MM} ${yHeadDir * headLen * MM} L ${headW * MM} ${yHeadDir * headLen * MM} Z`,
      { x: yTipX, y: yTipY, color: yColor },
    );
    // Y label
    const [ylX, ylY] = pt(axOx + 1.5, yEnd + yDir * 2.5);
    page.drawText('Y', { x: ylX, y: ylY, size: 2.5 * MM, font: fontMono, color: yColor });

    // Origin dot
    const [odX, odY] = pt(axOx, axOy);
    drawCircle(page, pt, axOx, axOy, 0.8);

    // Caption
    const caption = isKalibr ? 'Kalibr frame \u00B7 origin bottom-left' : 'OpenCV frame \u00B7 origin top-left';
    const captionFontSize = 1.8 * MM;
    const [capX, capY] = pt(axOx + 3, axOy + (isKalibr ? 3 : -2));
    page.drawText(caption, { x: capX, y: capY, size: captionFontSize, font: fontMono, color: rgb(0.4, 0.4, 0.4) });
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
  doc.setCreator(SITE_URL);

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
