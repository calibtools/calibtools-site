/**
 * Validates a part-number registry CSV with src/lib/partNumber.ts.
 *
 *   tsx scripts/check-part-numbers.ts                      # data/part-numbers.csv (public subset)
 *   tsx scripts/check-part-numbers.ts path/to/full.csv     # private full registry (planned items, supply codes)
 *
 * Exits 1 on any error. Prints warnings (soft length limit) and a summary.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse, build, core, CORE_SOFT_LIMIT, MAX_LENGTH } from '../src/lib/partNumber';

export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((x) => x !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

const STATUSES = new Set(['active', 'draft', 'planned', 'paused', 'discontinued', 'reserved']);

export function checkRegistry(rows: Record<string, string>[]) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const seen = new Map<string, number>();
  const seenSupply = new Map<string, number>();
  const seenLegacy = new Map<string, number>();
  rows.forEach((r, i) => {
    const line = i + 2;
    const pn = r.pn;
    const res = parse(pn);
    if (!res.ok) errors.push(`L${line} ${pn}: ${res.errors.join('; ')}`);
    else {
      const rebuilt = build(res.value!);
      if (rebuilt !== pn) errors.push(`L${line} ${pn}: round-trip gives ${rebuilt}`);
      const v = res.value!;
      const opts = r.options ? r.options.split('|') : [];
      const expect = { family: v.family, material: v.material, size: v.size, variant: v.variant, options: v.options.join('|') };
      if (r.family !== expect.family) errors.push(`L${line} ${pn}: family column "${r.family}" ≠ ${expect.family}`);
      if (!['SVC'].includes(v.family) && r.material !== expect.material) errors.push(`L${line} ${pn}: material column "${r.material}" ≠ ${expect.material}`);
      if (!['SVC', 'ACC', 'KIT'].includes(v.family)) {
        if (r.size !== expect.size) errors.push(`L${line} ${pn}: size column "${r.size}" ≠ ${expect.size}`);
        if (r.variant !== expect.variant) errors.push(`L${line} ${pn}: variant column "${r.variant}" ≠ ${expect.variant}`);
        if (opts.join('|') !== expect.options) errors.push(`L${line} ${pn}: options column "${r.options}" ≠ ${expect.options}`);
      }
      if (core(pn).length > CORE_SOFT_LIMIT) warnings.push(`L${line} ${pn}: core ${core(pn).length} > ${CORE_SOFT_LIMIT}`);
    }
    if (!STATUSES.has(r.status)) errors.push(`L${line} ${pn}: bad status "${r.status}"`);
    if (!r.name_en) errors.push(`L${line} ${pn}: missing name_en`);
    if (r.status === 'active' && !r.product_handle) errors.push(`L${line} ${pn}: active item needs product_handle`);
    if (seen.has(pn)) errors.push(`L${line} ${pn}: duplicate of L${seen.get(pn)}`); else seen.set(pn, line);
    if ('supply_code' in r && r.supply_code) {
      if (!/^S[1-9]\d{3}-[A-HJ-NPR-Z]$/.test(r.supply_code)) errors.push(`L${line} ${pn}: bad supply_code "${r.supply_code}"`);
      if (seenSupply.has(r.supply_code)) errors.push(`L${line} ${pn}: supply_code ${r.supply_code} duplicate of L${seenSupply.get(r.supply_code)}`);
      else seenSupply.set(r.supply_code, line);
    }
    if (r.legacy_sku) {
      if (seenLegacy.has(r.legacy_sku)) errors.push(`L${line} ${pn}: legacy_sku ${r.legacy_sku} duplicate`);
      else seenLegacy.set(r.legacy_sku, line);
    }
  });
  const lengths = rows.map((r) => r.pn.length);
  return {
    errors,
    warnings,
    summary: {
      rows: rows.length,
      byStatus: Object.fromEntries([...STATUSES].map((s) => [s, rows.filter((r) => r.status === s).length]).filter(([, n]) => n)),
      minLength: Math.min(...lengths),
      maxLength: Math.max(...lengths),
      meanLength: +(lengths.reduce((a, b) => a + b, 0) / lengths.length).toFixed(1),
      hardLimit: MAX_LENGTH,
    },
  };
}

const isMain = process.argv[1] && /check-part-numbers\.ts$/.test(process.argv[1]);
if (isMain) {
  const file = resolve(process.argv[2] ?? 'data/part-numbers.csv');
  const rows = parseCsv(readFileSync(file, 'utf-8'));
  const { errors, warnings, summary } = checkRegistry(rows);
  for (const w of warnings) console.warn(`[part-numbers] warn  ${w}`);
  for (const e of errors) console.error(`[part-numbers] error ${e}`);
  console.log(`[part-numbers] ${file}: ${JSON.stringify(summary)}`);
  if (errors.length) process.exit(1);
  console.log('[part-numbers] OK');
}
