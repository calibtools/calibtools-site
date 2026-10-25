/**
 * Convert <text> elements in stamp SVGs to outlined <path> elements
 * using opentype.js, so the SVGs work on machines without our fonts.
 *
 * Reads the source SVGs from stamp.ts, replaces text with glyph outlines,
 * and writes to public/brand/.
 *
 * Also exports PDF versions using pdf-lib.
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

  // Top arc text: "CALIB.TOOLS · MUNICH"
  paths.push(arcTextToPath('CALIB.TOOLS \u00B7 MUNICH', geistMedium, 3.2, rInner - 0.5, 190, 350, false));

  // Bottom arc text: "DIMENSIONAL INSPECTION"
  paths.push(arcTextToPath('DIMENSIONAL INSPECTION', geistMedium, 2.8, rInner - 0.5, 210, 330, true));

  // Centre "INSPECTED" — Geist Pixel
  paths.push(textToPath('INSPECTED', geistPixel, 4, 0, 1, 'middle'));

  // SN placeholder
  paths.push(textToPath('SN ______', geistMono, 2.2, 0, 4.5, 'middle'));

  // Date placeholder
  paths.push(textToPath('DATE ______ ___', geistMono, 1.8, 0, 7, 'middle'));

  const viewBox = `${-r - 1} ${-r - 1} ${D + 2} ${D + 2}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${D}mm" height="${D}mm">
${paths.join('\n')}
</svg>`;
}

// ---------------------------------------------------------------------------
// Product mark SVG outlining (25 × 10 mm)
// ---------------------------------------------------------------------------

function outlineProductMarkSvg() {
  const paths = [];

  // Border
  paths.push(`<rect x="0" y="0" width="25" height="10" fill="none" stroke="${BRAND_RED}" stroke-width="0.3"/>`);

  // "CALIB.TOOLS · INSPECTED"
  paths.push(textToPath('CALIB.TOOLS \u00B7 INSPECTED', geistMedium, 2.2, 12.5, 4.5, 'middle'));

  // "100% dimensional check · SN ______"
  paths.push(textToPath('100% dimensional check \u00B7 SN ______', geistMono, 1.6, 12.5, 7.5, 'middle'));

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 10" width="25mm" height="10mm">
${paths.join('\n')}
</svg>`;
}

// ---------------------------------------------------------------------------
// Text to SVG path helpers
// ---------------------------------------------------------------------------

function textToPath(text, font, fontSize, x, y, anchor) {
  const unitsPerEm = font.unitsPerEm;
  const scale = fontSize / unitsPerEm;

  // Get glyph outlines
  const glyphs = font.stringToGlyphs(text);
  let totalAdvance = 0;
  for (const g of glyphs) {
    totalAdvance += (g.advanceWidth ?? 0);
  }
  const totalWidth = totalAdvance * scale;

  let startX = x;
  if (anchor === 'middle') startX = x - totalWidth / 2;
  else if (anchor === 'end') startX = x - totalWidth;

  let pathD = '';
  let curX = startX;

  for (const glyph of glyphs) {
    const path = glyph.getPath(curX, y, fontSize);
    const d = path.toSVG();
    // Extract just the d attribute
    const dMatch = d.match(/d="([^"]+)"/);
    if (dMatch) pathD += dMatch[1] + ' ';
    curX += (glyph.advanceWidth ?? 0) * scale;
  }

  return `<path d="${pathD.trim()}" fill="${BRAND_RED}"/>`;
}

function arcTextToPath(text, font, fontSize, radius, startAngleDeg, endAngleDeg, flip) {
  const unitsPerEm = font.unitsPerEm;
  const scale = fontSize / unitsPerEm;
  const chars = text.split('');
  const totalAngle = endAngleDeg - startAngleDeg;
  const step = totalAngle / (chars.length + 1);

  let allPaths = '';

  for (let i = 0; i < chars.length; i++) {
    const angle = startAngleDeg + step * (i + 1);
    const rad = (angle * Math.PI) / 180;
    const cx = radius * Math.cos(rad);
    const cy = radius * Math.sin(rad);

    const glyph = font.charToGlyph(chars[i]);
    const charW = (glyph.advanceWidth ?? 0) * scale;
    const charRotation = flip ? angle + 90 : angle - 90;

    // Get path at origin then transform
    const path = glyph.getPath(0, 0, fontSize);
    const d = path.toSVG();
    const dMatch = d.match(/d="([^"]+)"/);
    if (!dMatch) continue;

    // Apply rotation and translation via SVG transform
    const tx = cx - (charW / 2) * Math.cos((charRotation * Math.PI) / 180);
    const ty = cy - (charW / 2) * Math.sin((charRotation * Math.PI) / 180);

    allPaths += `<path d="${dMatch[1]}" fill="${BRAND_RED}" transform="translate(${tx.toFixed(3)},${ty.toFixed(3)}) rotate(${charRotation.toFixed(2)})"/>`;
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
