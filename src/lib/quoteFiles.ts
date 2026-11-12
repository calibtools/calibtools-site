/**
 * Files attached to the internal quote email, built on the server from the pattern
 * link alone: the board definition (OpenCV JSON) and the marker list. The 1:1 PDF lives in
 * factoryPdf.ts, which is loaded only when it is needed because pdf-lib is large.
 * They describe the pattern only. Nothing about the customer goes into them, so
 * they can be passed on to the factory as they are.
 */
import type { PatternSpec } from './patterns';
import { opencvJson } from './exportConfig';
import { charucoMarkers, gridBoardMarkers } from './renderCharuco';
import { aprilGridTags } from './renderAprilGrid';
import { patternId } from './patternLink';

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
    spec.type === 'ChArUco' ? charucoMarkers(spec)
    : spec.type === 'ArUco grid' ? gridBoardMarkers(spec)
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
