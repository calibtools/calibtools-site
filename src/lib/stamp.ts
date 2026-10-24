/**
 * Inspection stamp — red circular manufacturer inspection stamp.
 *
 * Ø 32 mm, double ring, circular text, centre "INSPECTED",
 * serial number, date, inspector initials, QR code to verify URL.
 *
 * Exports:
 * - drawStampOnPage(): render onto a pdf-lib PDFPage
 * - stampSvg(): static SVG string (fields blank)
 * - productMarkSvg(): 25 × 10 mm product-mark SVG
 */

import { PDFPage, rgb, degrees, pushGraphicsState, popGraphicsState, rotateDegrees, translate } from 'pdf-lib';
import type { PDFFont } from 'pdf-lib';
import { generateQR } from './qr';
import { BRAND_RED_RGB } from './brand';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MM = 72 / 25.4;
const DIAMETER = 32; // mm
const R_OUTER = DIAMETER / 2; // 16 mm
const R_INNER = R_OUTER - 1.8; // inner text ring
const RING_OUTER_W = 0.4; // mm
const RING_INNER_W = 0.25; // mm
const BRAND_RED_HEX = '#E60012';

// ---------------------------------------------------------------------------
// PDF stamp drawing
// ---------------------------------------------------------------------------

export interface StampOptions {
  sn: string;
  date: string;
  inspector: string;
  /** Centre X in mm from left edge of page. */
  cx: number;
  /** Centre Y in mm from top edge of page. */
  cy: number;
  /** Rotation in degrees (default −8). */
  rotation?: number;
  /** Opacity 0–1 (default 0.9). */
  opacity?: number;
}

/**
 * Draw the inspection stamp onto a pdf-lib PDFPage.
 *
 * Requires three fonts: semiBold (ring text), mono (SN/date/initials), pixel (centre text).
 * Since Geist Pixel is not available, uses mono for "INSPECTED" centre text.
 */
export function drawStampOnPage(
  page: PDFPage,
  opts: StampOptions,
  fonts: { semiBold: PDFFont; mono: PDFFont },
): void {
  const { sn, date, inspector, cx, cy, rotation = -8, opacity = 0.9 } = opts;
  const pageH = page.getHeight() / MM; // page height in mm
  // Convert mm from top to PDF points from bottom
  const pdfX = cx * MM;
  const pdfY = (pageH - cy) * MM;
  const r = BRAND_RED_RGB;
  const red = rgb(r.r, r.g, r.b);

  // Push state, translate + rotate
  page.pushOperators(
    pushGraphicsState(),
    translate(pdfX, pdfY),
    rotateDegrees(rotation),
  );

  // Outer ring
  drawCircleRing(page, 0, 0, R_OUTER * MM, RING_OUTER_W * MM, red, opacity);
  // Inner ring
  drawCircleRing(page, 0, 0, R_INNER * MM, RING_INNER_W * MM, red, opacity);

  // Top arc text: "CALIB.TOOLS · MUNICH"
  drawArcText(page, 'CALIB.TOOLS \u00B7 MUNICH', fonts.semiBold, 5.5,
    0, 0, (R_OUTER - 1.0) * MM, 190, 350, red, opacity);

  // Bottom arc text: "DIMENSIONAL INSPECTION"
  drawArcText(page, 'DIMENSIONAL INSPECTION', fonts.semiBold, 4.5,
    0, 0, (R_OUTER - 1.0) * MM, 210, 330, red, opacity, true);

  // Centre text: "INSPECTED"
  const inspSize = 5.5;
  const inspW = fonts.mono.widthOfTextAtSize('INSPECTED', inspSize);
  page.drawText('INSPECTED', {
    x: -inspW / 2,
    y: 2 * MM,
    size: inspSize,
    font: fonts.mono,
    color: red,
    opacity,
  });

  // SN line
  const snText = `SN ${sn}`;
  const snSize = 4;
  const snW = fonts.mono.widthOfTextAtSize(snText, snSize);
  page.drawText(snText, {
    x: -snW / 2,
    y: -1 * MM,
    size: snSize,
    font: fonts.mono,
    color: red,
    opacity,
  });

  // Date + initials
  const dateText = `${date} ${inspector}`;
  const dateSize = 3.5;
  const dateW = fonts.mono.widthOfTextAtSize(dateText, dateSize);
  page.drawText(dateText, {
    x: -dateW / 2,
    y: -3.5 * MM,
    size: dateSize,
    font: fonts.mono,
    color: red,
    opacity,
  });

  // QR code (bottom-right quadrant of stamp)
  const verifyUrl = `https://calib.tools/verify/${sn}`;
  try {
    const qr = generateQR(verifyUrl);
    const qrSize = 8; // mm total
    const moduleSize = (qrSize / qr.length) * MM;
    const qrX = 3 * MM;
    const qrY = -10 * MM;
    for (let row = 0; row < qr.length; row++) {
      for (let col = 0; col < qr[row].length; col++) {
        if (qr[row][col]) {
          page.drawRectangle({
            x: qrX + col * moduleSize,
            y: qrY + (qr.length - 1 - row) * moduleSize,
            width: moduleSize,
            height: moduleSize,
            color: red,
            opacity,
          });
        }
      }
    }
  } catch {
    // QR generation failed — stamp still works without it
  }

  page.pushOperators(popGraphicsState());
}

// ---------------------------------------------------------------------------
// Circle ring drawing (approximated with many small arcs as rectangles)
// ---------------------------------------------------------------------------

function drawCircleRing(
  page: PDFPage, cx: number, cy: number, radius: number,
  thickness: number, color: ReturnType<typeof rgb>, opacity: number,
) {
  const steps = 120;
  for (let i = 0; i < steps; i++) {
    const a1 = (2 * Math.PI * i) / steps;
    const a2 = (2 * Math.PI * (i + 1)) / steps;
    const x1 = cx + radius * Math.cos(a1);
    const y1 = cy + radius * Math.sin(a1);
    const x2 = cx + radius * Math.cos(a2);
    const y2 = cy + radius * Math.sin(a2);
    const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
    page.drawRectangle({
      x: x1,
      y: y1 - thickness / 2,
      width: len * 1.02,
      height: thickness,
      color,
      opacity,
      rotate: degrees(angle),
    });
  }
}

// ---------------------------------------------------------------------------
// Arc text (characters placed individually along an arc)
// ---------------------------------------------------------------------------

function drawArcText(
  page: PDFPage, text: string, font: PDFFont, fontSize: number,
  cx: number, cy: number, radius: number,
  startAngle: number, endAngle: number,
  color: ReturnType<typeof rgb>, opacity: number,
  flip = false,
) {
  const chars = text.split('');
  const totalAngle = endAngle - startAngle;
  const step = totalAngle / (chars.length + 1);

  for (let i = 0; i < chars.length; i++) {
    const angle = startAngle + step * (i + 1);
    const rad = (angle * Math.PI) / 180;
    const x = cx + radius * Math.cos(rad);
    const y = cy + radius * Math.sin(rad);
    const charRotation = flip ? angle + 90 : angle - 90;

    const charW = font.widthOfTextAtSize(chars[i], fontSize);
    page.drawText(chars[i], {
      x: x - (charW / 2) * Math.cos((charRotation * Math.PI) / 180),
      y: y - (charW / 2) * Math.sin((charRotation * Math.PI) / 180),
      size: fontSize,
      font,
      color,
      opacity,
      rotate: degrees(charRotation),
    });
  }
}

// ---------------------------------------------------------------------------
// Static SVG exports
// ---------------------------------------------------------------------------

/**
 * Static inspection stamp SVG (fields blank) for public/brand/stamp-inspected.svg.
 */
export function stampSvg(): string {
  const r = DIAMETER / 2;
  const viewBox = `${-r - 1} ${-r - 1} ${DIAMETER + 2} ${DIAMETER + 2}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${DIAMETER}mm" height="${DIAMETER}mm">
  <style>text { font-family: 'Geist Sans', 'Geist Mono', sans-serif; fill: ${BRAND_RED_HEX}; }</style>
  <!-- Outer ring -->
  <circle cx="0" cy="0" r="${r}" fill="none" stroke="${BRAND_RED_HEX}" stroke-width="${RING_OUTER_W}"/>
  <!-- Inner ring -->
  <circle cx="0" cy="0" r="${R_INNER}" fill="none" stroke="${BRAND_RED_HEX}" stroke-width="${RING_INNER_W}"/>
  <!-- Top arc text -->
  <defs>
    <path id="top-arc" d="M ${-R_INNER + 0.5},0 A ${R_INNER - 0.5},${R_INNER - 0.5} 0 1,1 ${R_INNER - 0.5},0"/>
    <path id="bot-arc" d="M ${R_INNER - 0.5},0 A ${R_INNER - 0.5},${R_INNER - 0.5} 0 1,1 ${-R_INNER + 0.5},0"/>
  </defs>
  <text font-size="3.2" font-weight="600" text-anchor="middle" letter-spacing="0.8">
    <textPath href="#top-arc" startOffset="50%">CALIB.TOOLS \u00B7 MUNICH</textPath>
  </text>
  <text font-size="2.8" font-weight="600" text-anchor="middle" letter-spacing="0.6">
    <textPath href="#bot-arc" startOffset="50%">DIMENSIONAL INSPECTION</textPath>
  </text>
  <!-- Centre -->
  <text x="0" y="1" font-size="3.5" font-weight="700" text-anchor="middle" font-family="'Geist Mono', monospace">INSPECTED</text>
  <text x="0" y="4.5" font-size="2.5" text-anchor="middle" font-family="'Geist Mono', monospace">SN ______</text>
  <text x="0" y="7" font-size="2" text-anchor="middle" font-family="'Geist Mono', monospace">DATE ______ ___</text>
</svg>`;
}

/**
 * 25 × 10 mm product-mark SVG for factory use.
 */
export function productMarkSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 10" width="25mm" height="10mm">
  <style>text { font-family: 'Geist Sans', 'Geist Mono', sans-serif; fill: ${BRAND_RED_HEX}; }</style>
  <rect x="0" y="0" width="25" height="10" fill="none" stroke="${BRAND_RED_HEX}" stroke-width="0.3"/>
  <text x="12.5" y="4.5" font-size="2.2" font-weight="600" text-anchor="middle" letter-spacing="0.3">CALIB.TOOLS \u00B7 INSPECTED</text>
  <text x="12.5" y="7.5" font-size="1.6" text-anchor="middle" font-family="'Geist Mono', monospace">100% dimensional check \u00B7 SN ______</text>
</svg>`;
}
