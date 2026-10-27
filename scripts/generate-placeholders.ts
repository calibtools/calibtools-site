/**
 * Generate placeholder assets at build time:
 * 1. public/og/default.svg — OG image with logo wordmark + pattern fragment
 * 2. public/downloads/sample-inspection-report.pdf — one-page placeholder PDF
 * 3. Per-product OG images (SVG → PNG)
 *
 * Run as part of prebuild via tsx.
 */

import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import fontkit from '@pdf-lib/fontkit';
import {
  BRAND_RED,
  BRAND_INK,
  BRAND_URL,
  BRAND_NAME,
  BRAND_EMAIL,
  BRAND_RED_RGB,
  BRAND_INK_RGB,
} from '../src/lib/brand';
import {
  wordmarkSvgGroup,
  WORDMARK_PATHS,
  WORDMARK_FRAME_RECTS as WM_FRAME_RECTS,
  WORDMARK_DOT_RECT as WM_DOT,
  WORDMARK_VB,
} from '../src/lib/exportBrand';

const ROOT = resolve('public');

// --- 1. OG image (SVG, 1200×630) ---

mkdirSync(resolve(ROOT, 'og'), { recursive: true });

// Bracket-framed wordmark for OG image (screen context — 40px tall)
const ogWordmark = wordmarkSvgGroup({ x: 350, y: 240, heightMm: 40 });

// Pattern fragment — a small checkerboard in the bottom-right
const patternRects: string[] = [];
for (let r = 0; r < 6; r++) {
  for (let c = 0; c < 10; c++) {
    if ((r + c) % 2 === 0) {
      patternRects.push(`<rect x="${820 + c * 32}" y="${380 + r * 32}" width="32" height="32" fill="#E6E6E6"/>`);
    }
  }
}

const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#FFFFFF"/>
  <!-- Pattern fragment -->
  <g opacity="0.5">
    ${patternRects.join('\n    ')}
  </g>
  <!-- Wordmark -->
  ${ogWordmark}
  <!-- Tagline -->
  <text x="600" y="360" font-family="'Geist', system-ui, sans-serif" font-size="20" fill="#6B6B6B" text-anchor="middle">Know your target to the micron</text>
  <!-- URL -->
  <text x="600" y="580" font-family="monospace" font-size="16" fill="#9A9A9A" text-anchor="middle">${BRAND_URL}</text>
</svg>`;

writeFileSync(resolve(ROOT, 'og/default.svg'), ogSvg);
console.log('[placeholders] Generated public/og/default.svg (1200×630)');

// Render SVG → PNG for social crawlers
const resvg = new Resvg(ogSvg, { fitTo: { mode: 'width', value: 1200 } });
const pngData = resvg.render();
writeFileSync(resolve(ROOT, 'og/default.png'), pngData.asPng());
console.log('[placeholders] Generated public/og/default.png (1200×630)');

// --- 2. Inspection report PDF ---

const { PDFDocument, rgb } = await import('pdf-lib');

mkdirSync(resolve(ROOT, 'downloads'), { recursive: true });

// Load Geist fonts
const geistRegular = readFileSync(resolve('src/assets/fonts/Geist-Regular.ttf'));
const geistSemiBold = readFileSync(resolve('src/assets/fonts/Geist-SemiBold.ttf'));
const geistMono = readFileSync(resolve('src/assets/fonts/GeistMono-Regular.ttf'));

const doc = await PDFDocument.create();
doc.registerFontkit(fontkit);
const fontRegular = await doc.embedFont(geistRegular, { subset: true });
const fontSemiBold = await doc.embedFont(geistSemiBold, { subset: true });
const fontMono = await doc.embedFont(geistMono, { subset: true });

const page = doc.addPage([595.28, 841.89]); // A4
const { width, height } = page.getSize();

// --- Page header ---

// Left: Bracket-framed wordmark (PDF drawSvgPath)
{
  const wmH = 16; // 16 pt tall wordmark
  const wmScale = wmH / WORDMARK_VB.height;
  const pdfX = 50 - WORDMARK_VB.minX * wmScale;
  const pdfY = height - 42 + WORDMARK_VB.minY * wmScale;
  for (const d of WORDMARK_PATHS) {
    page.drawSvgPath(d, {
      x: pdfX, y: pdfY, scale: wmScale,
      color: rgb(BRAND_INK_RGB.r, BRAND_INK_RGB.g, BRAND_INK_RGB.b),
    });
  }
  for (const [rx, ry, rw, rh] of WM_FRAME_RECTS) {
    page.drawRectangle({
      x: pdfX + rx * wmScale, y: pdfY - (ry + rh) * wmScale,
      width: rw * wmScale, height: rh * wmScale,
      color: rgb(BRAND_INK_RGB.r, BRAND_INK_RGB.g, BRAND_INK_RGB.b),
    });
  }
  const [dx, dy, dw, dh] = WM_DOT;
  page.drawRectangle({
    x: pdfX + dx * wmScale, y: pdfY - (dy + dh) * wmScale,
    width: dw * wmScale, height: dh * wmScale,
    color: rgb(BRAND_RED_RGB.r, BRAND_RED_RGB.g, BRAND_RED_RGB.b),
  });
}

// Right: DOC-001 + Rev A in Geist Mono
const docIdText = 'DOC-001';
const revText = 'Rev A';
const docIdWidth = fontMono.widthOfTextAtSize(docIdText, 9);
const revWidth = fontMono.widthOfTextAtSize(revText, 9);
page.drawText(docIdText, {
  x: width - 50 - docIdWidth, y: height - 45,
  size: 9, font: fontMono,
  color: rgb(0.4, 0.4, 0.4),
});
page.drawText(revText, {
  x: width - 50 - revWidth, y: height - 57,
  size: 9, font: fontMono,
  color: rgb(0.4, 0.4, 0.4),
});

// Title
page.drawText('Dimensional Inspection Report', {
  x: 50, y: height - 90,
  size: 16, font: fontSemiBold,
  color: rgb(BRAND_INK_RGB.r, BRAND_INK_RGB.g, BRAND_INK_RGB.b),
});

// Divider
page.drawLine({
  start: { x: 50, y: height - 105 },
  end: { x: width - 50, y: height - 105 },
  thickness: 1, color: rgb(0.9, 0.9, 0.9),
});

// Placeholder notice
const notice = [
  'PLACEHOLDER',
  '',
  'This is a sample inspection report placeholder.',
  'The real sample will follow once production begins.',
  '',
  `Every ${BRAND_NAME} calibration target ships with a`,
  'dimensional inspection report that includes:',
  '',
  '  \u2022 Board dimensions and squareness',
  '  \u2022 Feature position accuracy (measured vs. nominal)',
  '  \u2022 Surface flatness measurement',
  '  \u2022 Visual inspection result',
  '  \u2022 Date, inspector, and equipment used',
  '',
  'For ILAC-recognised calibration with traceable',
  'measurement uncertainty, add the calibration',
  'certificate option when ordering.',
];

let y = height - 160;
for (const line of notice) {
  const isTitle = line === 'PLACEHOLDER';
  page.drawText(line, {
    x: 50, y,
    size: isTitle ? 20 : 9.5,
    font: isTitle ? fontSemiBold : fontRegular,
    color: isTitle
      ? rgb(BRAND_RED_RGB.r, BRAND_RED_RGB.g, BRAND_RED_RGB.b)
      : rgb(0.29, 0.29, 0.29),
  });
  y -= isTitle ? 30 : 18;
}

// --- Page footer ---
const footerText = `${BRAND_URL} \u00B7 ${BRAND_EMAIL} \u00B7 page 1/1`;
const footerWidth = fontRegular.widthOfTextAtSize(footerText, 9);
page.drawText(footerText, {
  x: (width - footerWidth) / 2, y: 40,
  size: 9, font: fontRegular,
  color: rgb(0.6, 0.6, 0.6),
});

// Fix metadata dates to make builds deterministic (no Date.now() variance)
const FIXED_DATE = new Date('2026-01-01T00:00:00Z');
doc.setCreationDate(FIXED_DATE);
doc.setModificationDate(FIXED_DATE);

const pdfBytes = await doc.save();

// Zero out the two random-ID hex strings that pdf-lib writes into the trailer.
// They appear as /ID [<hex> <hex>] and change on every save.
let pdfStr = Buffer.from(pdfBytes).toString('latin1');
pdfStr = pdfStr.replace(
  /\/ID\s*\[\s*<[0-9A-Fa-f]+>\s*<[0-9A-Fa-f]+>\s*\]/,
  '/ID [<00000000000000000000000000000000> <00000000000000000000000000000000>]',
);
writeFileSync(resolve(ROOT, 'downloads/sample-inspection-report.pdf'), Buffer.from(pdfStr, 'latin1'));
console.log('[placeholders] Generated public/downloads/sample-inspection-report.pdf');

// --- 3. Per-product OG images ---

const productHandles = [
  { handle: 'checkerboard-composite', title: 'Checkerboard calibration target' },
  { handle: 'charuco-composite', title: 'ChArUco calibration target' },
  { handle: 'charuco-ceramic', title: 'ChArUco ceramic target' },
  { handle: 'mounting-fixture', title: 'Mounting fixture' },
  { handle: 'certificate-ilac', title: 'Calibration certificate' },
];

for (const { handle, title } of productHandles) {
  const outPath = resolve(ROOT, `og/${handle}.png`);
  const productOgSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#FFFFFF"/>
  <g opacity="0.5">
    ${patternRects.join('\n    ')}
  </g>
  ${ogWordmark}
  <text x="600" y="340" font-family="'Geist', system-ui, sans-serif" font-size="28" font-weight="700" fill="${BRAND_INK}" text-anchor="middle">${title.replace(/&/g, '&amp;')}</text>
  <text x="600" y="380" font-family="'Geist', system-ui, sans-serif" font-size="18" fill="#6B6B6B" text-anchor="middle">Precision calibration target</text>
  <text x="600" y="580" font-family="monospace" font-size="16" fill="#9A9A9A" text-anchor="middle">${BRAND_URL}</text>
</svg>`;
  const productResvg = new Resvg(productOgSvg, { fitTo: { mode: 'width', value: 1200 } });
  writeFileSync(outPath, productResvg.render().asPng());
  console.log(`[placeholders] Generated public/og/${handle}.png`);
}
