/**
 * Build datasheet PDFs from docs/datasheets/ Markdown files.
 *
 * For each .md file (except README.md), renders an A4 PDF using the
 * datasheetPdf renderer and writes to public/files/datasheets/<code>.pdf.
 *
 * Content-hash caching: unchanged files are not re-rendered. A hash manifest
 * at .datasheet-cache.json tracks source → output hashes.
 *
 * Also produces public/files/datasheets/index.json with metadata for each PDF.
 *
 * Run as part of prebuild: pnpm build triggers this automatically.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { resolve, relative, join } from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = process.cwd();
const DOCS_DIR = resolve(ROOT, 'docs/datasheets');
const OUT_DIR = resolve(ROOT, 'public/files/datasheets');
const CACHE_FILE = resolve(ROOT, '.datasheet-cache.json');

// --- Collect Markdown files ---

function collectMdFiles(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      collectMdFiles(join(dir, entry.name), files);
    } else if (entry.name.endsWith('.md') && entry.name !== 'README.md') {
      files.push(join(dir, entry.name));
    }
  }
  return files;
}

// --- Content hash ---

function sha256(data) {
  return createHash('sha256').update(data).digest('hex');
}

// --- Load cache ---

let cache = {};
try {
  cache = JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
} catch { /* no cache yet */ }

// --- Load fonts once ---

const fontDir = resolve(ROOT, 'src/assets/fonts');
const fontBytes = {
  regular: readFileSync(resolve(fontDir, 'Geist-Regular.ttf')).buffer,
  semiBold: readFileSync(resolve(fontDir, 'Geist-SemiBold.ttf')).buffer,
  mono: readFileSync(resolve(fontDir, 'GeistMono-Regular.ttf')).buffer,
};

// --- Dynamic import of the renderer (TypeScript via tsx) ---
// We import the compiled module. Since this runs via tsx, .ts imports work.

const { parseFrontMatter, parseMarkdown, renderDatasheetPdf } = await import('../src/lib/datasheetPdf.ts');

// --- Process files ---

mkdirSync(OUT_DIR, { recursive: true });

const mdFiles = collectMdFiles(DOCS_DIR);
const manifest = [];
const newCache = {};
let built = 0;
let skipped = 0;

for (const mdPath of mdFiles) {
  const raw = readFileSync(mdPath, 'utf-8');
  const sourceHash = sha256(raw);
  const relPath = relative(DOCS_DIR, mdPath);

  // Parse front matter to get code
  let meta, body;
  try {
    const parsed = parseFrontMatter(raw);
    meta = parsed.meta;
    body = parsed.body;
  } catch (err) {
    console.error(`[build-datasheets] SKIP ${relPath}: ${err.message}`);
    continue;
  }

  const outPath = resolve(OUT_DIR, `${meta.code}.pdf`);

  // Check cache
  if (cache[relPath] === sourceHash && existsSync(outPath)) {
    skipped++;
    // Still add to manifest from existing file
    const pdfBytes = readFileSync(outPath);
    const fileHash = sha256(pdfBytes);
    manifest.push({
      code: meta.code,
      title: meta.title,
      type: meta.type,
      rev: meta.rev,
      date: meta.date,
      status: meta.status,
      family: meta.family || null,
      material: meta.material || null,
      sha256: fileHash,
      bytes: pdfBytes.length,
    });
    newCache[relPath] = sourceHash;
    continue;
  }

  // Render PDF
  const blocks = parseMarkdown(body);
  const pdfBytes = await renderDatasheetPdf({ meta, blocks, fontBytes });

  writeFileSync(outPath, pdfBytes);
  built++;

  const fileHash = sha256(Buffer.from(pdfBytes));
  manifest.push({
    code: meta.code,
    title: meta.title,
    type: meta.type,
    rev: meta.rev,
    date: meta.date,
    status: meta.status,
    family: meta.family || null,
    material: meta.material || null,
    sha256: fileHash,
    bytes: pdfBytes.length,
  });
  newCache[relPath] = sourceHash;
}

// Sort manifest by code
manifest.sort((a, b) => a.code.localeCompare(b.code));

// Write manifest
writeFileSync(
  resolve(OUT_DIR, 'index.json'),
  JSON.stringify(manifest, null, 2),
);

// Write cache
writeFileSync(CACHE_FILE, JSON.stringify(newCache, null, 2));

// Add cache file to .gitignore if not already there
const gitignorePath = resolve(ROOT, '.gitignore');
if (existsSync(gitignorePath)) {
  const gitignore = readFileSync(gitignorePath, 'utf-8');
  if (!gitignore.includes('.datasheet-cache.json')) {
    writeFileSync(gitignorePath, gitignore.trimEnd() + '\n.datasheet-cache.json\n');
  }
}

console.log(`[build-datasheets] ${built} built, ${skipped} cached, ${manifest.length} total. Manifest: public/files/datasheets/index.json`);

// Print per-handle datasheet_url values for metafield CSV import
const datasheets = manifest.filter((e) => e.type === 'datasheet' && e.family && e.material);
if (datasheets.length > 0) {
  console.log('\n[build-datasheets] datasheet_url values for metafield CSV:');
  const HANDLE_MAP = {
    'CHA-P': 'charuco-composite',
    'CHA-C': 'charuco-ceramic',
    'CHT-P': 'checkerboard-composite',
    'CHT-C': 'checkerboard-ceramic',
  };
  for (const ds of datasheets) {
    const key = `${ds.family}-${ds.material}`;
    const handle = HANDLE_MAP[key] || `(unknown: ${key})`;
    console.log(`  ${handle.padEnd(30)} /files/datasheets/${ds.code}.pdf`);
  }
  console.log('');
}
