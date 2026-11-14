/**
 * pattern-pdfs.ts — render every ready-made pattern on the generator pages to a PDF in
 * public/files/patterns/, with the generator's own exportPdf, so the list on each page can link
 * the file directly. Runs in prebuild; the folder is not committed.
 *
 *   tsx scripts/pattern-pdfs.ts
 *
 * Fails if a pattern does not fit on one page of the paper its line names.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exportPdf } from '../src/lib/exportPdf';
import { computeLayout, PAPERS } from '../src/lib/pageLayout';
import { PAGE_SPECS, parseReadyMade, readyMadePdfs, type GeneratorPage } from '../src/lib/readyMade';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'public/files/patterns');
const fontDir = resolve(ROOT, 'src/assets/fonts');
const fontBytes = {
  regular: readFileSync(resolve(fontDir, 'Geist-Regular.ttf')).buffer,
  semiBold: readFileSync(resolve(fontDir, 'Geist-SemiBold.ttf')).buffer,
  mono: readFileSync(resolve(fontDir, 'GeistMono-Regular.ttf')).buffer,
};

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const errors: string[] = [];
let count = 0;
for (const page of Object.keys(PAGE_SPECS) as GeneratorPage[]) {
  const md = readFileSync(resolve(ROOT, `src/content/tools/generator-${page}.md`), 'utf-8');
  for (const r of parseReadyMade(md, page)) {
    for (const { paper, href } of readyMadePdfs(page, r)) {
      const spec = { ...r.spec, paper };
      const [pw, ph] = PAPERS[paper] ?? [0, 0];
      if (!pw) { errors.push(`${page}: unknown paper ${paper} in "${r.text}"`); continue; }
      const layout = computeLayout(spec, pw, ph);
      if (layout.fit !== 'single') { errors.push(`${page}: "${r.text}" does not fit one ${paper} page`); continue; }
      const bytes = await exportPdf({ spec, pw: layout.pw, ph: layout.ph, fontBytes, layout });
      writeFileSync(resolve(ROOT, 'public' + href), bytes);
      count++;
    }
  }
}

if (errors.length) {
  console.error('[pattern-pdfs] FAIL\n  ' + errors.join('\n  '));
  process.exit(1);
}
console.log(`[pattern-pdfs] OK — ${count} PDFs in public/files/patterns/`);
