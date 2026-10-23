/**
 * Export a test bundle of all file types for verification.
 * Usage: tsx scripts/export-test-bundle.ts
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { checkerboardSvg, type PatternSpec } from '../src/lib/patterns';
import { exportPdf } from '../src/lib/exportPdf';
import { exportDxf } from '../src/lib/exportDxf';
import { kalibrYaml, ros2Yaml, halconDescr, opencvJson } from '../src/lib/exportConfig';
import { buildReadme } from '../src/lib/exportZip';
import { patternSummary } from '../src/lib/brand';

const OUT = resolve('test-output');
mkdirSync(OUT, { recursive: true });

// ChArUco 7×10 25/18mm on 300×200 custom page
const spec: PatternSpec = {
  type: 'ChArUco',
  rows: 7,
  cols: 10,
  square: 25,
  marker: 18,
  dict: 'DICT_6X6_250',
  paper: 'A4',
  startId: 0,
  scaleBar: true,
};
// A3 page — board is 250×175mm, needs room for scale bar + footer
const pw = 297, ph = 420;
const slug = 'charuco-7x10-25mm';

// Load font bytes for Node env
const fontDir = resolve('src/assets/fonts');
const fontBytes = {
  regular: readFileSync(resolve(fontDir, 'Geist-Regular.ttf')).buffer as ArrayBuffer,
  semiBold: readFileSync(resolve(fontDir, 'Geist-SemiBold.ttf')).buffer as ArrayBuffer,
  mono: readFileSync(resolve(fontDir, 'GeistMono-Regular.ttf')).buffer as ArrayBuffer,
};

console.log('Exporting test bundle to test-output/...');

// SVG
const svg = checkerboardSvg(spec, pw, ph);
writeFileSync(resolve(OUT, `${slug}.svg`), svg);
console.log(`  ✓ ${slug}.svg`);

// PDF
const pdfBytes = await exportPdf({ spec, pw, ph, fontBytes });
writeFileSync(resolve(OUT, `${slug}.pdf`), pdfBytes);
console.log(`  ✓ ${slug}.pdf`);

// DXF
const dxf = exportDxf({ spec, pw, ph });
writeFileSync(resolve(OUT, `${slug}.dxf`), dxf);
console.log(`  ✓ ${slug}.dxf`);

// Config files
writeFileSync(resolve(OUT, `${slug}.opencv.json`), opencvJson(spec));
console.log(`  ✓ ${slug}.opencv.json`);

writeFileSync(resolve(OUT, `${slug}.kalibr.yaml`), kalibrYaml(spec));
console.log(`  ✓ ${slug}.kalibr.yaml`);

writeFileSync(resolve(OUT, `${slug}.ros2.yaml`), ros2Yaml(spec));
console.log(`  ✓ ${slug}.ros2.yaml`);

writeFileSync(resolve(OUT, `${slug}.halcon.descr`), halconDescr(spec));
console.log(`  ✓ ${slug}.halcon.descr`);

// README.txt
const summary = patternSummary(spec);
const files = [
  { name: `${slug}.pdf`, desc: 'PDF pattern (1:1 mm scale)' },
  { name: `${slug}.svg`, desc: 'SVG vector pattern' },
  { name: `${slug}.dxf`, desc: 'DXF for CNC/laser fabrication' },
  { name: `${slug}.opencv.json`, desc: 'OpenCV config' },
  { name: `${slug}.kalibr.yaml`, desc: 'Kalibr config' },
  { name: `${slug}.ros2.yaml`, desc: 'ROS 2 camera_calibration config' },
  { name: `${slug}.halcon.descr`, desc: 'HALCON plate description' },
];
writeFileSync(resolve(OUT, 'README.txt'), buildReadme({ summary, files }));
console.log('  ✓ README.txt');

console.log('\nDone. All files in test-output/');
