#!/usr/bin/env node
/**
 * printer-check-sheet.mjs — generates a one-page A4 PDF for verifying
 * printer scale and margins.
 *
 * Contains:
 *   1. A 100 mm scale bar with tick marks every 10 mm
 *   2. A 10-square strip (alternating black/white, 10 mm each)
 *   3. The wordmark at ISO 3098 3.5 mm cap height
 *   4. Blank boxes to write measured values (scale, margins)
 *
 * Usage: npx tsx scripts/printer-check-sheet.mjs [output.pdf]
 */

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

async function run() {
  const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
  const {
    WORDMARK_PATHS,
    WORDMARK_DOT_RECT,
    WORDMARK_VB,
    BRAND_NAME,
  } = await import('../src/lib/exportBrand.ts');
  const { PAGE_MARGIN, wordmarkWidth, wordmarkClearSpace } = await import('../src/lib/pageLayout.ts');

  const MM = 72 / 25.4;
  const pw = 210, ph = 297; // A4 portrait in mm

  const doc = await PDFDocument.create();
  doc.setTitle('Calib.Tools Printer Check Sheet');
  doc.setAuthor(BRAND_NAME);

  const page = doc.addPage([pw * MM, ph * MM]);
  const pageH = ph * MM;
  const pt = (x, y) => [x * MM, pageH - y * MM];

  // Embed a standard font for labels
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const leftM = PAGE_MARGIN + 5;
  let curY = PAGE_MARGIN + 10;

  // Title
  const titleSize = 14;
  const [tx, ty] = pt(leftM, curY);
  page.drawText('Printer Check Sheet', { x: tx, y: ty, size: titleSize, font: fontBold, color: rgb(0, 0, 0) });
  curY += 8;
  const [sx, sy] = pt(leftM, curY);
  page.drawText(`${BRAND_NAME} — print this page at 100 % scale (no fit-to-page)`, { x: sx, y: sy, size: 8, font, color: rgb(0.3, 0.3, 0.3) });
  curY += 15;

  // 1. Scale bar — 100 mm with tick marks every 10 mm
  const sbX = leftM;
  const sbY = curY;
  const sbLen = 100;
  const sbH = 0.6;
  const tickH = 3;

  // Draw the horizontal bar
  const [bx, by] = pt(sbX, sbY + sbH);
  page.drawRectangle({ x: bx, y: by, width: sbLen * MM, height: sbH * MM, color: rgb(0, 0, 0) });

  // Draw tick marks every 10 mm
  for (let i = 0; i <= 10; i++) {
    const tx = sbX + i * 10;
    const h = i % 5 === 0 ? tickH * 1.5 : tickH;
    const [mx, my] = pt(tx, sbY - h);
    page.drawRectangle({ x: mx, y: my, width: 0.3 * MM, height: h * MM, color: rgb(0, 0, 0) });

    // Label every 10 mm
    if (i % 2 === 0) {
      const [lx, ly] = pt(tx - 1.5, sbY + 4);
      page.drawText(`${i * 10}`, { x: lx, y: ly, size: 6, font, color: rgb(0, 0, 0) });
    }
  }

  const [lbl1x, lbl1y] = pt(sbX + sbLen + 5, sbY + 2);
  page.drawText('mm', { x: lbl1x, y: lbl1y, size: 7, font, color: rgb(0, 0, 0) });

  curY += 20;

  // 2. Ten-square strip — 10 squares of 10 mm each
  const sqSize = 10;
  const stripX = leftM;
  const stripY = curY;

  for (let i = 0; i < 10; i++) {
    const black = i % 2 === 0;
    if (black) {
      const [rx, ry] = pt(stripX + i * sqSize, stripY + sqSize);
      page.drawRectangle({ x: rx, y: ry, width: sqSize * MM, height: sqSize * MM, color: rgb(0, 0, 0) });
    } else {
      // White square with border
      const [rx, ry] = pt(stripX + i * sqSize, stripY + sqSize);
      page.drawRectangle({ x: rx, y: ry, width: sqSize * MM, height: sqSize * MM, borderColor: rgb(0.7, 0.7, 0.7), borderWidth: 0.3 });
    }
  }

  const [lbl2x, lbl2y] = pt(stripX + 10 * sqSize + 5, stripY + sqSize / 2 + 1.5);
  page.drawText('10 squares @ 10 mm', { x: lbl2x, y: lbl2y, size: 7, font, color: rgb(0, 0, 0) });

  curY += sqSize + 15;

  // 3. Wordmark at ISO 3098 3.5 mm cap height
  const wmW = wordmarkWidth(pw, ph);
  const wmH = wmW / (WORDMARK_VB.width / WORDMARK_VB.height);
  const wmX = leftM;
  const wmY = curY;

  // Draw wordmark paths (black fill)
  const scale = wmW / WORDMARK_VB.width;
  for (const d of WORDMARK_PATHS) {
    const [px, py] = pt(wmX, wmY + wmH);
    page.drawSvgPath(d, {
      x: px - WORDMARK_VB.minX * scale * MM,
      y: py + WORDMARK_VB.minY * scale * MM + WORDMARK_VB.height * scale * MM,
      scale: scale * MM,
      color: rgb(0, 0, 0),
    });
  }

  // Red dot
  const [dotX, dotY, dotW, dotH] = WORDMARK_DOT_RECT;
  const [rdx, rdy] = pt(wmX + (dotX - WORDMARK_VB.minX) * scale, wmY + wmH - (dotY - WORDMARK_VB.minY) * scale);
  page.drawRectangle({
    x: rdx, y: rdy - dotH * scale * MM,
    width: dotW * scale * MM, height: dotH * scale * MM,
    color: rgb(0.9019607843137255, 0, 0.07058823529411765),
  });

  const [lbl3x, lbl3y] = pt(wmX + wmW + 5, wmY + wmH / 2 + 1.5);
  page.drawText(`Wordmark at 3.5 mm cap height (${wmW.toFixed(1)} mm wide)`, { x: lbl3x, y: lbl3y, size: 7, font, color: rgb(0, 0, 0) });

  curY += wmH + 20;

  // 4. Measurement boxes
  const boxes = [
    { label: 'Scale bar measured length:', unit: 'mm', note: 'Should be 100.0 mm' },
    { label: 'Printer scale factor:', unit: '', note: '= measured / 100' },
    { label: 'Top margin (paper edge to first print):', unit: 'mm', note: '' },
    { label: 'Bottom margin:', unit: 'mm', note: '' },
    { label: 'Left margin:', unit: 'mm', note: '' },
    { label: 'Right margin:', unit: 'mm', note: '' },
  ];

  for (const box of boxes) {
    const [lx, ly] = pt(leftM, curY + 3);
    page.drawText(box.label, { x: lx, y: ly, size: 8, font, color: rgb(0, 0, 0) });

    // Empty box for writing
    const boxX = leftM + 105;
    const boxW = 30;
    const boxH = 6;
    const [bx, by] = pt(boxX, curY + boxH);
    page.drawRectangle({ x: bx, y: by, width: boxW * MM, height: boxH * MM, borderColor: rgb(0, 0, 0), borderWidth: 0.5 });

    if (box.unit) {
      const [ux, uy] = pt(boxX + boxW + 2, curY + 3);
      page.drawText(box.unit, { x: ux, y: uy, size: 7, font, color: rgb(0, 0, 0) });
    }

    if (box.note) {
      const [nx, ny] = pt(boxX + boxW + 12, curY + 3);
      page.drawText(box.note, { x: nx, y: ny, size: 6, font, color: rgb(0.5, 0.5, 0.5) });
    }

    curY += 10;
  }

  curY += 10;

  // Instructions
  const instructions = [
    'Instructions:',
    '1. Print this page at 100 % scale (do not use fit-to-page or shrink-to-fit).',
    '2. Measure the scale bar with calipers or a ruler.',
    '3. Measure the distance from each paper edge to the nearest printed mark.',
    '4. Record the values in the boxes above.',
    '',
    'If the scale bar measures less than 100.0 mm, your printer is scaling down.',
    'Adjust the printer driver scale or disable automatic scaling.',
  ];

  for (const line of instructions) {
    const [ix, iy] = pt(leftM, curY + 3);
    const isHeader = line === 'Instructions:';
    page.drawText(line, { x: ix, y: iy, size: isHeader ? 9 : 7, font: isHeader ? fontBold : font, color: rgb(0, 0, 0) });
    curY += isHeader ? 6 : 4.5;
  }

  // Margin verification marks — small crosses at PAGE_MARGIN from each edge
  const crossSize = 2;
  const crossW = 0.3;
  const markPositions = [
    [PAGE_MARGIN, PAGE_MARGIN],                    // top-left
    [pw - PAGE_MARGIN, PAGE_MARGIN],               // top-right
    [PAGE_MARGIN, ph - PAGE_MARGIN],               // bottom-left
    [pw - PAGE_MARGIN, ph - PAGE_MARGIN],          // bottom-right
  ];
  for (const [mx, my] of markPositions) {
    // Horizontal line
    const [hx, hy] = pt(mx - crossSize, my + crossW / 2);
    page.drawRectangle({ x: hx, y: hy, width: crossSize * 2 * MM, height: crossW * MM, color: rgb(0, 0, 0) });
    // Vertical line
    const [vx, vy] = pt(mx - crossW / 2, my + crossSize);
    page.drawRectangle({ x: vx, y: vy, width: crossW * MM, height: crossSize * 2 * MM, color: rgb(0, 0, 0) });
  }

  // Save
  const outPath = process.argv[2] || resolve(ROOT, 'docs/audit/2026-10-28-brand-block/printer-check-sheet.pdf');
  const pdfBytes = await doc.save();
  writeFileSync(outPath, pdfBytes);
  console.log(`[printer-check-sheet] Written to ${outPath}`);
}

run().catch(err => {
  console.error('[printer-check-sheet] Error:', err.message);
  process.exit(1);
});
