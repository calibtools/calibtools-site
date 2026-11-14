/**
 * Generator pages and their ready-made patterns.
 *
 * Each generator page starts from its own spec (PAGE_SPECS). Its "Ready-made" list in
 * src/content/tools/generator-<page>.md links to the generator with a query; that query on top of
 * the page spec is the pattern. scripts/pattern-pdfs.ts renders each one with the same exportPdf
 * the generator uses and writes it to public/files/patterns/, so a visitor can download the file
 * straight from the list. readyMadePdfs() names the files; the markdown links to exactly those names
 * (held by readyMade.test.ts).
 */
import { GENERATOR_DEFAULT, specFromParams } from './patternLink';
import type { PatternSpec } from './patterns';

export type GeneratorPage = 'aruco' | 'apriltag' | 'charuco' | 'aprilgrid' | 'circles' | 'checkerboard';

export const PAGE_SPECS: Record<GeneratorPage, Partial<PatternSpec>> = {
  apriltag: { type: 'Marker sheet', rows: 1, cols: 1, square: 120, marker: 100, dict: 'DICT_APRILTAG_36h11', aprilFamily: '36h11', borderBits: 1, startId: 0 },
  aruco: { type: 'Marker sheet', rows: 1, cols: 1, square: 120, marker: 100, dict: 'DICT_6X6_250', startId: 0 },
  charuco: { type: 'ChArUco', rows: 7, cols: 10, square: 20, marker: 15, dict: 'DICT_6X6_250' },
  aprilgrid: { type: 'AprilGrid (Kalibr)', rows: 6, cols: 6, square: 20, dict: 'DICT_APRILTAG_36h11' },
  circles: { type: 'Asymmetric circles', rows: 11, cols: 8, square: 18 },
  checkerboard: { type: 'Checkerboard', rows: 7, cols: 10, square: 20 },
};

export const PATTERN_PDF_DIR = '/files/patterns/';

export interface ReadyMade {
  text: string;
  query: string;
  spec: PatternSpec;
  /** Papers the list text promises, in the order the links are shown. */
  papers: string[];
}

/** Papers named in a ready-made line: "one A4 or Letter page", "one A3 page"; marker sheets are A4 and Letter. */
export function papersFor(text: string, spec: PatternSpec): string[] {
  const m = /one ([A-Za-z0-9]+)(?: or ([A-Za-z0-9]+))? page/.exec(text);
  if (m) return m[2] ? [m[1], m[2]] : [m[1]];
  return spec.paper && spec.paper !== 'A4' ? [spec.paper] : ['A4', 'Letter'];
}

/** Ready-made lines of one generator page's markdown. */
export function parseReadyMade(md: string, page: GeneratorPage): ReadyMade[] {
  const re = new RegExp(`^- \\[([^\\]]+)\\]\\(\\/tools\\/generator\\/${page}\\/\\?([^)]+)\\)`, 'gm');
  const base: PatternSpec = { ...GENERATOR_DEFAULT, ...PAGE_SPECS[page] };
  return [...md.matchAll(re)].map((m) => {
    const spec = { ...base, ...specFromParams(new URLSearchParams(m[2])) } as PatternSpec;
    return { text: m[1], query: m[2], spec, papers: papersFor(m[1], spec) };
  });
}

const clean = (s: string) => s.toLowerCase().replace(/^dict_/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** File name of a ready-made pattern on one paper, e.g. charuco-7x10-20mm-6x6-250-a4.pdf. */
export function readyMadeFile(page: GeneratorPage, spec: PatternSpec, paper: string): string {
  let base: string;
  if (spec.type === 'Marker sheet') {
    const n = spec.rows * spec.cols;
    const start = spec.startId ?? 0;
    const family = page === 'apriltag' ? `tag${spec.aprilFamily ?? '36h11'}` : clean(spec.dict);
    base = `${page}-${family}-${n === 1 ? `id-${start}` : `ids-${start}-${start + n - 1}`}-${spec.marker}mm`;
  } else if (spec.type === 'ChArUco') {
    base = `charuco-${spec.rows}x${spec.cols}-${spec.square}mm-${clean(spec.dict)}`;
  } else if (spec.type === 'AprilGrid (Kalibr)') {
    base = `aprilgrid-${spec.rows}x${spec.cols}-${spec.square}mm`;
  } else if (spec.type === 'Asymmetric circles' || spec.type === 'Symmetric circles') {
    base = `${spec.type === 'Asymmetric circles' ? 'asymmetric' : 'symmetric'}-circles-${spec.rows}x${spec.cols}-${spec.square}mm`;
  } else {
    base = `${clean(spec.type)}-${spec.rows}x${spec.cols}-${spec.square}mm`;
  }
  return `${PATTERN_PDF_DIR}${clean(base)}-${clean(paper)}.pdf`;
}

/** The PDF links a ready-made line carries: one per paper. */
export function readyMadePdfs(page: GeneratorPage, r: ReadyMade): { paper: string; href: string }[] {
  return r.papers.map((paper) => ({ paper, href: readyMadeFile(page, { ...r.spec, paper }, paper) }));
}
