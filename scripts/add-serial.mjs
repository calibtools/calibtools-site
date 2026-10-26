#!/usr/bin/env node
/**
 * Append a serial record and render its inspection-report PDF.
 *
 * Usage:
 *   tsx scripts/add-serial.mjs <sn> <part_number> <id_range> <date> <initials>
 *
 * Example:
 *   tsx scripts/add-serial.mjs 000311 CT-CHA-C-200150-6X6 "0\u2013101" 2026-10-24 JG
 *
 * Outputs:
 *   - Appends/updates record in data/serials.json
 *   - Renders public/files/reports/CT-IR-<sn>.pdf
 *   - Writes  public/files/reports/CT-CSV-<sn>.csv (if coords exist)
 *   - Updates public/files/manifest.json
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = process.cwd();
const SERIALS_PATH = resolve(ROOT, 'data/serials.json');
const IR_OUT_DIR = resolve(ROOT, 'public/files/reports');
const MANIFEST_PATH = resolve(ROOT, 'public/files/manifest.json');

// ── Parse args ──────────────────────────────────────────────────────

const [,, sn, partNumber, idRange, date, initials] = process.argv;

if (!sn || !partNumber || !idRange || !date || !initials) {
  console.error('Usage: tsx scripts/add-serial.mjs <sn> <part_number> <id_range> <date> <initials>');
  process.exit(1);
}

// ── Import builders (TypeScript via tsx) ─────────────────────────────

const { buildIR, parsePartNumber } = await import('../src/docs/build/ct-ir.ts');
const { buildCSV } = await import('../src/docs/build/ct-csv.ts');

// ── Parse part number for product geometry ──────────────────────────

const geo = parsePartNumber(partNumber);

// ── Load / update serials.json ──────────────────────────────────────

let serials = [];
try {
  serials = JSON.parse(readFileSync(SERIALS_PATH, 'utf-8'));
} catch { /* start fresh */ }

if (serials.some((s) => s.sn === sn)) {
  console.log(`[add-serial] SN ${sn} already exists \u2014 updating.`);
  serials = serials.filter((s) => s.sn !== sn);
}

const record = {
  sn,
  part_number: partNumber,
  id_range: idRange,
  inspected_on: date,
  inspector: initials,
  report_url: `/files/reports/CT-IR-${sn}.pdf`,
};

serials.push(record);
serials.sort((a, b) => a.sn.localeCompare(b.sn));
writeFileSync(SERIALS_PATH, JSON.stringify(serials, null, 2) + '\n');
console.log(`[add-serial] Record saved for SN ${sn}`);

// ── Load measurements ───────────────────────────────────────────────

const measPath = resolve(ROOT, `data/measurements/${sn}.json`);
let measurements = null;
if (existsSync(measPath)) {
  measurements = JSON.parse(readFileSync(measPath, 'utf-8'));
  console.log(`[add-serial] Loaded measurements from ${measPath}`);
}

// ── Load coords ─────────────────────────────────────────────────────

const coordsSnPath = resolve(ROOT, `data/measurements/${sn}_coords.json`);
const sampleCoordsPath = resolve(ROOT, 'data/sample_coords.json');
let coords = null;
if (existsSync(coordsSnPath)) {
  coords = JSON.parse(readFileSync(coordsSnPath, 'utf-8'));
  console.log(`[add-serial] Loaded coords from ${coordsSnPath}`);
} else if (existsSync(sampleCoordsPath)) {
  coords = JSON.parse(readFileSync(sampleCoordsPath, 'utf-8'));
  console.log(`[add-serial] Loaded sample coords`);
}

// ── Build IR data ───────────────────────────────────────────────────

const label_line = `CALIB.TOOLS   ${partNumber}   ${geo.description}   SN ${sn} \u00b7 Rev A`;
const data = {
  sn,
  lot: record.lot ?? '',
  id_range: idRange,
  inspector: initials,
  date,
  label_line,
  ...geo,
};

// ── Render ──────────────────────────────────────────────────────────

mkdirSync(IR_OUT_DIR, { recursive: true });

const outBase = resolve(IR_OUT_DIR, `CT-IR-${sn}`);
const result = await buildIR({ data, measurements, coords, outBase });
console.log(`[add-serial] Report written: CT-IR-${sn}.pdf (${result.pages} pages)`);

// CSV
if (coords) {
  const csvPath = resolve(IR_OUT_DIR, `CT-CSV-${sn}.csv`);
  buildCSV(coords, csvPath);
  console.log(`[add-serial] CSV written: CT-CSV-${sn}.csv`);
}

// ── Update manifest ─────────────────────────────────────────────────

function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

let manifest = { generated: '', inputHash: '', files: [] };
if (existsSync(MANIFEST_PATH)) {
  try {
    manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'));
  } catch { /* start fresh */ }
}

// Remove old entries for this serial
const reportCode = `CT-IR-${sn}`;
const csvCode = `CT-CSV-${sn}`;
manifest.files = manifest.files.filter(
  (f) => f.code !== reportCode && f.code !== csvCode,
);

// Add new entries
const pdfPath = `${outBase}.pdf`;
manifest.files.push({
  code: reportCode,
  path: relative(ROOT, pdfPath),
  sha256: sha256File(pdfPath),
  pages: result.pages,
});

if (coords) {
  const csvPath = resolve(IR_OUT_DIR, `CT-CSV-${sn}.csv`);
  manifest.files.push({
    code: csvCode,
    path: relative(ROOT, csvPath),
    sha256: sha256File(csvPath),
  });
}

manifest.generated = new Date().toISOString();
writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
console.log(`[add-serial] Manifest updated.`);
