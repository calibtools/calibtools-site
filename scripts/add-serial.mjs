/**
 * Append a serial record and render its inspection-report PDF with stamp.
 *
 * Usage:
 *   node scripts/add-serial.mjs <sn> <part_number> <id_range> <date> <initials>
 *
 * Example:
 *   node scripts/add-serial.mjs 000311 CT-CHA-C-200150-1007 "0–34" 2026-10-24 JG
 *
 * Outputs:
 *   - Appends record to data/serials.json
 *   - Renders public/files/reports/<sn>.pdf (inspection report with stamp)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const SERIALS_PATH = resolve(ROOT, 'data/serials.json');
const REPORTS_DIR = resolve(ROOT, 'public/files/reports');

// --- Parse args ---

const [,, sn, partNumber, idRange, date, initials] = process.argv;

if (!sn || !partNumber || !idRange || !date || !initials) {
  console.error('Usage: node scripts/add-serial.mjs <sn> <part_number> <id_range> <date> <initials>');
  process.exit(1);
}

// --- Load serials ---

let serials = [];
try {
  serials = JSON.parse(readFileSync(SERIALS_PATH, 'utf-8'));
} catch { /* start fresh */ }

// Check for duplicate
if (serials.some((s) => s.sn === sn)) {
  console.log(`[add-serial] SN ${sn} already exists — updating.`);
  serials = serials.filter((s) => s.sn !== sn);
}

const record = {
  sn,
  part_number: partNumber,
  id_range: idRange,
  inspected_on: date,
  inspector: initials,
  report_url: `/files/reports/${sn}.pdf`,
};

serials.push(record);
serials.sort((a, b) => a.sn.localeCompare(b.sn));

writeFileSync(SERIALS_PATH, JSON.stringify(serials, null, 2) + '\n');
console.log(`[add-serial] Record added for SN ${sn}`);

// --- Render inspection report PDF with stamp ---

mkdirSync(REPORTS_DIR, { recursive: true });

const { parseFrontMatter, parseMarkdown, renderDatasheetPdf } = await import('../src/lib/datasheetPdf.ts');
const { drawStampOnPage } = await import('../src/lib/stamp.ts');

// Load the inspection report template
const templatePath = resolve(ROOT, 'docs/datasheets/common/CT-IR-template.md');
const templateRaw = readFileSync(templatePath, 'utf-8');

// Customise the template for this serial
let customised = templateRaw
  .replace(/CT-IR-template/g, `CT-IR-${sn}`)
  .replace(/Inspection report — Template/g, `Inspection report CT-IR-${sn}`)
  .replace(/26W43-00017/g, sn)
  .replace(/CT-CHA-P-300200-6X6/g, partNumber)
  .replace(/0…34/g, idRange.replace('–', '…'));

// Update front matter code and title for this serial
customised = customised
  .replace(/^code: CT-IR-.*$/m, `code: CT-IR-${sn}`)
  .replace(/^title: .*$/m, `title: Inspection report CT-IR-${sn}`);

const { meta, body } = parseFrontMatter(customised);
meta.status = 'released'; // Reports are released, not drafts

const blocks = parseMarkdown(body);

const fontDir = resolve(ROOT, 'src/assets/fonts');
const fontBytes = {
  regular: readFileSync(resolve(fontDir, 'Geist-Regular.ttf')).buffer,
  semiBold: readFileSync(resolve(fontDir, 'Geist-SemiBold.ttf')).buffer,
  mono: readFileSync(resolve(fontDir, 'GeistMono-Regular.ttf')).buffer,
};

const pdfBytes = await renderDatasheetPdf({ meta, blocks, fontBytes });

// To add the stamp, we re-open the PDF and draw on the last page
const { PDFDocument } = await import('pdf-lib');
const pdfDoc = await PDFDocument.load(pdfBytes);

// Embed fonts for stamp
const fontkit = (await import('@pdf-lib/fontkit')).default;
pdfDoc.registerFontkit(fontkit);
const stampFonts = {
  semiBold: await pdfDoc.embedFont(fontBytes.semiBold, { subset: true }),
  mono: await pdfDoc.embedFont(fontBytes.mono, { subset: true }),
};

// Draw stamp on last page, near bottom-right (next to signature line)
const pages = pdfDoc.getPages();
const lastPage = pages[pages.length - 1];
drawStampOnPage(lastPage, {
  sn,
  date,
  inspector: initials,
  cx: 160, // mm from left
  cy: 255, // mm from top (near signature area)
  rotation: -8,
  opacity: 0.9,
}, stampFonts);

const finalBytes = await pdfDoc.save();
const outPath = resolve(REPORTS_DIR, `${sn}.pdf`);
writeFileSync(outPath, finalBytes);
console.log(`[add-serial] Report written: ${outPath}`);
