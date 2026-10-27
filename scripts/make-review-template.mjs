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
    { header: 'language', width: 10 },
    { header: 'consent', width: 10 },
    { header: 'material_connection', width: 22 },
    { header: 'source_note', width: 50 },
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
    language: 'en',
    consent: 'yes',
    material_connection: 'free_sample',
    source_note: 'Sample sent 2026-08-01; written permission received 2026-09-20 via e-mail',
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

  // Data validation: consent must be "yes"
  ws.dataValidations.add('J2:J1000', {
    type: 'list',
    formulae: ['"yes"'],
    showErrorMessage: true,
    errorTitle: 'Consent required',
    error: 'Consent must be "yes". Written permission to publish name and text must be on file.',
  });

  // Data validation: material_connection
  ws.dataValidations.add('K2:K1000', {
    type: 'list',
    formulae: ['"none,free_sample,discount,insider"'],
    showErrorMessage: true,
    errorTitle: 'Invalid value',
    error: 'Must be one of: none, free_sample, discount, insider.',
  });

  // ── Sheet 2: README ─────────────────────────────────────────────────
  const readme = wb.addWorksheet('README');
  readme.getColumn(1).width = 100;

  const rules = [
    'REVIEW IMPORT RULES',
    '',
    '=== English ===',
    '',
    '1. The reviewer must have actually used the product listed in product_handle.',
    '   Never reuse a review for a different product.',
    '',
    '2. Every review received is imported, positive or negative.',
    '   Leaving out negative reviews is review suppression and violates FTC guidelines.',
    '',
    '3. No reward may depend on what the review says.',
    '   You may provide a free sample or discount, but the reviewer must be free to write anything.',
    '',
    '4. Free samples, discounts, and any employee/relative/insider relationship',
    '   must be declared in the material_connection column.',
    '   - none: reviewer bought the product independently',
    '   - free_sample: reviewer received a free unit',
    '   - discount: reviewer received a discounted unit',
    '   - insider: reviewer is an employee, contractor, relative, or has another connection to Calib.Tools',
    '',
    '5. The review text (body) is the reviewer\'s own words. Never edit the text.',
    '',
    '6. consent must be "yes" — you must have written permission on file',
    '   (e.g. an e-mail) to publish the reviewer\'s name and text.',
    '',
    '7. source_note is internal only and never published.',
    '   Record where the review came from and the date of the permission e-mail.',
    '',
    '',
    '=== \u4E2D\u6587 ===',
    '',
    '1. \u8BC4\u8BBA\u8005\u5FC5\u987B\u5B9E\u9645\u4F7F\u7528\u8FC7 product_handle \u5217\u4E2D\u6307\u5B9A\u7684\u4EA7\u54C1\u3002',
    '   \u4E0D\u5F97\u5C06\u4E00\u6761\u8BC4\u8BBA\u7528\u4E8E\u53E6\u4E00\u4E2A\u4EA7\u54C1\u3002',
    '',
    '2. \u6536\u5230\u7684\u6BCF\u4E00\u6761\u8BC4\u8BBA\u90FD\u5FC5\u987B\u5BFC\u5165\uFF0C\u65E0\u8BBA\u6B63\u9762\u8FD8\u662F\u8D1F\u9762\u3002',
    '   \u7701\u7565\u8D1F\u9762\u8BC4\u8BBA\u5C5E\u4E8E\u8BC4\u8BBA\u538B\u5236\uFF0C\u8FDD\u53CD FTC \u89C4\u5B9A\u3002',
    '',
    '3. \u4EFB\u4F55\u5956\u52B1\u4E0D\u5F97\u53D6\u51B3\u4E8E\u8BC4\u8BBA\u5185\u5BB9\u3002',
    '   \u53EF\u4EE5\u63D0\u4F9B\u514D\u8D39\u6837\u54C1\u6216\u6298\u6263\uFF0C\u4F46\u8BC4\u8BBA\u8005\u5FC5\u987B\u53EF\u4EE5\u81EA\u7531\u53D1\u8868\u4EFB\u4F55\u5185\u5BB9\u3002',
    '',
    '4. \u514D\u8D39\u6837\u54C1\u3001\u6298\u6263\u4EE5\u53CA\u4EFB\u4F55\u5458\u5DE5/\u4EB2\u5C5E/\u5173\u8054\u65B9\u5173\u7CFB',
    '   \u5FC5\u987B\u5728 material_connection \u5217\u4E2D\u58F0\u660E\u3002',
    '   - none: \u8BC4\u8BBA\u8005\u72EC\u7ACB\u8D2D\u4E70',
    '   - free_sample: \u8BC4\u8BBA\u8005\u6536\u5230\u4E86\u514D\u8D39\u6837\u54C1',
    '   - discount: \u8BC4\u8BBA\u8005\u6536\u5230\u4E86\u6298\u6263',
    '   - insider: \u8BC4\u8BBA\u8005\u662F Calib.Tools \u7684\u5458\u5DE5\u3001\u627F\u5305\u5546\u3001\u4EB2\u5C5E\u6216\u5176\u4ED6\u5173\u8054\u65B9',
    '',
    '5. \u8BC4\u8BBA\u6B63\u6587 (body) \u662F\u8BC4\u8BBA\u8005\u7684\u539F\u8BDD\u3002\u4E0D\u5F97\u7F16\u8F91\u6587\u672C\u3002',
    '',
    '6. consent \u5FC5\u987B\u586B "yes" \u2014\u2014 \u5FC5\u987B\u6709\u4E66\u9762\u8BB8\u53EF\uFF08\u5982\u90AE\u4EF6\uFF09\u5141\u8BB8\u53D1\u5E03\u8BC4\u8BBA\u8005\u59D3\u540D\u548C\u6587\u672C\u3002',
    '',
    '7. source_note \u4EC5\u4F9B\u5185\u90E8\u4F7F\u7528\uFF0C\u4E0D\u4F1A\u516C\u5F00\u53D1\u5E03\u3002',
    '   \u8BB0\u5F55\u8BC4\u8BBA\u6765\u6E90\u4EE5\u53CA\u8BB8\u53EF\u90AE\u4EF6\u7684\u65E5\u671F\u3002',
  ];

  for (const line of rules) {
    readme.addRow([line]);
  }
  readme.getRow(1).font = { bold: true, size: 14 };

  await wb.xlsx.writeFile(OUT);
  console.log(`Template written to ${OUT}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
