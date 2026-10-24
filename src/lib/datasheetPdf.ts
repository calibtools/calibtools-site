/**
 * Datasheet PDF renderer — multi-page A4 documents using pdf-lib + Geist fonts.
 *
 * Takes parsed Markdown (front matter + body) and renders branded datasheets,
 * user manuals, and application notes with headers, footers, tables, and
 * optional DRAFT watermark.
 */
import { PDFDocument, rgb, degrees } from 'pdf-lib';
import type { PDFFont, PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {
  BRAND_RED_RGB,
  BRAND_INK_RGB,
  BRAND_URL,
  BRAND_NAME,
  LOGO_CELLS,
} from './brand';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Conversion factor: millimetres → PDF points. */
export const MM = 72 / 25.4;

const PAGE_W = 210; // A4 width mm
const PAGE_H = 297; // A4 height mm
const MARGIN_TOP = 25;
const MARGIN_BOTTOM = 20;
const MARGIN_LEFT = 20;
const MARGIN_RIGHT = 20;
const CONTENT_W = PAGE_W - MARGIN_LEFT - MARGIN_RIGHT; // 170 mm

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DatasheetMeta {
  code: string;
  title: string;
  type: 'datasheet' | 'manual' | 'note';
  rev: string;
  date: string;
  status: 'draft' | 'released';
  family?: string;
  material?: string;
}

export type Block =
  | { type: 'heading'; level: 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'bullet'; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][]; alignments: ('left' | 'right')[] };

export interface DatasheetPdfOptions {
  meta: DatasheetMeta;
  blocks: Block[];
  fontBytes?: {
    regular: ArrayBuffer;
    semiBold: ArrayBuffer;
    mono: ArrayBuffer;
  };
}

// ---------------------------------------------------------------------------
// Front-matter + Markdown parsing
// ---------------------------------------------------------------------------

/**
 * Extract YAML front matter delimited by `---` and the remaining body.
 * Simple key: value parser — no nested structures needed.
 */
export function parseFrontMatter(raw: string): { meta: DatasheetMeta; body: string } {
  const lines = raw.split('\n');
  if (lines[0]?.trim() !== '---') {
    throw new Error('Missing front matter opening ---');
  }
  let endIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]?.trim() === '---') {
      endIdx = i;
      break;
    }
  }
  if (endIdx === -1) throw new Error('Missing front matter closing ---');

  const kvLines = lines.slice(1, endIdx);
  const obj: Record<string, string> = {};
  for (const l of kvLines) {
    const m = l.match(/^(\w+)\s*:\s*(.+)$/);
    if (m) obj[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }

  const meta: DatasheetMeta = {
    code: obj['code'] ?? '',
    title: obj['title'] ?? '',
    type: (obj['type'] as DatasheetMeta['type']) ?? 'datasheet',
    rev: obj['rev'] ?? 'A',
    date: obj['date'] ?? '',
    status: (obj['status'] as DatasheetMeta['status']) ?? 'draft',
    family: obj['family'],
    material: obj['material'],
  };

  const body = lines.slice(endIdx + 1).join('\n');
  return { meta, body };
}

/**
 * Parse simple Markdown body into Block[].
 *
 * Supported:
 * - `## ` / `### ` headings
 * - `- ` bullet items (consecutive lines → one bullet block)
 * - `| ` table rows (header, separator, body rows)
 * - Everything else → paragraph (consecutive non-empty lines merge)
 * - Empty lines separate blocks
 */
export function parseMarkdown(body: string): Block[] {
  const lines = body.split('\n');
  const blocks: Block[] = [];
  let i = 0;

  const flushParagraph = (buf: string[]) => {
    if (buf.length > 0) {
      blocks.push({ type: 'paragraph', text: buf.join(' ') });
    }
  };

  let paraBuf: string[] = [];

  while (i < lines.length) {
    const line = lines[i];

    // Empty line — flush any accumulated paragraph
    if (line.trim() === '') {
      flushParagraph(paraBuf);
      paraBuf = [];
      i++;
      continue;
    }

    // Heading
    if (line.startsWith('## ') && !line.startsWith('### ')) {
      flushParagraph(paraBuf);
      paraBuf = [];
      blocks.push({ type: 'heading', level: 2, text: line.slice(3).trim() });
      i++;
      continue;
    }
    if (line.startsWith('### ')) {
      flushParagraph(paraBuf);
      paraBuf = [];
      blocks.push({ type: 'heading', level: 3, text: line.slice(4).trim() });
      i++;
      continue;
    }

    // Bullet list
    if (line.startsWith('- ')) {
      flushParagraph(paraBuf);
      paraBuf = [];
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith('- ')) {
        items.push(lines[i].slice(2).trim());
        i++;
      }
      blocks.push({ type: 'bullet', items });
      continue;
    }

    // Table (lines starting with | — includes separator rows like |---|)
    if (line.startsWith('|')) {
      flushParagraph(paraBuf);
      paraBuf = [];
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      blocks.push(parseTable(tableLines));
      continue;
    }

    // Regular text — accumulate into paragraph
    paraBuf.push(line.trim());
    i++;
  }

  flushParagraph(paraBuf);
  return blocks;
}

/** Parse pipe-delimited table lines into a table Block. */
function parseTable(lines: string[]): Block & { type: 'table' } {
  const parseCells = (line: string): string[] =>
    line
      .split('|')
      .slice(1, -1) // drop empty first/last from leading/trailing pipes
      .map(c => c.trim());

  if (lines.length < 2) {
    return { type: 'table', headers: parseCells(lines[0]), rows: [], alignments: [] };
  }

  const headers = parseCells(lines[0]);
  const sepCells = parseCells(lines[1]);

  // Detect explicit alignment from separator row
  const explicitAlignments = sepCells.map((cell): 'left' | 'right' => {
    const trimmed = cell.replace(/\s/g, '');
    if (trimmed.endsWith(':') && !trimmed.startsWith(':')) return 'right';
    return 'left';
  });

  const rows = lines.slice(2).map(parseCells);

  // Auto-right-align columns whose body cells are all numeric-like
  const alignments = explicitAlignments.map((explicit, colIdx) => {
    if (explicit === 'right') return 'right';
    // Check if all body cells in this column are numeric-looking
    const isNumeric = rows.length > 0 && rows.every(row => {
      const cell = (row[colIdx] ?? '').trim();
      if (cell === '') return true; // empty is fine
      return /^[+\-]?[\d.,]+\s*(mm|um|µm|x)?$/.test(cell);
    });
    return isNumeric ? 'right' : 'left';
  });

  return { type: 'table', headers, rows, alignments };
}

// ---------------------------------------------------------------------------
// Text utilities
// ---------------------------------------------------------------------------

/** Word-wrap text to fit within maxWidth (in PDF points). */
function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  if (words.length === 0) return [''];

  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    const w = font.widthOfTextAtSize(test, fontSize);
    if (w > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [''];
}

// ---------------------------------------------------------------------------
// PDF coordinate helpers
// ---------------------------------------------------------------------------

/** Convert mm y (from top) to PDF points y (from bottom). */
function yPt(yMm: number): number {
  return PAGE_H * MM - yMm * MM;
}

/** Convert mm to PDF points. */
function xPt(xMm: number): number {
  return xMm * MM;
}

// ---------------------------------------------------------------------------
// Font loading
// ---------------------------------------------------------------------------

async function loadFontBytes(
  fontBytes: DatasheetPdfOptions['fontBytes'],
): Promise<{ regular: ArrayBuffer; semiBold: ArrayBuffer; mono: ArrayBuffer }> {
  if (fontBytes) return fontBytes;

  const [regular, semiBold, mono] = await Promise.all([
    fetch(new URL('../assets/fonts/Geist-Regular.ttf', import.meta.url)).then(r => r.arrayBuffer()),
    fetch(new URL('../assets/fonts/Geist-SemiBold.ttf', import.meta.url)).then(r => r.arrayBuffer()),
    fetch(new URL('../assets/fonts/GeistMono-Regular.ttf', import.meta.url)).then(r => r.arrayBuffer()),
  ]);
  return { regular, semiBold, mono };
}

// ---------------------------------------------------------------------------
// Main renderer
// ---------------------------------------------------------------------------

/**
 * Render datasheet blocks to a multi-page A4 PDF.
 * Returns raw PDF bytes.
 */
export async function renderDatasheetPdf(opts: DatasheetPdfOptions): Promise<Uint8Array> {
  const { meta, blocks } = opts;
  const doc = await PDFDocument.create({ updateMetadata: false });
  doc.setCreationDate(new Date(0));
  doc.setModificationDate(new Date(0));
  doc.registerFontkit(fontkit);

  const fonts = await loadFontBytes(opts.fontBytes);
  const fontRegular = await doc.embedFont(fonts.regular, { subset: true });
  const fontSemiBold = await doc.embedFont(fonts.semiBold, { subset: true });
  const fontMono = await doc.embedFont(fonts.mono, { subset: true });

  const pages: PDFPage[] = [];
  let currentPage: PDFPage;
  let cursorY = 0; // mm from top of page

  // --- Page management ---

  const addFirstPage = () => {
    currentPage = doc.addPage([PAGE_W * MM, PAGE_H * MM]);
    pages.push(currentPage);
    drawFirstPageHeader(currentPage, meta, fontSemiBold, fontMono);
    cursorY = MARGIN_TOP + 40; // header takes ~40mm
  };

  const addContinuationPage = () => {
    currentPage = doc.addPage([PAGE_W * MM, PAGE_H * MM]);
    pages.push(currentPage);
    drawCompactHeader(currentPage, meta, fontRegular, fontMono);
    cursorY = MARGIN_TOP + 10; // compact header + gap
  };

  const availableY = () => PAGE_H - MARGIN_BOTTOM; // max mm from top before footer area

  const ensureSpace = (neededMm: number) => {
    if (cursorY + neededMm > availableY()) {
      addContinuationPage();
    }
  };

  // Start first page
  addFirstPage();

  // --- Render blocks ---

  for (const block of blocks) {
    switch (block.type) {
      case 'heading': {
        const isH2 = block.level === 2;
        const fontSize = isH2 ? 12 : 10;
        const topMargin = isH2 ? 6 : 4;
        const bottomMargin = isH2 ? 3 : 2;
        const fontSizePt = fontSize;

        ensureSpace(topMargin + bottomMargin + 5);
        cursorY += topMargin;

        currentPage!.drawText(block.text, {
          x: xPt(MARGIN_LEFT),
          y: yPt(cursorY),
          size: fontSizePt,
          font: fontSemiBold,
          color: rgb(BRAND_INK_RGB.r, BRAND_INK_RGB.g, BRAND_INK_RGB.b),
        });

        cursorY += fontSize * 0.36 + bottomMargin; // approx text height in mm + margin
        break;
      }

      case 'paragraph': {
        const fontSize = 9;
        const lineH = 3.5; // mm
        const maxW = CONTENT_W * MM;
        const lines = wrapText(block.text, fontRegular, fontSize, maxW);

        ensureSpace(lines.length * lineH + 2);

        for (const line of lines) {
          currentPage!.drawText(line, {
            x: xPt(MARGIN_LEFT),
            y: yPt(cursorY),
            size: fontSize,
            font: fontRegular,
            color: rgb(BRAND_INK_RGB.r, BRAND_INK_RGB.g, BRAND_INK_RGB.b),
          });
          cursorY += lineH;
        }
        cursorY += 2; // bottom margin
        break;
      }

      case 'bullet': {
        const fontSize = 9;
        const lineH = 3.5;
        const indent = 5; // mm
        const maxW = (CONTENT_W - indent) * MM;
        const itemSpacing = 2;

        // Estimate total height
        let totalH = 0;
        const wrappedItems = block.items.map(item => {
          const lines = wrapText(item, fontRegular, fontSize, maxW);
          totalH += lines.length * lineH + itemSpacing;
          return lines;
        });

        ensureSpace(Math.min(totalH, lineH * 3 + itemSpacing)); // at least fit first few items

        for (const lines of wrappedItems) {
          if (cursorY + lines.length * lineH > availableY()) {
            addContinuationPage();
          }

          // Draw bullet
          currentPage!.drawText('\u2022', {
            x: xPt(MARGIN_LEFT + 1.5),
            y: yPt(cursorY),
            size: fontSize,
            font: fontRegular,
            color: rgb(BRAND_INK_RGB.r, BRAND_INK_RGB.g, BRAND_INK_RGB.b),
          });

          for (const line of lines) {
            currentPage!.drawText(line, {
              x: xPt(MARGIN_LEFT + indent),
              y: yPt(cursorY),
              size: fontSize,
              font: fontRegular,
              color: rgb(BRAND_INK_RGB.r, BRAND_INK_RGB.g, BRAND_INK_RGB.b),
            });
            cursorY += lineH;
          }
          cursorY += itemSpacing;
        }
        break;
      }

      case 'table': {
        renderTable(
          currentPage!,
          block,
          fontSemiBold,
          fontRegular,
          fontMono,
          cursorY,
          (neededMm: number) => {
            if (cursorY + neededMm > availableY()) {
              addContinuationPage();
            }
            return cursorY;
          },
          () => {
            addContinuationPage();
            return cursorY;
          },
          (y: number) => {
            cursorY = y;
            // Keep reference to current page in sync
            currentPage = pages[pages.length - 1];
          },
          () => currentPage,
        );
        break;
      }
    }
  }

  // --- Footers on every page ---
  const totalPages = pages.length;
  for (let i = 0; i < totalPages; i++) {
    drawFooter(pages[i], meta, fontRegular, i + 1, totalPages);
  }

  // --- DRAFT watermark ---
  if (meta.status === 'draft') {
    for (const page of pages) {
      drawDraftWatermark(page, fontSemiBold);
    }
  }

  // --- PDF metadata ---
  const typeLabel = meta.type === 'manual' ? 'User Manual' : meta.type === 'note' ? 'Note' : 'Datasheet';
  doc.setTitle(`${meta.code} ${meta.title} — ${BRAND_NAME} ${typeLabel}`);
  doc.setAuthor(BRAND_NAME);
  doc.setSubject(typeLabel);
  doc.setKeywords([meta.code, meta.type, meta.rev, BRAND_NAME]);
  doc.setProducer(`${BRAND_NAME} pdf-lib`);
  doc.setCreator(BRAND_URL);

  return doc.save();
}

// ---------------------------------------------------------------------------
// Header drawing
// ---------------------------------------------------------------------------

function drawFirstPageHeader(
  page: PDFPage,
  meta: DatasheetMeta,
  fontSemiBold: PDFFont,
  fontMono: PDFFont,
) {
  // Logo mark (3×3 grid)
  const cellSize = 4;
  const gap = 0.6;
  const step = cellSize + gap;
  const logoX = MARGIN_LEFT;
  const logoY = MARGIN_TOP;

  for (const cell of LOGO_CELLS) {
    const cx = logoX + cell.col * step;
    const cy = logoY + cell.row * step;
    const fillRgb = cell.fill === '#E60012' ? BRAND_RED_RGB : BRAND_INK_RGB;
    page.drawRectangle({
      x: xPt(cx),
      y: yPt(cy + cellSize),
      width: cellSize * MM,
      height: cellSize * MM,
      color: rgb(fillRgb.r, fillRgb.g, fillRgb.b),
    });
  }

  // Wordmark next to logo
  const logoWidth = 3 * cellSize + 2 * gap; // ~13.2mm
  const wordmarkX = logoX + logoWidth + 3;
  const wordmarkY = logoY + 5; // vertically centred-ish with logo
  const wordmarkSize = 14;

  const calibW = fontSemiBold.widthOfTextAtSize('Calib', wordmarkSize);
  page.drawText('Calib', {
    x: xPt(wordmarkX),
    y: yPt(wordmarkY),
    size: wordmarkSize,
    font: fontSemiBold,
    color: rgb(BRAND_INK_RGB.r, BRAND_INK_RGB.g, BRAND_INK_RGB.b),
  });
  page.drawText('.Tools', {
    x: xPt(wordmarkX) + calibW,
    y: yPt(wordmarkY),
    size: wordmarkSize,
    font: fontSemiBold,
    color: rgb(BRAND_RED_RGB.r, BRAND_RED_RGB.g, BRAND_RED_RGB.b),
  });

  // Doc code right-aligned
  const codeSize = 9;
  const codeW = fontMono.widthOfTextAtSize(meta.code, codeSize);
  page.drawText(meta.code, {
    x: xPt(PAGE_W - MARGIN_RIGHT) - codeW,
    y: yPt(wordmarkY),
    size: codeSize,
    font: fontMono,
    color: rgb(0.4, 0.4, 0.4),
  });

  // Title below logo
  const titleY = logoY + 3 * step + 4; // below the 3-row logo + gap
  const titleSize = 18;
  page.drawText(meta.title, {
    x: xPt(MARGIN_LEFT),
    y: yPt(titleY),
    size: titleSize,
    font: fontSemiBold,
    color: rgb(BRAND_INK_RGB.r, BRAND_INK_RGB.g, BRAND_INK_RGB.b),
  });

  // Eyebrow line
  const eyebrowY = titleY + 8;
  const eyebrowSize = 8;
  const typeLabel = meta.type === 'manual' ? 'USER MANUAL' : meta.type === 'note' ? 'NOTE' : 'DATASHEET';
  const eyebrowText = `${typeLabel}    Rev ${meta.rev} \u00B7 ${meta.date}`;
  page.drawText(eyebrowText, {
    x: xPt(MARGIN_LEFT),
    y: yPt(eyebrowY),
    size: eyebrowSize,
    font: fontMono,
    color: rgb(0.4, 0.4, 0.4),
  });

  // Horizontal rule
  const ruleY = eyebrowY + 4;
  page.drawRectangle({
    x: xPt(MARGIN_LEFT),
    y: yPt(ruleY),
    width: CONTENT_W * MM,
    height: 0.5 * MM,
    color: rgb(BRAND_RED_RGB.r, BRAND_RED_RGB.g, BRAND_RED_RGB.b),
  });
}

function drawCompactHeader(
  page: PDFPage,
  meta: DatasheetMeta,
  fontRegular: PDFFont,
  fontMono: PDFFont,
) {
  const headerY = MARGIN_TOP + 3;
  const fontSize = 7;

  // Doc code left
  page.drawText(meta.code, {
    x: xPt(MARGIN_LEFT),
    y: yPt(headerY),
    size: fontSize,
    font: fontMono,
    color: rgb(0.4, 0.4, 0.4),
  });

  // Title centre
  const titleW = fontRegular.widthOfTextAtSize(meta.title, fontSize);
  const centreX = (PAGE_W / 2) * MM - titleW / 2;
  page.drawText(meta.title, {
    x: centreX,
    y: yPt(headerY),
    size: fontSize,
    font: fontRegular,
    color: rgb(0.4, 0.4, 0.4),
  });

  // Page number placeholder (right) — filled later in footer pass
  // Grey rule
  const ruleY = headerY + 3;
  page.drawRectangle({
    x: xPt(MARGIN_LEFT),
    y: yPt(ruleY),
    width: CONTENT_W * MM,
    height: 0.3 * MM,
    color: rgb(0.8, 0.8, 0.8),
  });
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

function drawFooter(
  page: PDFPage,
  meta: DatasheetMeta,
  fontRegular: PDFFont,
  pageNum: number,
  totalPages: number,
) {
  const footerY = PAGE_H - MARGIN_BOTTOM + 2; // slightly above bottom margin

  // Grey rule
  page.drawRectangle({
    x: xPt(MARGIN_LEFT),
    y: yPt(footerY - 3),
    width: CONTENT_W * MM,
    height: 0.3 * MM,
    color: rgb(0.8, 0.8, 0.8),
  });

  // Footer text
  const fontSize = 7;
  const text = `${BRAND_NAME} \u00B7 ${BRAND_URL} \u00B7 ${meta.code} \u00B7 page ${pageNum}/${totalPages}`;
  const textW = fontRegular.widthOfTextAtSize(text, fontSize);
  const centreX = (PAGE_W / 2) * MM - textW / 2;
  page.drawText(text, {
    x: centreX,
    y: yPt(footerY),
    size: fontSize,
    font: fontRegular,
    color: rgb(0.5, 0.5, 0.5),
  });

  // Also draw page number in compact header position (for continuation pages, pageNum > 1)
  if (pageNum > 1) {
    const pageText = `${pageNum}/${totalPages}`;
    const pageW = fontRegular.widthOfTextAtSize(pageText, fontSize);
    page.drawText(pageText, {
      x: xPt(PAGE_W - MARGIN_RIGHT) - pageW,
      y: yPt(MARGIN_TOP + 3),
      size: fontSize,
      font: fontRegular,
      color: rgb(0.4, 0.4, 0.4),
    });
  }
}

// ---------------------------------------------------------------------------
// DRAFT watermark
// ---------------------------------------------------------------------------

function drawDraftWatermark(page: PDFPage, fontSemiBold: PDFFont) {
  const size = 60;
  const text = 'DRAFT';
  const textW = fontSemiBold.widthOfTextAtSize(text, size);

  // Centre of page
  const cx = (PAGE_W / 2) * MM;
  const cy = (PAGE_H / 2) * MM;

  page.drawText(text, {
    x: cx - textW / 2,
    y: cy,
    size,
    font: fontSemiBold,
    color: rgb(0.85, 0.85, 0.85),
    opacity: 0.08,
    rotate: degrees(45),
  });
}

// ---------------------------------------------------------------------------
// Table rendering
// ---------------------------------------------------------------------------

/** Check if a cell value looks like a part number (e.g. CT-DS-CHA-P). */
function isPartNumber(text: string): boolean {
  return /^[A-Z]{2,}-[A-Z]/.test(text);
}

function renderTable(
  _initialPage: PDFPage,
  block: Block & { type: 'table' },
  fontSemiBold: PDFFont,
  fontRegular: PDFFont,
  fontMono: PDFFont,
  startCursorY: number,
  ensureSpace: (mm: number) => number,
  newPage: () => number,
  setCursorY: (y: number) => void,
  getCurrentPage: () => PDFPage,
) {
  const { headers, rows, alignments } = block;
  const headerFontSize = 8;
  const bodyFontSize = 8;
  const cellPadX = 2; // mm
  const cellPadY = 1.5; // mm
  const rowH = bodyFontSize * 0.36 + cellPadY * 2; // approx row height in mm
  const ruleThickness = 0.3;

  // --- Compute column widths proportionally ---
  const numCols = headers.length;

  // Measure max content width per column (in PDF points)
  const colMaxWidths = headers.map((h, ci) => {
    let maxW = fontSemiBold.widthOfTextAtSize(h, headerFontSize);
    for (const row of rows) {
      const cell = row[ci] ?? '';
      const f = isPartNumber(cell) ? fontMono : fontRegular;
      const w = f.widthOfTextAtSize(cell, bodyFontSize);
      if (w > maxW) maxW = w;
    }
    return maxW + cellPadX * 2 * MM; // add padding
  });

  // Distribute proportionally across content width
  const totalMeasured = colMaxWidths.reduce((a, b) => a + b, 0);
  const contentWPt = CONTENT_W * MM;
  const colWidths = colMaxWidths.map(w =>
    totalMeasured > 0 ? (w / totalMeasured) * contentWPt : contentWPt / numCols,
  );

  let cursorY = startCursorY;
  let page = getCurrentPage();

  const drawRow = (
    cells: string[],
    font: PDFFont,
    fontSize: number,
    bgColor?: { r: number; g: number; b: number },
    textColor?: { r: number; g: number; b: number },
  ) => {
    const effectiveTextColor = textColor ?? BRAND_INK_RGB;
    let colX = MARGIN_LEFT;

    // Background
    if (bgColor) {
      page.drawRectangle({
        x: xPt(MARGIN_LEFT),
        y: yPt(cursorY + rowH) + 0.5 * MM,
        width: contentWPt,
        height: rowH * MM,
        color: rgb(bgColor.r, bgColor.g, bgColor.b),
      });
    }

    // Cells
    for (let ci = 0; ci < numCols; ci++) {
      const cell = cells[ci] ?? '';
      const colWPt = colWidths[ci];
      const colWMm = colWPt / MM;
      const cellFont = isPartNumber(cell) ? fontMono : font;
      const align = alignments[ci] ?? 'left';

      let textX: number;
      if (align === 'right') {
        const textW = cellFont.widthOfTextAtSize(cell, fontSize);
        textX = xPt(colX + colWMm) - textW - cellPadX * MM;
      } else {
        textX = xPt(colX) + cellPadX * MM;
      }

      page.drawText(cell, {
        x: textX,
        y: yPt(cursorY + cellPadY + fontSize * 0.18),
        size: fontSize,
        font: cellFont,
        color: rgb(effectiveTextColor.r, effectiveTextColor.g, effectiveTextColor.b),
      });

      colX += colWMm;
    }

    // Horizontal rule below
    page.drawRectangle({
      x: xPt(MARGIN_LEFT),
      y: yPt(cursorY + rowH) + 0.5 * MM,
      width: contentWPt,
      height: ruleThickness * MM,
      color: rgb(0.85, 0.85, 0.85),
    });

    cursorY += rowH;
    setCursorY(cursorY);
  };

  // Ensure space for at least header + one row
  ensureSpace(rowH * 2 + 2);
  cursorY = startCursorY;
  page = getCurrentPage();

  // Header row
  const brandTint = { r: 251 / 255, g: 233 / 255, b: 234 / 255 }; // #FBE9EA
  drawRow(headers, fontSemiBold, headerFontSize, brandTint, BRAND_INK_RGB);

  // Body rows
  const altGrey = { r: 245 / 255, g: 245 / 255, b: 245 / 255 }; // #F5F5F5
  for (let ri = 0; ri < rows.length; ri++) {
    if (cursorY + rowH > PAGE_H - MARGIN_BOTTOM) {
      cursorY = newPage();
      page = getCurrentPage();
    }
    const bg = ri % 2 === 1 ? altGrey : undefined;
    drawRow(rows[ri], fontRegular, bodyFontSize, bg);
  }

  cursorY += 2; // bottom margin after table
  setCursorY(cursorY);
}
