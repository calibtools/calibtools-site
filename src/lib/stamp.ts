/**
 * Inspection stamp — red circular manufacturer inspection stamp.
 *
 * Ø 32 mm, double ring, circular text, centre "INSPECTED",
 * serial number, date, inspector initials, QR code to verify URL.
 *
 * Exports:
 * - drawStampOnPage(): render onto a pdf-lib PDFPage
 * - stampSvg(): static SVG string (fields blank) — text outlined separately
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

// Font size targets (in PDF points, at Ø 32mm):
// Ring text: cap height ≥ 1.9 mm ≈ 5.4 pt → use fontSize ~7.5 (cap ratio ~0.72)
// Centre INSPECTED: cap height ≥ 4 mm ≈ 11.3 pt → fontSize ~15.8
// SN/date: cap height ≥ 1.8 mm ≈ 5.1 pt → fontSize ~7.0

const RING_FONT_SIZE = 7.5;   // Geist Medium, produces ~1.9mm cap height
const CENTRE_FONT_SIZE = 12;  // Geist Pixel, produces ~4mm cap height
const DETAIL_FONT_SIZE = 6.5; // Geist Mono, produces ~1.8mm cap height
const DATE_FONT_SIZE = 5.5;   // Geist Mono, smaller for date+initials line

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
 * Requires three fonts: medium (ring text), mono (SN/date/initials), pixel (centre text).
 */
export function drawStampOnPage(
  page: PDFPage,
  opts: StampOptions,
  fonts: { medium: PDFFont; mono: PDFFont; pixel: PDFFont },
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

  // Top arc text: "CALIB.TOOLS · MUNICH" — centred at 90° (12 o'clock in y-up)
  const arcR = ((R_OUTER + R_INNER) / 2) * MM; // middle of ring band ≈ 15.1 mm
  drawArcText(page, 'CALIB.TOOLS \u00B7 MUNICH', fonts.medium, RING_FONT_SIZE,
    0, 0, arcR, 90, red, opacity);

  // Bottom arc text: "DIMENSIONAL INSPECTION" — centred at 270° (6 o'clock), flipped
  drawArcText(page, 'DIMENSIONAL INSPECTION', fonts.medium, RING_FONT_SIZE,
    0, 0, arcR, 270, red, opacity, true);

  // Centre text: "INSPECTED" — Geist Pixel, y = +3 mm above centre
  const inspW = fonts.pixel.widthOfTextAtSize('INSPECTED', CENTRE_FONT_SIZE);
  page.drawText('INSPECTED', {
    x: -inspW / 2,
    y: 3 * MM,
    size: CENTRE_FONT_SIZE,
    font: fonts.pixel,
    color: red,
    opacity,
  });

  // SN line — Geist Mono, y = −1 mm
  const snText = `SN ${sn}`;
  const snW = fonts.mono.widthOfTextAtSize(snText, DETAIL_FONT_SIZE);
  page.drawText(snText, {
    x: -snW / 2,
    y: -1 * MM,
    size: DETAIL_FONT_SIZE,
    font: fonts.mono,
    color: red,
    opacity,
  });

  // Date + initials — y = −3.5 mm
  const dateText = `${date} ${inspector}`;
  const dateW = fonts.mono.widthOfTextAtSize(dateText, DATE_FONT_SIZE);
  const dateY = -3.5 * MM;
  page.drawText(dateText, {
    x: -dateW / 2,
    y: dateY,
    size: DATE_FONT_SIZE,
    font: fonts.mono,
    color: red,
    opacity,
  });

  // QR code 8 × 8 mm — top edge ≥ 1 mm below date line, bottom ≥ 1 mm inside inner ring
  const verifyUrl = `https://calib.tools/verify/${sn}`;
  try {
    const qr = generateQR(verifyUrl);
    const qrSizeMm = 8;
    const modules = qr.length;
    const moduleSize = (qrSizeMm / (modules + 2)) * MM; // +2 for 1-module quiet zone
    const qrTotalPt = (modules + 2) * moduleSize;
    const qrTopY = dateY - 1 * MM; // 1 mm below date baseline
    const qrX = -qrTotalPt / 2 + moduleSize;
    const qrBottomY = qrTopY - qrSizeMm * MM;
    // Safety: bottom must be ≥ 1 mm inside inner ring (-R_INNER*MM + 1*MM)
    const minBottom = -(R_INNER - 1) * MM;
    const qrY = Math.max(qrBottomY, minBottom);
    for (let row = 0; row < modules; row++) {
      for (let col = 0; col < modules; col++) {
        if (qr[row][col]) {
          page.drawRectangle({
            x: qrX + col * moduleSize,
            y: qrY + (modules - 1 - row) * moduleSize,
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

/**
 * Draw text along a circular arc in pdf-lib (y-up coordinate system).
 *
 * @param centreAngleDeg  Centre of the text arc in degrees.
 *   90 = top of circle (12 o'clock in y-up), 270 = bottom.
 * @param flip  If true, letters stand on their feet (for bottom arc, reading L→R).
 */
function drawArcText(
  page: PDFPage, text: string, font: PDFFont, fontSize: number,
  cx: number, cy: number, radiusPt: number,
  centreAngleDeg: number,
  color: ReturnType<typeof rgb>, opacity: number,
  flip = false,
) {
  const letterSpacing = 0.08; // em — kept ≤ 0.12em
  const chars = text.split('');

  // Measure total arc width in points (glyph advances + spacing)
  const charWidths = chars.map(ch => font.widthOfTextAtSize(ch, fontSize));
  const spaceAdv = fontSize * letterSpacing;
  const totalWidth = charWidths.reduce((s, w) => s + w, 0) + spaceAdv * (chars.length - 1);

  // Convert linear width to angular span (radians) on the arc
  const totalAngleRad = totalWidth / radiusPt;
  const centreRad = (centreAngleDeg * Math.PI) / 180;

  // Sweep direction in pdf-lib y-up:
  //   Top (90°): decreasing angle = L→R (135°→45°)
  //   Bottom (270°): increasing angle = L→R (225°→315°)
  const dir = flip ? 1 : -1;
  let curAngle = centreRad - dir * totalAngleRad / 2;

  for (let i = 0; i < chars.length; i++) {
    const halfCharAngle = (charWidths[i] / 2) / radiusPt;
    const midAngle = curAngle + dir * halfCharAngle;

    const x = cx + radiusPt * Math.cos(midAngle);
    const y = cy + radiusPt * Math.sin(midAngle);

    // Top arc: glyph rotation = θ − 90° (baseline tangent, text reads L→R)
    // Bottom arc (flip): glyph rotation = θ + 90° (letters stand on feet)
    const rotDeg = flip
      ? (midAngle * 180 / Math.PI) + 90
      : (midAngle * 180 / Math.PI) - 90;

    page.drawText(chars[i], {
      x: x - (charWidths[i] / 2) * Math.cos(rotDeg * Math.PI / 180),
      y: y - (charWidths[i] / 2) * Math.sin(rotDeg * Math.PI / 180),
      size: fontSize,
      font,
      color,
      opacity,
      rotate: degrees(rotDeg),
    });

    curAngle += dir * (charWidths[i] + spaceAdv) / radiusPt;
  }
}

// ---------------------------------------------------------------------------
// Static SVG exports (text as <text> — outlining done by scripts/outline-svgs.mjs)
// ---------------------------------------------------------------------------

/**
 * Static inspection stamp SVG (fields blank) for public/brand/stamp-inspected.svg.
 */
export function stampSvg(): string {
  const r = DIAMETER / 2;
  const viewBox = `${-r - 1} ${-r - 1} ${DIAMETER + 2} ${DIAMETER + 2}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${DIAMETER}mm" height="${DIAMETER}mm">
  <style>text { font-family: 'Geist', 'Geist Mono', sans-serif; fill: ${BRAND_RED_HEX}; }</style>
  <!-- Outer ring -->
  <circle cx="0" cy="0" r="${r}" fill="none" stroke="${BRAND_RED_HEX}" stroke-width="${RING_OUTER_W}"/>
  <!-- Inner ring -->
  <circle cx="0" cy="0" r="${R_INNER}" fill="none" stroke="${BRAND_RED_HEX}" stroke-width="${RING_INNER_W}"/>
  <!-- Top arc text -->
  <defs>
    <path id="top-arc" d="M ${-R_INNER + 0.5},0 A ${R_INNER - 0.5},${R_INNER - 0.5} 0 1,1 ${R_INNER - 0.5},0"/>
    <path id="bot-arc" d="M ${R_INNER - 0.5},0 A ${R_INNER - 0.5},${R_INNER - 0.5} 0 1,1 ${-R_INNER + 0.5},0"/>
  </defs>
  <text font-size="3.2" font-weight="500" text-anchor="middle" letter-spacing="0.10em">
    <textPath href="#top-arc" startOffset="50%">CALIB.TOOLS \u00B7 MUNICH</textPath>
  </text>
  <text font-size="2.8" font-weight="500" text-anchor="middle" letter-spacing="0.10em">
    <textPath href="#bot-arc" startOffset="50%">DIMENSIONAL INSPECTION</textPath>
  </text>
  <!-- Centre -->
  <text x="0" y="1" font-size="4" font-weight="400" text-anchor="middle" font-family="'Geist Pixel', monospace">INSPECTED</text>
  <text x="0" y="4.5" font-size="2.2" text-anchor="middle" font-family="'Geist Mono', monospace">SN ______</text>
  <text x="0" y="7" font-size="1.8" text-anchor="middle" font-family="'Geist Mono', monospace">DATE ______ ___</text>
</svg>`;
}

/**
 * 25 × 10 mm product-mark SVG for factory use.
 */
export function productMarkSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 10" width="25mm" height="10mm">
  <style>text { font-family: 'Geist', 'Geist Mono', sans-serif; fill: ${BRAND_RED_HEX}; }</style>
  <rect x="0" y="0" width="25" height="10" fill="none" stroke="${BRAND_RED_HEX}" stroke-width="0.3"/>
  <text x="12.5" y="4.5" font-size="2.2" font-weight="500" text-anchor="middle" letter-spacing="0.10em">CALIB.TOOLS \u00B7 INSPECTED</text>
  <text x="12.5" y="7.5" font-size="1.6" text-anchor="middle" font-family="'Geist Mono', monospace">100% dimensional check \u00B7 SN ______</text>
</svg>`;
}
