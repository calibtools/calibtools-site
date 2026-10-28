#!/usr/bin/env node
/**
 * Generate docs/reviews/import-template.xlsx — the review-import Excel template.
 *
 * Usage: node scripts/make-review-template.mjs
 */

import ExcelJS from 'exceljs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'docs', 'reviews', 'import-template.xlsx');

async function main() {
  const wb = new ExcelJS.Workbook();

  // ── Sheet 1: reviews ────────────────────────────────────────────────
  const ws = wb.addWorksheet('reviews');

  const columns = [
    { header: 'product_handle', width: 24 },
    { header: 'rating', width: 8 },
    { header: 'title', width: 30 },
    { header: 'body', width: 60 },
    { header: 'reviewer_name', width: 20 },
    { header: 'reviewer_org', width: 20 },
    { header: 'country', width: 10 },
    { header: 'date', width: 14 },
    { header: 'material_connection', width: 22 },
    { header: 'consent', width: 10 },
    { header: 'note', width: 50 },
  ];

  ws.columns = columns.map((c) => ({ header: c.header, key: c.header, width: c.width }));

  // Bold header row
  ws.getRow(1).font = { bold: true };

  // Example row
  ws.addRow({
    product_handle: 'charuco-composite-a3',
    rating: 5,
    title: 'Excellent flatness',
    body: 'Used this board for a six-camera automotive rig. Corner detection was consistent across all views.',
    reviewer_name: 'Alex Chen',
    reviewer_org: 'Perception Lab, Acme Robotics',
    country: 'US',
    date: '2026-09-15',
    material_connection: 'free_sample',
    consent: 'yes',
    note: 'Sample sent 2026-08-01; written permission received 2026-09-20 via e-mail',
  });

  // Data validation: rating 1-5
  ws.dataValidations.add('B2:B1000', {
    type: 'whole',
    operator: 'between',
    formulae: [1, 5],
    showErrorMessage: true,
    errorTitle: 'Invalid rating',
    error: 'Rating must be an integer from 1 to 5.',
  });

  // Data validation: material_connection (column I)
  ws.dataValidations.add('I2:I1000', {
    type: 'list',
    formulae: ['"none,free_sample,discount,insider"'],
    showErrorMessage: true,
    errorTitle: 'Invalid value',
    error: 'Must be one of: none, free_sample, discount, insider.',
  });

  // Data validation: consent must be "yes" (column J)
  ws.dataValidations.add('J2:J1000', {
    type: 'list',
    formulae: ['"yes"'],
    showErrorMessage: true,
    errorTitle: 'Consent required',
    error: 'Consent must be "yes". Written permission to publish name and text must be on file.',
  });

  // ── Sheet 2: README ─────────────────────────────────────────────────
  const readme = wb.addWorksheet('README');
  readme.getColumn(1).width = 100;

  const rules = [
    '1. The reviewer used this product.',
    '2. Text is published as written.',
    '3. Every review received is imported, good or bad.',
    '4. Mark free sample / discount / insider in material_connection.',
    '5. Keep the permission e-mail on file.',
    '',
    '1. \u8BC4\u8BBA\u8005\u4F7F\u7528\u8FC7\u8BE5\u4EA7\u54C1\u3002',
    '2. \u6587\u672C\u539F\u6837\u53D1\u5E03\u3002',
    '3. \u6536\u5230\u7684\u6BCF\u6761\u8BC4\u8BBA\u90FD\u5BFC\u5165\uFF0C\u597D\u574F\u90FD\u8981\u3002',
    '4. \u5728 material_connection \u4E2D\u6807\u6CE8\u514D\u8D39\u6837\u54C1 / \u6298\u6263 / \u5185\u90E8\u4EBA\u5458\u3002',
    '5. \u4FDD\u7559\u6388\u6743\u90AE\u4EF6\u3002',
  ];

  for (const line of rules) {
    readme.addRow([line]);
  }
  readme.getRow(1).font = { bold: true, size: 14 };

  await wb.xlsx.writeFile(OUT);
  console.log(`Template written to ${OUT}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
