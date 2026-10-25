/**
 * Convert <text> elements in stamp SVGs to outlined <path> elements
 * using opentype.js, so the SVGs work on machines without our fonts.
 *
 * Reads the source SVGs from stamp.ts, replaces text with glyph outlines,
 * and writes to public/brand/.
 *
 * Also exports PDF versions using Playwright.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import opentype from 'opentype.js';

const ROOT = process.cwd();
const FONT_DIR = resolve(ROOT, 'src/assets/fonts');
const BRAND_DIR = resolve(ROOT, 'public/brand');

// Load fonts
const geistMedium = opentype.parse(readFileSync(resolve(FONT_DIR, 'Geist-Medium.otf')).buffer);
const geistMono = opentype.parse(readFileSync(resolve(FONT_DIR, 'GeistMono-Regular.ttf')).buffer);
const geistPixel = opentype.parse(readFileSync(resolve(FONT_DIR, 'GeistPixel-Square.otf')).buffer);

const BRAND_RED = '#E60012';

// ---------------------------------------------------------------------------
// Stamp SVG outlining (Ø 32 mm)
// ---------------------------------------------------------------------------

function outlineStampSvg() {
  const D = 32;
  const r = D / 2;
  const rInner = r - 1.8;
  const ringOuterW = 0.4;
  const ringInnerW = 0.25;

  const paths = [];

  // Outer + inner rings
  paths.push(`<circle cx="0" cy="0" r="${r}" fill="none" stroke="${BRAND_RED}" stroke-width="${ringOuterW}"/>`);
  paths.push(`<circle cx="0" cy="0" r="${rInner}" fill="none" stroke="${BRAND_RED}" stroke-width="${ringInnerW}"/>`);

  // Arc radius = middle of ring band
  const arcR = (r + rInner) / 2;

  // Top arc text: "CALIB.TOOLS · MUNICH" — centred at top (−90° in SVG y-down)
  paths.push(arcTextToPath('CALIB.TOOLS \u00B7 MUNICH', geistMedium, 3.2, arcR, -90, false));

  // Bottom arc text: "DIMENSIONAL INSPECTION" — centred at bottom (+90° in SVG y-down)
  paths.push(arcTextToPath('DIMENSIONAL INSPECTION', geistMedium, 2.8, arcR, 90, true));

  // Centre "INSPECTED" — Geist Pixel, y = −3 mm (above centre in SVG y-down)
  paths.push(textToPath('INSPECTED', geistPixel, 4, 0, -3, 'middle'));

  // SN placeholder — y = +1 mm
  paths.push(textToPath('SN ______', geistMono, 2.2, 0, 1, 'middle'));

  // Date placeholder — y = +3.5 mm
  paths.push(textToPath('DATE ______ ___', geistMono, 1.8, 0, 3.5, 'middle'));

  const viewBox = `${-r - 1} ${-r - 1} ${D + 2} ${D + 2}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${D}mm" height="${D}mm">
${paths.join('\n')}
</svg>`;
}

// ---------------------------------------------------------------------------
// Product mark SVG outlining (25 × 10 mm)
// ---------------------------------------------------------------------------

function outlineProductMarkSvg() {
  const W = 25, H = 10;
  const padding = 1; // mm min padding on each side
  const paths = [];

  // Border
  paths.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="none" stroke="${BRAND_RED}" stroke-width="0.3"/>`);

  // "CALIB.TOOLS · INSPECTED" — shrink to fit with padding
  const line1 = 'CALIB.TOOLS \u00B7 INSPECTED';
  const line1Size = fitFontSize(line1, geistMedium, 2.2, W - padding * 2);
  paths.push(textToPath(line1, geistMedium, line1Size, W / 2, 4.5, 'middle'));

  // "100% dimensional check · SN ______"
  const line2 = '100% dimensional check \u00B7 SN ______';
  const line2Size = fitFontSize(line2, geistMono, 1.6, W - padding * 2);
  paths.push(textToPath(line2, geistMono, line2Size, W / 2, 7.5, 'middle'));

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}mm" height="${H}mm">
${paths.join('\n')}
</svg>`;
}

/** Shrink fontSize until text fits within maxWidth mm. */
function fitFontSize(text, font, idealSize, maxWidth) {
  const scale = idealSize / font.unitsPerEm;
  const glyphs = font.stringToGlyphs(text);
  let totalAdvance = 0;
  for (const g of glyphs) totalAdvance += (g.advanceWidth ?? 0);
  const textWidth = totalAdvance * scale;
  if (textWidth <= maxWidth) return idealSize;
  return idealSize * (maxWidth / textWidth);
}

// ---------------------------------------------------------------------------
// Text to SVG path helpers — uses getPath().toPathData() for correct y-flip
// ---------------------------------------------------------------------------

/**
 * Render straight-line text to an SVG <path>.
 * opentype's getPath(x, y, fontSize) returns path data in SVG coordinates
 * (y points down, y param is the baseline).
 */
function textToPath(text, font, fontSize, x, y, anchor) {
  const scale = fontSize / font.unitsPerEm;
  const glyphs = font.stringToGlyphs(text);
  let totalAdvance = 0;
  for (const g of glyphs) totalAdvance += (g.advanceWidth ?? 0);
  const totalWidth = totalAdvance * scale;

  let startX = x;
  if (anchor === 'middle') startX = x - totalWidth / 2;
  else if (anchor === 'end') startX = x - totalWidth;

  // Use font.getPath which handles y-flip correctly for SVG
  const path = font.getPath(text, startX, y, fontSize);
  const d = path.toPathData(3);
  if (!d) return '';
  return `<path d="${d}" fill="${BRAND_RED}"/>`;
}

/**
 * Render text along a circular arc in SVG coordinates (y-down).
 *
 * @param centreAngleDeg  Centre of arc in SVG degrees.
 *   -90 = top (12 o'clock), +90 = bottom (6 o'clock).
 * @param flip  If true, letters stand upright at the bottom of the circle.
 */
function arcTextToPath(text, font, fontSize, radius, centreAngleDeg, flip) {
  const letterSpacing = 0.08; // em
  const chars = text.split('');
  const scale = fontSize / font.unitsPerEm;

  // Measure char widths in SVG units (mm)
  const charWidths = chars.map(ch => {
    const g = font.charToGlyph(ch);
    return (g.advanceWidth ?? 0) * scale;
  });
  const spaceAdv = fontSize * letterSpacing;
  const totalWidth = charWidths.reduce((s, w) => s + w, 0) + spaceAdv * (chars.length - 1);

  // Convert linear width to angular span
  const totalAngleRad = totalWidth / radius;
  const centreRad = (centreAngleDeg * Math.PI) / 180;

  // Sweep direction: top arc (flip=false) → increasing angle = L→R
  // Bottom arc (flip=true) → decreasing angle = L→R in SVG y-down
  const dir = flip ? -1 : 1;
  let curAngle = centreRad - dir * totalAngleRad / 2;

  let allPaths = '';

  for (let i = 0; i < chars.length; i++) {
    const halfCharAngle = (charWidths[i] / 2) / radius;
    const midAngle = curAngle + dir * halfCharAngle;

    // Position on circle (SVG y-down: sin gives correct downward y)
    const cx = radius * Math.cos(midAngle);
    const cy = radius * Math.sin(midAngle);

    // Glyph rotation:
    // Top arc (flip=false): θ + 90° (baseline tangent, text reads L→R)
    // Bottom arc (flip=true): θ − 90° (letters stand on feet, text reads L→R)
    const rotDeg = flip
      ? (midAngle * 180 / Math.PI) - 90
      : (midAngle * 180 / Math.PI) + 90;

    // Get glyph path at origin with correct y-flip via getPath
    const glyph = font.charToGlyph(chars[i]);
    const glyphPath = glyph.getPath(-charWidths[i] / 2, 0, fontSize);
    const d = glyphPath.toPathData(3);
    if (!d) { curAngle += dir * (charWidths[i] + spaceAdv) / radius; continue; }

    allPaths += `<path d="${d}" fill="${BRAND_RED}" transform="translate(${cx.toFixed(3)},${cy.toFixed(3)}) rotate(${rotDeg.toFixed(2)})"/>`;

    curAngle += dir * (charWidths[i] + spaceAdv) / radius;
  }

  return allPaths;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const stampOutlined = outlineStampSvg();
writeFileSync(resolve(BRAND_DIR, 'stamp-inspected.svg'), stampOutlined);
console.log('[outline-svgs] stamp-inspected.svg written (outlined)');

const markOutlined = outlineProductMarkSvg();
writeFileSync(resolve(BRAND_DIR, 'product-mark-inspected.svg'), markOutlined);
console.log('[outline-svgs] product-mark-inspected.svg written (outlined)');

// Verify no <text> elements remain
if (stampOutlined.includes('<text')) {
  console.error('ERROR: stamp SVG still contains <text> elements!');
  process.exit(1);
}
if (markOutlined.includes('<text')) {
  console.error('ERROR: product-mark SVG still contains <text> elements!');
  process.exit(1);
}

console.log('[outline-svgs] All SVGs verified: no <text> elements.');

// ---------------------------------------------------------------------------
// PDF export via Playwright — vector, exact mm page size, no fonts
// ---------------------------------------------------------------------------

async function svgToPdf(svgContent, pdfPath, widthMm, heightMm) {
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(`<!DOCTYPE html><html><body style="margin:0;padding:0;overflow:hidden">${svgContent.replace(/width="[^"]*"/, `width="${widthMm}mm"`).replace(/height="[^"]*"/, `height="${heightMm}mm"`)}</body></html>`);
  await page.pdf({
    path: pdfPath,
    width: `${widthMm}mm`,
    height: `${heightMm}mm`,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
    printBackground: true,
  });
  await browser.close();
  console.log(`[outline-svgs] ${pdfPath} written (vector PDF)`);
}

await svgToPdf(stampOutlined, resolve(BRAND_DIR, 'stamp-inspected.pdf'), 32, 32);
await svgToPdf(markOutlined, resolve(BRAND_DIR, 'product-mark-inspected.pdf'), 25, 10);
