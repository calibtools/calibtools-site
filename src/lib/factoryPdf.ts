/**
 * 1:1 PDF of a pattern on a page sized to fit it, for the internal quote email.
 * Kept apart from quoteFiles.ts so the quote function loads pdf-lib only when it builds one.
 */
import type { PatternSpec } from './patterns';
import { computeLayout, patternExtent, patternFits, requiredDimensions, wordmarkWidth, type PageLayout } from './pageLayout';
import { exportPdf, type PdfExportOptions } from './exportPdf';

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
