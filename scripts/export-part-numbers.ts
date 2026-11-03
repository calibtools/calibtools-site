/**
 * Generates downstream files from a part-number registry CSV.
 *
 *   tsx scripts/export-part-numbers.ts shopify [registry.csv]   → handle,legacy_sku,new_sku (for the SKU migration)
 *   tsx scripts/export-part-numbers.ts supplier full.csv        → supply_code,pn,name_en (private; never commit)
 *   tsx scripts/export-part-numbers.ts files [registry.csv]     → pn,config file stems
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseCsv } from './check-part-numbers';
import { fileStem } from '../src/lib/partNumber';

const [mode, file] = process.argv.slice(2);
const rows = parseCsv(readFileSync(resolve(file ?? 'data/part-numbers.csv'), 'utf-8'));
const q = (s: string) => (/[",]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
const out: string[] = [];
if (mode === 'shopify') {
  out.push('handle,legacy_sku,new_sku');
  for (const r of rows) if (r.legacy_sku) out.push([r.product_handle, r.legacy_sku, r.pn].map(q).join(','));
} else if (mode === 'supplier') {
  out.push('supply_code,pn,name_en,status');
  for (const r of rows) if (r.supply_code) out.push([r.supply_code, r.pn, r.name_en, r.status].map(q).join(','));
} else if (mode === 'files') {
  out.push('pn,opencv,kalibr,ros2,halcon,dxf');
  for (const r of rows) if (['CHT', 'CHA', 'APR', 'CIR', 'HAL', 'CBM'].includes(r.family)) {
    const s = fileStem(r.pn);
    out.push([r.pn, `${s}.opencv.json`, `${s}.kalibr.yaml`, `${s}.ros2.yaml`, `${s}.halcon.descr`, `${s}.dxf`].join(','));
  }
} else {
  console.error('mode: shopify | supplier | files');
  process.exit(1);
}
process.stdout.write(out.join('\n') + '\n');
