#!/usr/bin/env node
/**
 * check-image-batch.mjs — check a folder of site pictures before they go on the site.
 *
 *   node scripts/check-image-batch.mjs <folder> [--report]
 *
 * Per picture:
 *   - format is WebP (error)
 *   - aspect ratio fits its kind, from the file name (error if off by more than 1 %)
 *   - pixel size reaches the kind's delivery minimum (warning)
 *   - file size under 400 KB (warning)
 *   - board pattern detected by OpenCV on the final file, when <folder>/expect.json lists it (error)
 *
 * expect.json maps file names to patterns, e.g.
 *   { "01-hero.webp": { "pattern": "charuco", "cols": 11, "rows": 8, "dict": "DICT_5X5_100" },
 *     "04-in-use.webp": { "pattern": "checkerboard", "cols": 11, "rows": 8 } }
 * pattern: checkerboard | charuco | circles | aprilgrid. A board may be partly hidden or seen at an
 * angle, so 80 % of the expected corners / markers / dots / tags must be found, and no marker ID
 * that the board does not have.
 *
 * --report writes 检查结果-<date>.md into the folder. Exit code 1 if any error.
 * Kinds and sizes follow the 2026-11-11 picture brief (§12).
 */
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, basename, resolve, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const KINDS = [
  { kind: 'category', test: (f) => /^category-|^categories\//.test(f), ratio: [3, 2], min: [1500, 1000] },
  { kind: 'product', test: (f) => /(^|\/)0\d-[\w-]+\.\w+$/.test(f), ratio: [3, 2], min: [2304, 1536] },
  { kind: 'application', test: (f) => /^applications\/|^app-/.test(f), ratio: [16, 9], min: [2400, 1350] },
];
export const MAX_BYTES = 400 * 1024;
export const DETECT_SHARE = 0.8;

/** Which kind a picture is, from its path relative to the batch folder (or its file name). */
export function kindOf(relPath) {
  return KINDS.find((k) => k.test(relPath)) ?? null;
}

/** Problems with the size and format of one picture: { errors: [], warnings: [] }. */
export function checkGeometry({ relPath, format, width, height, bytes }) {
  const errors = [];
  const warnings = [];
  if (format !== 'webp') errors.push(`format is ${format}, not WebP`);
  const k = kindOf(relPath);
  if (k) {
    const want = k.ratio[0] / k.ratio[1];
    const got = width / height;
    if (Math.abs(got - want) / want > 0.01) errors.push(`aspect ${width}×${height} is not ${k.ratio.join(':')} (${k.kind})`);
    if (width < k.min[0] || height < k.min[1]) warnings.push(`${width}×${height} is below the ${k.kind} minimum ${k.min.join('×')}`);
  } else {
    warnings.push('kind unknown from the file name: aspect and size not checked');
  }
  if (bytes > MAX_BYTES) warnings.push(`${Math.round(bytes / 1024)} KB is over ${MAX_BYTES / 1024} KB`);
  return { errors, warnings };
}

/** Problems with a detection result from detect-pattern.py. */
export function checkDetection(result) {
  if (result.error) return [`detection: ${result.error}`];
  const errors = [];
  for (const [key, expected] of Object.entries(result.expected)) {
    const found = result.found[key] ?? 0;
    if (found < Math.ceil(expected * DETECT_SHARE)) errors.push(`detected ${found} of ${expected} ${key}`);
  }
  if (result.found.foreignMarkers) errors.push(`${result.found.foreignMarkers} marker IDs the board does not have`);
  return errors;
}

function listPictures(dir, prefix = '') {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const rel = prefix + e.name;
    if (e.isDirectory()) return listPictures(join(dir, e.name), rel + '/');
    return /\.(webp|png|jpe?g|avif)$/i.test(e.name) ? [rel] : [];
  });
}

async function main() {
  const dir = resolve(process.argv[2] ?? '');
  if (!process.argv[2] || !existsSync(dir)) {
    console.error('usage: node scripts/check-image-batch.mjs <folder> [--report]');
    process.exit(2);
  }
  const sharp = (await import('sharp')).default;
  const expectPath = join(dir, 'expect.json');
  const expect = existsSync(expectPath) ? JSON.parse(readFileSync(expectPath, 'utf-8')) : {};
  const detector = join(dirname(fileURLToPath(import.meta.url)), 'detect-pattern.py');

  const rows = [];
  for (const rel of listPictures(dir)) {
    const file = join(dir, rel);
    const meta = await sharp(file).metadata();
    const { errors, warnings } = checkGeometry({
      relPath: `${basename(dir)}/${rel}`, format: meta.format, width: meta.width, height: meta.height, bytes: statSync(file).size,
    });
    let detection = '';
    const exp = expect[rel] ?? expect[basename(rel)];
    if (exp) {
      const args = [detector, file, exp.pattern, String(exp.cols), String(exp.rows), ...(exp.dict ? [exp.dict] : [])];
      const result = JSON.parse(execFileSync('python3', args, { encoding: 'utf-8' }));
      errors.push(...checkDetection(result));
      if (result.found) detection = Object.entries(result.found).filter(([k]) => k !== 'foreignMarkers')
        .map(([k, v]) => `${v}/${result.expected[k]} ${k}`).join(', ');
    }
    rows.push({ rel, size: `${meta.width}×${meta.height}`, kb: Math.round(statSync(file).size / 1024), detection, errors, warnings });
  }

  const bad = rows.filter((r) => r.errors.length);
  for (const r of rows) {
    const mark = r.errors.length ? 'FAIL' : r.warnings.length ? 'warn' : 'ok  ';
    console.log(`${mark} ${r.rel}  ${r.size}  ${r.kb} KB${r.detection ? '  ' + r.detection : ''}`);
    for (const m of [...r.errors, ...r.warnings]) console.log(`     - ${m}`);
  }
  console.log(`\n${rows.length} pictures, ${bad.length} with errors, ${rows.filter((r) => !r.errors.length && r.warnings.length).length} with warnings only`);

  if (process.argv.includes('--report')) {
    const date = new Date().toISOString().slice(0, 10);
    const md = [
      `# 检查结果 ${date}`, '', `${rows.length} 张，${bad.length} 张不过。`, '',
      '| 文件 | 像素 | 大小 | 检出 | 结果 |', '|---|---|---|---|---|',
      ...rows.map((r) => `| ${r.rel} | ${r.size} | ${r.kb} KB | ${r.detection || '—'} | ${
        r.errors.length ? '不过：' + r.errors.join('；') : r.warnings.length ? '提醒：' + r.warnings.join('；') : '过'} |`),
      '',
    ].join('\n');
    writeFileSync(join(dir, `检查结果-${date}.md`), md);
  }
  process.exit(bad.length ? 1 : 0);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
