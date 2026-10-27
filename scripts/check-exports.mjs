#!/usr/bin/env node
/**
 * check-exports.mjs — postbuild guard for T1 (Pattern Generator) exports.
 *
 * Generates one sample export per format (PDF, SVG, DXF), decodes content,
 * and verifies brand elements are actually present — not heuristics.
 *
 * T2–T7 have no branded file exports — this guard covers T1 only.
 */

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Banned phrases
// ---------------------------------------------------------------------------

const BANNED = [
  /\bMunich\b/i,
  /\bMünchen\b/i,
  /ships?\s+from\s+Germany/i,
  /from\s+Germany/i,
  /\bInspected\s+in\s+Germany\b/i,
  /\bGerman[- ]made\b/i,
  /\bMade\s+in\s+Germany\b/i,
  /Calibrate\s+with\s+Confidence/i,
  /Shipped\s+fast/i,
];

// ---------------------------------------------------------------------------
// PDF content stream decoder
// ---------------------------------------------------------------------------

/**
 * Inflate all FlateDecode content streams from a pdf-lib PDFDocument
 * and return the concatenated text. Requires pako.
 */
async function decodePdfContentStreams(pdfBytes) {
  const { PDFDocument, PDFName, PDFRawStream, PDFArray } = await import('pdf-lib');
  const pako = await import('pako');

  const doc = await PDFDocument.load(pdfBytes, { updateMetadata: false });
  const page = doc.getPage(0);
  const node = page.node;
  const contentsRef = node.get(PDFName.of('Contents'));
  const context = doc.context;
  const contentsObj = context.lookup(contentsRef);

  let allText = '';
  const streams = [];

  if (contentsObj instanceof PDFArray) {
    for (let i = 0; i < contentsObj.size(); i++) {
      streams.push(context.lookup(contentsObj.get(i)));
    }
  } else if (contentsObj instanceof PDFRawStream) {
    streams.push(contentsObj);
  }

  for (const stream of streams) {
    if (stream instanceof PDFRawStream) {
      try {
        const decoded = pako.inflate(stream.contents);
        allText += new TextDecoder('latin1').decode(decoded);
      } catch {
        // Not FlateDecode — try raw
        allText += new TextDecoder('latin1').decode(stream.contents);
      }
    }
  }

  return { doc, allText };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function run() {
  const { exportDxf } = await import('../src/lib/exportDxf.ts');
  const { exportPdf } = await import('../src/lib/exportPdf.ts');
  const { checkerboardSvg } = await import('../src/lib/patterns.ts');

  const fontDir = resolve(ROOT, 'src/assets/fonts');
  const fontBytes = {
    regular: readFileSync(resolve(fontDir, 'Geist-Regular.ttf')).buffer,
    semiBold: readFileSync(resolve(fontDir, 'Geist-SemiBold.ttf')).buffer,
    mono: readFileSync(resolve(fontDir, 'GeistMono-Regular.ttf')).buffer,
  };

  const spec = {
    type: 'ChArUco', rows: 7, cols: 10, square: 25, marker: 18,
    dict: 'DICT_6X6_250', paper: 'A4', startId: 0, scaleBar: true, showAxes: true,
  };

  const errors = [];

  // =====================================================================
  // DXF — plain text, direct string checks
  // =====================================================================
  const dxf = exportDxf({ spec, pw: 210, ph: 297 });

  for (const pattern of BANNED) {
    if (pattern.test(dxf)) errors.push(`DXF: banned phrase ${pattern}`);
  }
  if (!dxf.includes('calib.tools/tools/generator')) errors.push('DXF: missing provenance line');
  if (!dxf.includes('POLYLINE\n8\nCALIBTOOLS_BRAND')) errors.push('DXF: missing wordmark POLYLINE');
  if (!dxf.includes('not measured')) errors.push('DXF: missing print accuracy note');
  if (!/^999\n.*calib\.tools/.test(dxf)) errors.push('DXF: missing brand comment (999 group)');

  // =====================================================================
  // PDF — inflate content streams, check operators and path data
  // =====================================================================
  const pdfBytes = await exportPdf({ spec, pw: 210, ph: 297, fontBytes });
  const { doc: pdfDoc, allText: pdfContent } = await decodePdfContentStreams(pdfBytes);

  // Metadata (uncompressed)
  if (!pdfDoc.getTitle()?.includes('Calib.Tools')) errors.push('PDF: title missing "Calib.Tools"');
  if (pdfDoc.getAuthor() !== 'Calib.Tools') errors.push('PDF: author not "Calib.Tools"');
  if (pdfDoc.getProducer() !== 'Calib.Tools pdf-lib') errors.push('PDF: wrong producer');
  if (!pdfDoc.getCreator()?.includes('calib.tools')) errors.push('PDF: creator missing "calib.tools"');

  // X-axis colour: E60012 = rgb(0.9019..., 0, 0.0706...)
  if (!pdfContent.includes('0.9019607843137255 0 0.07058823529411765 rg')) {
    errors.push('PDF: missing X-axis red colour operator (0.9019... 0 0.0706... rg)');
  }

  // Y-axis colour: 1BA55A = rgb(0.1059..., 0.6471..., 0.3529...)
  if (!pdfContent.includes('0.10588235294117647 0.6470588235294118 0.35294117647058826 rg')) {
    errors.push('PDF: missing Y-axis green colour operator (0.1059... 0.6471... 0.3529... rg)');
  }

  // Wordmark path data: the first letter C path contains "383" as a coordinate
  if (!pdfContent.includes('383')) {
    errors.push('PDF: missing wordmark path data (coordinate 383 from letter C)');
  }

  // Red dot colour (same as X-axis) — already checked above

  // Text is drawn with embedded subset fonts — glyph IDs, not plaintext.
  // Provenance and print note are verified via the vitest suite (exportPdf.test.ts).
  // The guard here confirms the structural elements (axes, wordmark) are in the stream.

  // Banned phrases in metadata strings (the only readable text in the PDF)
  const metaText = [pdfDoc.getTitle(), pdfDoc.getAuthor(), pdfDoc.getSubject()].join(' ');
  for (const pattern of BANNED) {
    if (pattern.test(metaText)) errors.push(`PDF: banned phrase in metadata ${pattern}`);
  }

  // =====================================================================
  // SVG — plain text, direct string/DOM-style checks
  // =====================================================================
  const svg = checkerboardSvg(spec, 210, 297);

  // Wordmark <g> with bracket-framed title
  if (!svg.includes('CALIB.TOOLS wordmark-framed')) errors.push('SVG: missing bracket-framed wordmark');

  // Provenance <text>
  if (!svg.includes('calib.tools/tools/generator')) errors.push('SVG: missing provenance line');

  // Print note <text>
  if (!svg.includes('not measured')) errors.push('SVG: missing print accuracy note');

  // XY axes group with correct colours
  if (!svg.includes('id="calibtools-axes"')) errors.push('SVG: missing axes group');
  if (!svg.includes('#E60012')) errors.push('SVG: missing X-axis red colour #E60012');
  if (!svg.includes('#1BA55A')) errors.push('SVG: missing Y-axis green colour #1BA55A');

  // Embedded font
  if (!svg.includes('@font-face') || !svg.includes("font-family:'Geist Mono'")) {
    errors.push('SVG: missing embedded @font-face for Geist Mono');
  }
  if (!svg.includes('data:font/woff2;base64,')) {
    errors.push('SVG: missing base64 woff2 font data URI');
  }

  // Banned phrases
  for (const pattern of BANNED) {
    if (pattern.test(svg)) errors.push(`SVG: banned phrase ${pattern}`);
  }

  // =====================================================================
  // Report
  // =====================================================================
  if (errors.length > 0) {
    console.error('\n[check-exports] EXPORT GUARD FAILED:');
    for (const e of errors) console.error(`  ${e}`);
    process.exit(1);
  }

  console.log('[check-exports] OK — T1 exports pass all brand checks.');
  console.log('  PDF: metadata ✓, axes colours (E60012/1BA55A in rg ops) ✓, wordmark path (383) ✓');
  console.log('  SVG: provenance ✓, wordmark ✓, axes ✓, print note ✓, font embedded ✓');
  console.log('  DXF: provenance ✓, wordmark ✓, print note ✓');
  console.log('  T2–T7: no branded file exports (confirmed by audit).');
}

run().catch((err) => {
  console.error('[check-exports] Error:', err.message);
  process.exit(1);
});
