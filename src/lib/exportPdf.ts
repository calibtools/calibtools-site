/**
 * PDF export — browser-side, 1:1 mm output using pdf-lib.
 * The pattern is drawn from patternShapes() (the renderer output the SVG uses); this file holds no pattern geometry.
 * 1 PDF point = 1/72 inch. 1 mm = 72/25.4 pt ≈ 2.8346 pt.
 */
import { PDFDocument, rgb, pushGraphicsState, popGraphicsState, rectangle, clip, endPath, type PDFFont, type PDFPage } from 'pdf-lib';
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
  AXIS_Y_RGB,
} from './exportBrand';
import { patternShapes, fillRgb, shapeBox, type Shape } from './patternShapes';
import { patternExtent, type PageLayout } from './pageLayout';
import { isKalibrFrame, scaleBarTop, axesOffset } from './renderAprilGrid';

/** Conversion factor: millimeters → PDF points. */
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
  /** Layout-computed geometry. When provided, overrides pw/ph and inline ox/oy. */
  layout?: PageLayout;
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
export async function exportPdf({ spec, pw: rawPw, ph: rawPh, fontBytes, layout }: PdfExportOptions): Promise<Uint8Array> {
  const pw = layout?.pw ?? rawPw;
  const ph = layout?.ph ?? rawPh;
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const page = doc.addPage([pw * MM, ph * MM]);
  const pageH = ph * MM;

  /** Convert mm x/y to PDF points (flip y). */
  const pt = (xMm: number, yMm: number): [number, number] => [xMm * MM, pageH - yMm * MM];

  const bw = layout?.bw ?? patternExtent(spec).bw;
  const bh = layout?.bh ?? patternExtent(spec).bh;
  const ox = layout?.ox ?? (pw - bw) / 2;
  const oy = layout?.oy ?? ((ph - bh) / 2 - (spec.scaleBar ? 6 : 0));


  // --- Embed fonts ---
  const fonts = await loadFontBytes(fontBytes);
  const fontRegular = await doc.embedFont(fonts.regular, { subset: true });
  const fontSemiBold = await doc.embedFont(fonts.semiBold, { subset: true });
  const fontMono = await doc.embedFont(fonts.mono, { subset: true });

  // Pattern: the same shapes the SVG renderer draws, at the same place.
  drawShapes(page, patternShapes(spec, ox, oy), pt, fontMono);

  // Scale bar
  let scaleBarBottom = 0;
  if (spec.scaleBar) {
    const sbY = scaleBarTop(spec, oy, bh);
    const [sx, sy] = pt(ox, sbY);
    // 100 mm horizontal line, 0.6 mm thick
    page.drawRectangle({ x: sx, y: sy - 0.6 * MM, width: 100 * MM, height: 0.6 * MM, color: rgb(0, 0, 0) });

    // Label text — use Geist Mono
    const fontSize = 2.6 * MM;
    const [tx, ty] = pt(ox, sbY + 4);
    page.drawText('100 mm scale check', { x: tx, y: ty, size: fontSize, font: fontMono, color: rgb(0.2, 0.2, 0.2) });

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

  // Layout-computed brand block (new path — wordmark bottom-left, text to the right)
  if (layout?.brand) {
    const b = layout.brand;
    drawWordmark(b.wmX, b.wmY, b.wmH);

    const summary = patternSummary(spec);
    const provenance = provenanceLine('generator');
    const fs = 2.47 * MM; // 7 pt

    const [tx, ty] = pt(b.textX, b.textY);
    page.drawText(summary, { x: tx, y: ty, size: fs, font: fontMono, color: rgb(0.2, 0.2, 0.2) });
    const [tx2, ty2] = pt(b.textX, b.textY + b.textLineH);
    page.drawText(provenance, { x: tx2, y: ty2, size: fs, font: fontMono, color: rgb(0.4, 0.4, 0.4) });
    const [tx3, ty3] = pt(b.textX, b.textY + 2 * b.textLineH);
    page.drawText(PRINT_NOTE, { x: tx3, y: ty3, size: fs, font: fontMono, color: rgb(0.6, 0.6, 0.6) });
  } else if (fullFooterY + 14 < ph) {
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
    const ax = layout?.axes;
    const isKalibr = ax ? ax.isKalibr : isKalibrFrame(spec);
    const shorter = Math.min(bw, bh);
    const arrowLen = ax?.arrowLen ?? Math.max(15, Math.min(40, shorter * 0.15));
    const shaftW = ax?.shaft ?? 0.4;
    const headLen = ax?.headLen ?? Math.min(3, arrowLen * 0.2);
    const headW = ax?.headW ?? headLen * 0.6;

    // Origin in mm (y-down pattern coords)
    const axOx = ax?.originX ?? ox - axesOffset(spec).x;
    const axOy = ax?.originY ?? (isKalibr ? oy + bh + axesOffset(spec).y : oy - axesOffset(spec).y);

    const xColor = rgb(230 / 255, 0, 18 / 255); // #E60012
    const yColor = rgb(...AXIS_Y_RGB); // #00A651, as printed on the boards

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

// ---------------------------------------------------------------------------
// Tiled PDF export (rule 5)
// ---------------------------------------------------------------------------

export interface TiledPdfOptions {
  spec: PatternSpec;
  tiling: import('./pageLayout').TilingLayout;
  fontBytes?: PdfExportOptions['fontBytes'];
}

/**
 * Multi-page tiled PDF at 100 % scale.
 * Each sheet draws its window of the pattern with 10 mm overlap.
 * Crop marks at window corners, page label, parameter + provenance on every sheet,
 * wordmark on sheet 1 only, assembly note on sheet 1.
 */
export async function exportTiledPdf({ spec, tiling, fontBytes }: TiledPdfOptions): Promise<Uint8Array> {
  const { PAGE_MARGIN, TILE_ASSEMBLY_NOTE, brandBlockHeight, wordmarkWidth, wordmarkClearSpace, BRAND_LINE_SPACING } = await import('./pageLayout');

  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  const fonts = await loadFontBytes(fontBytes);
  const fontMono = await doc.embedFont(fonts.mono, { subset: true });

  const { bw, bh } = patternExtent(spec);
  const { tilePw, tilePh, tileW, tileH, cols, rows, overlapMm } = tiling;
  const pageW = tilePw * MM;
  const pageH = tilePh * MM;

  const wmW = wordmarkWidth(tilePw, tilePh);
  const wmH = wmW / (WORDMARK_VB.width / WORDMARK_VB.height);
  const bbH = brandBlockHeight(wmW);
  const cs = wordmarkClearSpace(wmH);


  const summary = patternSummary(spec);
  const provenance = provenanceLine('generator');
  const fs = 2.47 * MM; // 7 pt

  for (let tileRow = 0; tileRow < rows; tileRow++) {
    for (let tileCol = 0; tileCol < cols; tileCol++) {
      const page = doc.addPage([pageW, pageH]);
      const pt = (xMm: number, yMm: number): [number, number] => [xMm * MM, pageH - yMm * MM];

      // Window origin in pattern coords (mm)
      const winX0 = tileCol * (tileW - overlapMm);
      const winY0 = tileRow * (tileH - overlapMm);
      const winX1 = Math.min(winX0 + tileW, bw);
      const winY1 = Math.min(winY0 + tileH, bh);

      // Offset: where the window's (0,0) maps on the page
      const pageOx = PAGE_MARGIN;
      const pageOy = PAGE_MARGIN;

      // Draw the part of the pattern that falls in this window, clipped at the window edge.
      const winW = winX1 - winX0, winH = winY1 - winY0;
      const inWindow = patternShapes(spec, pageOx - winX0, pageOy - winY0).filter((sh) => {
        const b = shapeBox(sh);
        return b.x1 > pageOx && b.x0 < pageOx + winW && b.y1 > pageOy && b.y0 < pageOy + winH;
      });
      const [clipX, clipY] = pt(pageOx, pageOy + winH);
      page.pushOperators(pushGraphicsState(), rectangle(clipX, clipY, winW * MM, winH * MM), clip(), endPath());
      drawShapes(page, inWindow, pt, fontMono);
      page.pushOperators(popGraphicsState());

      // Crop marks at window corners (6 mm lines, 0.3 mm wide)
      const cropLen = 6;
      const cropW = 0.3;
      const corners = [
        [pageOx, pageOy],                                 // top-left
        [pageOx + (winX1 - winX0), pageOy],               // top-right
        [pageOx, pageOy + (winY1 - winY0)],               // bottom-left
        [pageOx + (winX1 - winX0), pageOy + (winY1 - winY0)], // bottom-right
      ];
      for (const [cx, cy] of corners) {
        // Horizontal crop mark
        const dir = cx <= tilePw / 2 ? -1 : 1;
        const [hx, hy] = pt(cx + dir * 1, cy);
        page.drawRectangle({ x: hx + (dir < 0 ? -cropLen * MM : 0), y: hy - cropW / 2 * MM, width: cropLen * MM, height: cropW * MM, color: rgb(0, 0, 0) });
        // Vertical crop mark
        const vdir = cy <= tilePh / 2 ? -1 : 1;
        const [vx, vy] = pt(cx, cy + vdir * 1);
        page.drawRectangle({ x: vx - cropW / 2 * MM, y: vy + (vdir < 0 ? 0 : -cropLen * MM), width: cropW * MM, height: cropLen * MM, color: rgb(0, 0, 0) });
      }

      // Page label "Sheet r/c of R×C"
      const sheetNum = tileRow * cols + tileCol + 1;
      const label = `Sheet ${tileRow + 1}/${tileCol + 1} of ${rows}\u00D7${cols}`;
      const labelY = tilePh - PAGE_MARGIN - bbH + 2;
      const [lx, ly] = pt(tilePw - PAGE_MARGIN, labelY);
      const labelW = fontMono.widthOfTextAtSize(label, fs);
      page.drawText(label, { x: lx - labelW, y: ly, size: fs, font: fontMono, color: rgb(0.4, 0.4, 0.4) });

      // Parameter + provenance on every sheet
      const textX = PAGE_MARGIN;
      const textY = tilePh - PAGE_MARGIN - bbH + 2;
      const [tx, ty] = pt(textX, textY);
      page.drawText(summary, { x: tx, y: ty, size: fs, font: fontMono, color: rgb(0.2, 0.2, 0.2) });
      const [tx2, ty2] = pt(textX, textY + BRAND_LINE_SPACING);
      page.drawText(provenance, { x: tx2, y: ty2, size: fs, font: fontMono, color: rgb(0.4, 0.4, 0.4) });

      // Wordmark on sheet 1 only
      if (sheetNum === 1) {
        const wmX = PAGE_MARGIN;
        const wmY = tilePh - PAGE_MARGIN - wmH;
        const s = wmH * MM / WORDMARK_VB.height;
        const pdfX = wmX * MM - WORDMARK_VB.minX * s;
        const pdfY = pageH - wmY * MM + WORDMARK_VB.minY * s;
        for (const d of WORDMARK_PATHS) {
          page.drawSvgPath(d, { x: pdfX, y: pdfY, scale: s, color: rgb(BRAND_INK_RGB.r, BRAND_INK_RGB.g, BRAND_INK_RGB.b) });
        }
        for (const [rx, ry, rw, rh] of WORDMARK_FRAME_RECTS) {
          page.drawRectangle({ x: pdfX + rx * s, y: pdfY - (ry + rh) * s, width: rw * s, height: rh * s, color: rgb(BRAND_INK_RGB.r, BRAND_INK_RGB.g, BRAND_INK_RGB.b) });
        }
        const [dx, dy, dw, dh] = WORDMARK_DOT_RECT;
        page.drawRectangle({ x: pdfX + dx * s, y: pdfY - (dy + dh) * s, width: dw * s, height: dh * s, color: rgb(BRAND_RED_RGB.r, BRAND_RED_RGB.g, BRAND_RED_RGB.b) });

        // Assembly note on sheet 1
        const [ax, ay] = pt(textX, textY + 2 * BRAND_LINE_SPACING);
        page.drawText(TILE_ASSEMBLY_NOTE, { x: ax, y: ay, size: fs, font: fontMono, color: rgb(0.6, 0.6, 0.6) });
      } else {
        // Print note on non-sheet-1 pages
        const [tx3, ty3] = pt(textX, textY + 2 * BRAND_LINE_SPACING);
        page.drawText(PRINT_NOTE, { x: tx3, y: ty3, size: fs, font: fontMono, color: rgb(0.6, 0.6, 0.6) });
      }
    }
  }

  // PDF metadata
  doc.setTitle(`${summary} \u2014 ${BRAND_NAME} pattern (tiled ${cols}\u00D7${rows})`);
  doc.setAuthor(BRAND_NAME);
  doc.setSubject('Camera calibration pattern — tiled across sheets');
  doc.setProducer(`${BRAND_NAME} pdf-lib`);
  doc.setCreator(SITE_URL);

  return doc.save();
}

/** Draw pattern shapes (mm, y down) on a page. */
function drawShapes(page: PDFPage, shapes: Shape[], pt: (x: number, y: number) => [number, number], font: PDFFont) {
  for (const s of shapes) {
    const [r, g, b] = fillRgb(s.fill);
    const color = rgb(r, g, b);
    if (s.kind === 'rect') {
      const [x, y] = pt(s.x, s.y + s.h);
      page.drawRectangle({ x, y, width: s.w * MM, height: s.h * MM, color });
    } else if (s.kind === 'circle') {
      drawCircle(page, pt, s.cx, s.cy, s.r, color);
    } else {
      const size = s.size * MM;
      const w = font.widthOfTextAtSize(s.text, size);
      const [x, y] = pt(s.x, s.y);
      page.drawText(s.text, { x: x - (s.anchor === 'middle' ? w / 2 : s.anchor === 'end' ? w : 0), y, size, font, color });
    }
  }
}

/** Draw a filled circle using 4 Bézier quarter-arcs. */
function drawCircle(
  page: PDFPage,
  pt: (x: number, y: number) => [number, number],
  cx: number,
  cy: number,
  r: number,
  color = rgb(0, 0, 0),
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
    { x: pcx, y: pcy, color },
  );
}
