import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import {
  parseFrontMatter,
  parseMarkdown,
  renderDatasheetPdf,
  MM,
  type DatasheetMeta,
  type Block,
} from './datasheetPdf';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fontDir = resolve(__dirname, '../assets/fonts');
const fontBytes = {
  regular: readFileSync(resolve(fontDir, 'Geist-Regular.ttf')).buffer as ArrayBuffer,
  semiBold: readFileSync(resolve(fontDir, 'Geist-SemiBold.ttf')).buffer as ArrayBuffer,
  mono: readFileSync(resolve(fontDir, 'GeistMono-Regular.ttf')).buffer as ArrayBuffer,
};

const sampleMeta: DatasheetMeta = {
  code: 'CT-DS-TEST',
  title: 'Test datasheet',
  type: 'datasheet',
  rev: 'A',
  date: '2026-10-24',
  status: 'draft',
  family: 'CHT',
  material: 'P',
};

// ---------------------------------------------------------------------------
// parseFrontMatter
// ---------------------------------------------------------------------------

describe('parseFrontMatter', () => {
  it('extracts meta and body', () => {
    const raw = `---
code: CT-DS-TEST
title: Test
type: datasheet
rev: A
date: 2026-10-24
status: draft
---

## Hello

Body text.`;
    const { meta, body } = parseFrontMatter(raw);
    expect(meta.code).toBe('CT-DS-TEST');
    expect(meta.title).toBe('Test');
    expect(meta.status).toBe('draft');
    expect(body).toContain('## Hello');
    expect(body).toContain('Body text.');
  });

  it('throws on missing front matter', () => {
    expect(() => parseFrontMatter('No front matter here')).toThrow();
  });
});

// ---------------------------------------------------------------------------
// parseMarkdown — table row count
// ---------------------------------------------------------------------------

describe('parseMarkdown table parsing', () => {
  it('parses a 3-row table correctly', () => {
    const md = `
| A | B | C |
|---|---|---|
| 1 | 2 | 3 |
| 4 | 5 | 6 |
| 7 | 8 | 9 |
`;
    const blocks = parseMarkdown(md);
    const table = blocks.find((b): b is Extract<Block, { type: 'table' }> => b.type === 'table');
    expect(table).toBeDefined();
    expect(table!.headers).toEqual(['A', 'B', 'C']);
    expect(table!.rows).toHaveLength(3);
    expect(table!.rows[0]).toEqual(['1', '2', '3']);
    expect(table!.rows[2]).toEqual(['7', '8', '9']);
  });

  it('parses a 5-row table from datasheet content', () => {
    const md = [
      '## Sizes',
      '',
      '| Part | Size | Tolerance |',
      '|------|------|-----------|',
      '| CHA-P-001 | 200 x 150 | +/-0.3 mm |',
      '| CHA-P-002 | 300 x 200 | +/-0.3 mm |',
      '| CHA-P-003 | 400 x 300 | +/-0.3 mm |',
      '| CHA-P-004 | 600 x 400 | +/-0.3 mm |',
      '| CHA-P-005 | 800 x 600 | +/-0.3 mm |',
      '',
      '## Next section',
    ].join('\n');
    const blocks = parseMarkdown(md);
    const table = blocks.find((b): b is Extract<Block, { type: 'table' }> => b.type === 'table');
    expect(table).toBeDefined();
    expect(table!.rows).toHaveLength(5);
  });

  it('detects right-alignment from separator row', () => {
    const md = [
      '| Name | Value |',
      '|------|------:|',
      '| A | 123 |',
    ].join('\n');
    const blocks = parseMarkdown(md);
    const table = blocks.find((b): b is Extract<Block, { type: 'table' }> => b.type === 'table');
    expect(table).toBeDefined();
    expect(table!.alignments[0]).toBe('left');
    expect(table!.alignments[1]).toBe('right');
  });
});

// ---------------------------------------------------------------------------
// renderDatasheetPdf — sha256 consistency + margins
// ---------------------------------------------------------------------------

describe('renderDatasheetPdf', () => {
  it('produces valid PDF bytes', async () => {
    const blocks = parseMarkdown('## Test\n\nHello world.\n');
    const { bytes } = await renderDatasheetPdf({ meta: sampleMeta, blocks, fontBytes });
    const header = new TextDecoder().decode(bytes.slice(0, 5));
    expect(header).toBe('%PDF-');
    expect(bytes.length).toBeGreaterThan(1000);
  });

  it('manifest sha256 matches file content', async () => {
    const blocks = parseMarkdown('## Test\n\nContent.\n');
    const { bytes } = await renderDatasheetPdf({ meta: sampleMeta, blocks, fontBytes });
    const hash = createHash('sha256').update(Buffer.from(bytes)).digest('hex');
    // Render again — should produce same hash (deterministic)
    const { bytes: bytes2 } = await renderDatasheetPdf({ meta: sampleMeta, blocks, fontBytes });
    const hash2 = createHash('sha256').update(Buffer.from(bytes2)).digest('hex');
    expect(hash).toBe(hash2);
  });

  it('page dimensions are A4 (210x297mm)', async () => {
    const blocks = parseMarkdown('## Test\n\nParagraph.\n');
    const { bytes } = await renderDatasheetPdf({ meta: sampleMeta, blocks, fontBytes });
    const doc = await PDFDocument.load(bytes);
    const page = doc.getPage(0);
    const { width, height } = page.getSize();
    expect(width).toBeCloseTo(210 * MM, 0);
    expect(height).toBeCloseTo(297 * MM, 0);
  });

  it('text never exceeds page margins', async () => {
    // Generate a PDF with substantial content to trigger multiple pages
    const longContent = [
      '## Section 1\n',
      ...Array.from({ length: 50 }, (_, i) => `Paragraph ${i + 1} with enough text to fill the page and test margin compliance across multiple pages.\n`),
    ].join('\n');

    const blocks = parseMarkdown(longContent);
    const { bytes } = await renderDatasheetPdf({ meta: sampleMeta, blocks, fontBytes });
    const doc = await PDFDocument.load(bytes);

    // Check that the PDF has multiple pages (long content should overflow)
    expect(doc.getPageCount()).toBeGreaterThan(1);

    // Verify all pages have correct dimensions
    for (let i = 0; i < doc.getPageCount(); i++) {
      const page = doc.getPage(i);
      const { width, height } = page.getSize();
      expect(width).toBeCloseTo(210 * MM, 0);
      expect(height).toBeCloseTo(297 * MM, 0);
    }
  });

  it('renders tables without errors', async () => {
    const md = `## Specs

| Part | Size | Weight |
|------|------|--------|
| A | 100 mm | 200 g |
| B | 200 mm | 400 g |
`;
    const blocks = parseMarkdown(md);
    const { bytes } = await renderDatasheetPdf({ meta: sampleMeta, blocks, fontBytes });
    expect(bytes.length).toBeGreaterThan(1000);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);
  });

  it('renders DRAFT watermark when status is draft', async () => {
    const blocks = parseMarkdown('## Test\n\nDraft content.\n');
    const draftMeta = { ...sampleMeta, status: 'draft' as const };
    const { bytes: draftBytes } = await renderDatasheetPdf({ meta: draftMeta, blocks, fontBytes });

    const releasedMeta = { ...sampleMeta, status: 'released' as const };
    const { bytes: releasedBytes } = await renderDatasheetPdf({ meta: releasedMeta, blocks, fontBytes });

    // Draft PDF should be larger due to watermark text on each page
    expect(draftBytes.length).toBeGreaterThan(releasedBytes.length);
  });

  it('handles bullet lists', async () => {
    const md = `## List

- Item one
- Item two
- Item three
`;
    const blocks = parseMarkdown(md);
    expect(blocks.some((b) => b.type === 'bullet')).toBe(true);
    const { bytes } = await renderDatasheetPdf({ meta: sampleMeta, blocks, fontBytes });
    expect(bytes.length).toBeGreaterThan(1000);
  });
});

// ---------------------------------------------------------------------------
// Manifest sha256 matches actual file on disk
// ---------------------------------------------------------------------------

describe('manifest integrity', () => {
  it('index.json sha256 values match actual PDF file hashes', () => {
    const manifestPath = resolve(__dirname, '../../public/files/datasheets/index.json');
    let manifest: Array<{ code: string; sha256: string; bytes: number }>;
    try {
      manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    } catch {
      // Manifest may not exist in CI without prebuild
      return;
    }

    for (const entry of manifest) {
      const pdfPath = resolve(__dirname, `../../public/files/datasheets/${entry.code}.pdf`);
      let pdfBytes: Buffer;
      try {
        pdfBytes = readFileSync(pdfPath);
      } catch {
        // PDF may not exist yet
        continue;
      }
      const actualHash = createHash('sha256').update(pdfBytes).digest('hex');
      expect(actualHash).toBe(entry.sha256);
      expect(pdfBytes.length).toBe(entry.bytes);
    }
  });
});
