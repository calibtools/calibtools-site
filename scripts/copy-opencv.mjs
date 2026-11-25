/**
 * Copies OpenCV.js from node_modules to public/vendor/, so the detection check loads it from calib.tools itself.
 * Nothing is fetched from another host at run time (CLAUDE.md: tools run in the browser, no third-party script).
 * The file is 11 MB, so it stays out of the repo; public/vendor/ is in .gitignore and written here in prebuild.
 * The name carries the version: a new version is a new URL, and src/lib/opencv.ts reads the same constant.
 */
import { copyFileSync, mkdirSync, statSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const pkgPath = require.resolve('@techstark/opencv-js/package.json');
const version = JSON.parse(readFileSync(pkgPath, 'utf8')).version.replace(/-release\.\d+$/, '');
const want = /OPENCV_VERSION = '([^']+)'/.exec(readFileSync(join(root, 'src/lib/opencv.ts'), 'utf8'))?.[1];
if (version !== want) {
  console.error(`copy-opencv: package is ${version}, src/lib/opencv.ts expects ${want}. Change them together.`);
  process.exit(1);
}
const src = join(dirname(pkgPath), 'dist/opencv.js');
const dir = join(root, 'public/vendor');
mkdirSync(dir, { recursive: true });
const out = join(dir, `opencv-${version}.js`);
copyFileSync(src, out);
console.log(`copy-opencv: public/vendor/opencv-${version}.js (${(statSync(out).size / 1048576).toFixed(1)} MB)`);
