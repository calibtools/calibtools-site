/**
 * Generate placeholder assets at build time:
 * 1. public/og/default.svg — OG image with logo wordmark + pattern fragment
 * 2. public/downloads/sample-inspection-report.pdf — one-page placeholder PDF
 *
 * Run as part of prebuild.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve('public');

// --- 1. OG image (SVG, 1200×630) ---

mkdirSync(resolve(ROOT, 'og'), { recursive: true });

// 3×3 checkerboard logo grid
const logoGrid = Array.from({ length: 9 }, (_, i) => {
  const col = i % 3;
  const row = Math.floor(i / 3);
  const fill = i % 2 === 0 ? '#E60012' : '#1A1A1A';
  return `<rect x="${460 + col * 22}" y="${220 + row * 22}" width="18" height="18" rx="2" fill="${fill}"/>`;
}).join('\n    ');

// Pattern fragment — a small checkerboard in the bottom-right
const patternRects = [];
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
  <!-- Logo grid -->
  <g>
    ${logoGrid}
  </g>
  <!-- Wordmark -->
  <text x="540" y="310" font-family="Inter, system-ui, sans-serif" font-size="48" font-weight="800" fill="#1A1A1A">Calib</text>
  <text x="710" y="310" font-family="Inter, system-ui, sans-serif" font-size="48" font-weight="800" fill="#E60012">.Tools</text>
  <!-- Tagline -->
  <text x="600" y="360" font-family="Inter, system-ui, sans-serif" font-size="20" fill="#6B6B6B" text-anchor="middle">Precision calibration targets &amp; free browser tools</text>
  <!-- URL -->
  <text x="600" y="580" font-family="monospace" font-size="16" fill="#9A9A9A" text-anchor="middle">calib.tools</text>
</svg>`;

writeFileSync(resolve(ROOT, 'og/default.svg'), ogSvg);
console.log('[placeholders] Generated public/og/default.svg (1200×630)');

// --- 2. Inspection report PDF ---

// Use dynamic import for pdf-lib (ESM)
const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');

mkdirSync(resolve(ROOT, 'downloads'), { recursive: true });

const doc = await PDFDocument.create();
const page = doc.addPage([595.28, 841.89]); // A4
const helvetica = await doc.embedFont(StandardFonts.Helvetica);
const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
const { width, height } = page.getSize();

// Header
page.drawText('Calib.Tools', {
  x: 50, y: height - 60,
  size: 24, font: helveticaBold, color: rgb(0.9, 0, 0.07),
});
page.drawText('Dimensional Inspection Report', {
  x: 50, y: height - 90,
  size: 16, font: helveticaBold, color: rgb(0.1, 0.1, 0.1),
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
  'Every Calib.Tools calibration target ships with a',
  'dimensional inspection report that includes:',
  '',
  '  • Board dimensions and squareness',
  '  • Feature position accuracy (measured vs. nominal)',
  '  • Surface flatness measurement',
  '  • Visual inspection result',
  '  • Date, inspector, and equipment used',
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
    size: isTitle ? 20 : 12,
    font: isTitle ? helveticaBold : helvetica,
    color: isTitle ? rgb(0.9, 0, 0.07) : rgb(0.29, 0.29, 0.29),
  });
  y -= isTitle ? 30 : 18;
}

// Footer
page.drawText('calib.tools', {
  x: 50, y: 40,
  size: 10, font: helvetica, color: rgb(0.6, 0.6, 0.6),
});
page.drawText('hello@calib.tools', {
  x: width - 150, y: 40,
  size: 10, font: helvetica, color: rgb(0.6, 0.6, 0.6),
});

const pdfBytes = await doc.save();
writeFileSync(resolve(ROOT, 'downloads/sample-inspection-report.pdf'), Buffer.from(pdfBytes));
console.log('[placeholders] Generated public/downloads/sample-inspection-report.pdf');
