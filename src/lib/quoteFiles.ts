/**
 * Files attached to the internal quote email, built on the server from the pattern
 * link alone: the board definition (OpenCV JSON), the marker list and a 1:1 PDF.
 * They describe the pattern only. Nothing about the customer goes into them, so
 * they can be passed on to the factory as they are.
 */
import type { PatternSpec } from './patterns';
import { opencvJson } from './exportConfig';
import { charucoMarkers } from './renderCharuco';
import { aprilGridTags } from './renderAprilGrid';
import { patternId } from './patternLink';
import { computeLayout, patternExtent, patternFits, requiredDimensions, wordmarkWidth, type PageLayout } from './pageLayout';
import { exportPdf, type PdfExportOptions } from './exportPdf';

export interface EmailAttachment {
  filename: string;
  /** Base64 */
  content: string;
}

/** "Q-20261111-4K7M_P-R3T7P6": every file of one request starts with this. */
export function fileStem(quoteId: string, spec: PatternSpec): string {
  return `${quoteId}_${patternId(spec)}`;
}

const num = (v: number) => String(Math.round(v * 1000) / 1000);

/** id,row,col,x_mm,y_mm,size_mm for every marker; x and y are the marker's top-left corner from the pattern's top-left corner. Null for patterns without markers. */
export function markerIdsCsv(spec: PatternSpec): string | null {
  const markers =
    spec.type === 'ChArUco' || spec.type === 'ArUco grid' ? charucoMarkers(spec)
    : spec.type === 'AprilGrid (Kalibr)' ? aprilGridTags(spec)
    : null;
  if (!markers) return null;
  const rows = markers.map((m) => [m.id, m.row, m.col, num(m.x), num(m.y), num(m.size)].join(','));
  return ['id,row,col,x_mm,y_mm,size_mm', ...rows].join('\n') + '\n';
}

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** The text files: quick to build, so they go out with the first internal email. */
export function quoteAttachments(spec: PatternSpec, quoteId: string): EmailAttachment[] {
  const stem = fileStem(quoteId, spec);
  const files: EmailAttachment[] = [{ filename: `${stem}_opencv.json`, content: toBase64(opencvJson(spec)) }];
  const csv = markerIdsCsv(spec);
  if (csv) files.push({ filename: `${stem}_marker-ids.csv`, content: toBase64(csv) });
  return files;
}

/** A page just large enough for the pattern at 1:1 with its quiet zone, scale bar and footer. */
export function factoryPage(spec: PatternSpec): { layout: PageLayout } {
  const { bw, bh, qzBasis } = patternExtent(spec);
  let pw = bw + 60;
  let ph = bh + 90;
  for (let i = 0; i < 6 && !patternFits(bw, bh, pw, ph, qzBasis); i++) {
    const { reqW, reqH } = requiredDimensions(bw, bh, qzBasis, wordmarkWidth(pw, ph));
    pw = Math.max(pw, Math.ceil(reqW) + 2);
    ph = Math.max(ph, Math.ceil(reqH) + 2);
  }
  return { layout: computeLayout(spec, pw, ph, pw >= ph ? 'landscape' : 'portrait') };
}

/** 1:1 PDF of the pattern on its own page. Takes a few hundred milliseconds of CPU. */
export async function factoryPdf(spec: PatternSpec, fontBytes: NonNullable<PdfExportOptions['fontBytes']>): Promise<Uint8Array> {
  const { layout } = factoryPage(spec);
  return exportPdf({ spec, pw: layout.pw, ph: layout.ph, fontBytes, layout });
}
