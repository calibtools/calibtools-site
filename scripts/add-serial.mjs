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
 *
 * Optional: place data/measurements/<sn>.json with measurement data:
 *   { rows: [{feature, nominal, measured, deviation, tolerance, result}],
 *     flatness: {measured, tolerance, result},
 *     visual: [{check, result}] }
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

// --- Part number → description / datasheet code ---

const FAMILY_MAP = {
  CHA: 'ChArUco calibration target',
  CHT: 'Checkerboard calibration target',
  APR: 'AprilGrid calibration target',
};

const MATERIAL_MAP = {
  C: 'ceramic',
  P: 'composite',
  G: 'glass',
};

/**
 * Parse a part number like CT-CHA-C-200150-1007 and derive:
 *   family code (CHA), material code (C),
 *   description ("ChArUco calibration target, ceramic"),
 *   datasheet code ("CT-DS-CHA-C").
 */
function parsePartNumber(pn) {
  const parts = pn.split('-');
  // CT-<family>-<material>-<dims...>
  const familyCode = parts[1] ?? '';
  const materialCode = parts[2] ?? '';
  const familyName = FAMILY_MAP[familyCode] ?? familyCode;
  const materialName = MATERIAL_MAP[materialCode] ?? materialCode;
  return {
    familyCode,
    materialCode,
    description: `${familyName}, ${materialName}`,
    datasheetCode: `CT-DS-${familyCode}-${materialCode}`,
  };
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

// --- Load optional measurements ---

const measPath = resolve(ROOT, `data/measurements/${sn}.json`);
let measurements = null;
if (existsSync(measPath)) {
  try {
    measurements = JSON.parse(readFileSync(measPath, 'utf-8'));
    console.log(`[add-serial] Loaded measurements from ${measPath}`);
  } catch (e) {
    console.warn(`[add-serial] Warning: could not parse ${measPath}: ${e.message}`);
  }
}

// --- Build Markdown tables ---

function measurementsTable(meas) {
  const header = '| Feature | Nominal | Measured | Deviation | Tolerance | Result |';
  const sep = '|---|---|---|---|---|---|';
  if (!meas?.rows?.length) {
    return [header, sep, '| — | — | — | — | — | PENDING |'].join('\n');
  }
  const rows = meas.rows.map(r =>
    `| ${r.feature} | ${r.nominal} | ${r.measured} | ${r.deviation} | ${r.tolerance} | ${r.result} |`
  );
  return [header, sep, ...rows].join('\n');
}

function flatnessTable(meas) {
  const header = '| Quantity | Measured | Tolerance | Result |';
  const sep = '|---|---|---|---|';
  if (!meas?.flatness) {
    return [header, sep, '| Flatness (peak-to-valley) | — | — | PENDING |'].join('\n');
  }
  const f = meas.flatness;
  return [header, sep, `| Flatness (peak-to-valley) | ${f.measured} | ${f.tolerance} | ${f.result} |`].join('\n');
}

function visualTable(meas) {
  const header = '| Check | Result |';
  const sep = '|---|---|';
  if (!meas?.visual?.length) {
    return [header, sep,
      '| Print defects (voids, pinholes > 0.2 mm, scratches in pattern area) | — |',
      '| Edge and corner condition | — |',
      '| Edge strip legible, serial matches | — |',
    ].join('\n');
  }
  const rows = meas.visual.map(v => `| ${v.check} | ${v.result} |`);
  return [header, sep, ...rows].join('\n');
}

// --- Fill template ---

mkdirSync(REPORTS_DIR, { recursive: true });

const { parseFrontMatter, parseMarkdown, renderDatasheetPdf } = await import('../src/lib/datasheetPdf.ts');
const { drawStampOnPage } = await import('../src/lib/stamp.ts');

const templatePath = resolve(ROOT, 'docs/datasheets/common/CT-IR-template.md');
const templateRaw = readFileSync(templatePath, 'utf-8');

const parsed = parsePartNumber(partNumber);
const overallResult = measurements?.rows?.length
  ? (measurements.rows.every(r => r.result === 'PASS') &&
     (!measurements.flatness || measurements.flatness.result === 'PASS')
      ? 'PASS' : 'FAIL')
  : 'PENDING';

let filled = templateRaw
  .replace(/\{\{sn\}\}/g, sn)
  .replace(/\{\{part_number\}\}/g, partNumber)
  .replace(/\{\{description\}\}/g, parsed.description)
  .replace(/\{\{datasheet_code\}\}/g, parsed.datasheetCode)
  .replace(/\{\{lot\}\}/g, record.lot ?? '—')
  .replace(/\{\{inspected_on\}\}/g, date)
  .replace(/\{\{inspector\}\}/g, initials)
  .replace(/\{\{id_range\}\}/g, idRange)
  .replace(/\{\{result\}\}/g, overallResult)
  .replace(/\{\{measurements_table\}\}/g, measurementsTable(measurements))
  .replace(/\{\{flatness_table\}\}/g, flatnessTable(measurements))
  .replace(/\{\{visual_table\}\}/g, visualTable(measurements));

const { meta, body } = parseFrontMatter(filled);

const blocks = parseMarkdown(body);

const fontDir = resolve(ROOT, 'src/assets/fonts');
const fontBytes = {
  regular: readFileSync(resolve(fontDir, 'Geist-Regular.ttf')).buffer,
  semiBold: readFileSync(resolve(fontDir, 'Geist-SemiBold.ttf')).buffer,
  mono: readFileSync(resolve(fontDir, 'GeistMono-Regular.ttf')).buffer,
  medium: readFileSync(resolve(fontDir, 'Geist-Medium.otf')).buffer,
  pixel: readFileSync(resolve(fontDir, 'GeistPixel-Square.otf')).buffer,
};

// Load wordmark SVG for PDF header
const wordmarkSvgPath = resolve(ROOT, 'public/brand/wordmark-framed-light.svg');
const wordmarkSvg = existsSync(wordmarkSvgPath) ? readFileSync(wordmarkSvgPath, 'utf-8') : undefined;

const pdfBytes = await renderDatasheetPdf({ meta, blocks, fontBytes, wordmarkSvg });

// To add the stamp, we re-open the PDF and draw on the last page
const { PDFDocument } = await import('pdf-lib');
const pdfDoc = await PDFDocument.load(pdfBytes);

// Embed fonts for stamp
const fontkit = (await import('@pdf-lib/fontkit')).default;
pdfDoc.registerFontkit(fontkit);
const stampFonts = {
  medium: await pdfDoc.embedFont(fontBytes.medium, { subset: true }),
  mono: await pdfDoc.embedFont(fontBytes.mono, { subset: true }),
  pixel: await pdfDoc.embedFont(fontBytes.pixel, { subset: true }),
};

// Draw stamp on last page — overlapping signature line, right of "Signed:"
const pages = pdfDoc.getPages();
const lastPage = pages[pages.length - 1];
drawStampOnPage(lastPage, {
  sn,
  date,
  inspector: initials,
  cx: 155, // mm from left — right of "Signed:" line
  cy: 250, // mm from top — overlapping signature line by 2-3mm
  rotation: -8,
  opacity: 0.9,
}, stampFonts);

const finalBytes = await pdfDoc.save();
const outPath = resolve(REPORTS_DIR, `${sn}.pdf`);
writeFileSync(outPath, finalBytes);
console.log(`[add-serial] Report written: ${outPath}`);
