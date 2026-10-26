#!/usr/bin/env node
/**
 * Build all customer document PDFs.
 * Renders datasheets and serial reports, writes manifest.json.
 *
 * Usage: pnpm docs:build [--sample]
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = process.cwd();
const MANIFEST_PATH = resolve(ROOT, 'public/files/manifest.json');
const DS_OUT_DIR = resolve(ROOT, 'public/files/datasheets');
const IR_OUT_DIR = resolve(ROOT, 'public/files/reports');

const sample = process.argv.includes('--sample');
const watermark = sample ? 'SAMPLE' : undefined;

// ── Input hash ──────────────────────────────────────────────────────

/** Collect all files matching glob-like patterns, sorted by path. */
function collectSourceFiles() {
  const patterns = [
    { dir: 'src/docs', ext: '.ts' },
    { dir: 'docs/datasheets', ext: '.md' },
    { dir: 'data', file: 'serials.json' },
    { dir: 'data/measurements', ext: '.json' },
    { dir: 'data', file: 'sample_coords.json' },
    { dir: 'src/lib', file: 'reportConfig.ts' },
    { dir: 'src/lib', file: 'claims.ts' },
  ];
  const files = [];
  for (const pat of patterns) {
    const base = resolve(ROOT, pat.dir);
    if (!existsSync(base)) continue;
    if (pat.file) {
      const fp = resolve(base, pat.file);
      if (existsSync(fp)) files.push(fp);
    } else {
      walkDir(base, pat.ext, files);
    }
  }
  return files.sort();
}

function walkDir(dir, ext, out) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fp = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fp, ext, out);
    } else if (!ext || entry.name.endsWith(ext)) {
      out.push(fp);
    }
  }
}

function computeInputHash() {
  const files = collectSourceFiles();
  const h = createHash('sha256');
  for (const f of files) {
    h.update(relative(ROOT, f));
    h.update(readFileSync(f));
  }
  return h.digest('hex');
}

function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log('[docs:build] Starting...');
  if (watermark) console.log('[docs:build] Watermark:', watermark);

  mkdirSync(DS_OUT_DIR, { recursive: true });
  mkdirSync(IR_OUT_DIR, { recursive: true });

  const inputHash = computeInputHash();
  console.log(`[docs:build] Input hash: ${inputHash.slice(0, 12)}...`);

  const manifestFiles = [];

  // ── 1. Datasheets ─────────────────────────────────────────────────

  const DS_CODES = [
    'CT-DS-CHA-C',
    'CT-DS-CHA-P',
    'CT-DS-CHT-P',
    'CT-DS-ACC-A-FIX-14',
    'CT-SV-CERT-ILAC',
  ];

  const { buildDS } = await import('../src/docs/build/ct-ds.ts');

  for (const code of DS_CODES) {
    const outBase = resolve(DS_OUT_DIR, code);
    console.log(`[docs:build] DS: ${code}`);
    try {
      const result = await buildDS({ code, outBase, watermark });
      const pdfPath = `${outBase}.pdf`;
      manifestFiles.push({
        code,
        path: relative(ROOT, pdfPath),
        sha256: sha256File(pdfPath),
        pages: result.pages,
      });
      console.log(`  -> ${result.pages} pages`);
    } catch (err) {
      console.error(`  ERROR: ${err.message}`);
      process.exit(1);
    }
  }

  // ── 2. Inspection reports + CSVs ──────────────────────────────────

  const serialsPath = resolve(ROOT, 'data/serials.json');
  if (!existsSync(serialsPath)) {
    console.log('[docs:build] No data/serials.json — skipping reports.');
  } else {
    const serials = JSON.parse(readFileSync(serialsPath, 'utf-8'));
    const { buildIR, parsePartNumber } = await import('../src/docs/build/ct-ir.ts');
    const { buildCSV } = await import('../src/docs/build/ct-csv.ts');

    for (const rec of serials) {
      const sn = rec.sn;
      const reportCode = `CT-IR-${sn}`;
      console.log(`[docs:build] IR: ${reportCode}`);

      // Parse product geometry from part number
      const geo = parsePartNumber(rec.part_number);

      // Build IRData
      const label_line = `CALIB.TOOLS   ${rec.part_number}   ${geo.description}   SN ${sn} \u00b7 Rev A`;
      const data = {
        sn,
        lot: rec.lot ?? '',
        id_range: rec.id_range,
        inspector: rec.inspector,
        date: rec.inspected_on,
        label_line,
        ...geo,
      };

      // Load measurements
      const measPath = resolve(ROOT, `data/measurements/${sn}.json`);
      let measurements = null;
      if (existsSync(measPath)) {
        measurements = JSON.parse(readFileSync(measPath, 'utf-8'));
      }

      // Load coords
      const coordsSnPath = resolve(ROOT, `data/measurements/${sn}_coords.json`);
      const sampleCoordsPath = resolve(ROOT, 'data/sample_coords.json');
      let coords = null;
      if (existsSync(coordsSnPath)) {
        coords = JSON.parse(readFileSync(coordsSnPath, 'utf-8'));
      } else if (existsSync(sampleCoordsPath)) {
        coords = JSON.parse(readFileSync(sampleCoordsPath, 'utf-8'));
      }

      const outBase = resolve(IR_OUT_DIR, reportCode);
      try {
        const result = await buildIR({ data, measurements, coords, outBase, watermark });
        const pdfPath = `${outBase}.pdf`;
        manifestFiles.push({
          code: reportCode,
          path: relative(ROOT, pdfPath),
          sha256: sha256File(pdfPath),
          pages: result.pages,
        });
        console.log(`  -> ${result.pages} pages`);
      } catch (err) {
        console.error(`  ERROR: ${err.message}`);
        process.exit(1);
      }

      // CSV
      if (coords) {
        const csvPath = resolve(IR_OUT_DIR, `CT-CSV-${sn}.csv`);
        buildCSV(coords, csvPath);
        manifestFiles.push({
          code: `CT-CSV-${sn}`,
          path: relative(ROOT, csvPath),
          sha256: sha256File(csvPath),
        });
        console.log(`  -> CSV: CT-CSV-${sn}.csv`);
      }
    }
  }

  // ── 3. Write manifest ─────────────────────────────────────────────

  const manifest = {
    generated: new Date().toISOString(),
    inputHash,
    files: manifestFiles,
  };

  mkdirSync(resolve(ROOT, 'public/files'), { recursive: true });
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`\n[docs:build] Done. ${manifestFiles.length} files. Manifest: public/files/manifest.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
