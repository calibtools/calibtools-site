/**
 * PRICE-1 · Pricing rule engine
 *
 * Pure functions: preciseRound, computePriceEur, convertToUsd, checkMonotonicity.
 * Run `node scripts/pricing.mjs` to regenerate the ladder and CSV.
 */

// ECB EUR/USD reference rate, 2026-10-28
export const ECB_EURUSD = 1.1133;

// --- Good-digit set: last digit must be one of 1,2,3,4,6,7,8 -----------

const GOOD_DIGITS = new Set([1, 2, 3, 4, 6, 7, 8]);

function isGoodDigit(n) {
  return GOOD_DIGITS.has(((n % 10) + 10) % 10);
}

/**
 * Round to nearest integer, then if the last digit is 0, 5, or 9 (or
 * divisible by 10), nudge ±1–3 to the nearest value whose last digit
 * is in {1,2,3,4,6,7,8}, staying inside [floor, ceil].
 */
export function preciseRound(raw, floor, ceil) {
  const n = Math.round(raw);
  if (isGoodDigit(n) && n >= floor && n <= ceil) return n;

  for (let offset = 1; offset <= 3; offset++) {
    const candidates = [n - offset, n + offset]
      .filter(c => isGoodDigit(c) && c >= floor && c <= ceil);
    if (candidates.length === 1) return candidates[0];
    if (candidates.length === 2) {
      // pick the one closer to the un-rounded value
      return Math.abs(candidates[0] - raw) <= Math.abs(candidates[1] - raw)
        ? candidates[0]
        : candidates[1];
    }
  }
  return n; // fallback (should not happen for realistic inputs)
}

/**
 * Compute proposed EUR price from an anchor in EUR.
 * target = anchor × 1.175, precise-rounded within [anchor×1.15, anchor×1.20].
 */
export function computePriceEur(anchorEur) {
  const raw = anchorEur * 1.175;
  return preciseRound(raw, anchorEur * 1.15, anchorEur * 1.20);
}

/**
 * Convert EUR price to USD using ECB rate, precise-rounded.
 */
export function convertToUsd(eur, rate = ECB_EURUSD) {
  const raw = eur * rate;
  // allow ±3 window for the digit nudge
  return preciseRound(raw, raw - 3, raw + 3);
}

/**
 * Check that price-per-cm² decreases monotonically with size.
 * Returns { ok, violations[] }.
 */
export function checkMonotonicity(rows) {
  // rows: [{ sku, widthMm, heightMm, priceEur }] sorted by area ascending
  const sorted = [...rows].sort(
    (a, b) => a.widthMm * a.heightMm - b.widthMm * b.heightMm,
  );
  const violations = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const prevPerCm2 = prev.priceEur / ((prev.widthMm * prev.heightMm) / 100);
    const currPerCm2 = curr.priceEur / ((curr.widthMm * curr.heightMm) / 100);
    if (currPerCm2 >= prevPerCm2) {
      violations.push(
        `${curr.sku} (${currPerCm2.toFixed(4)}/cm²) >= ${prev.sku} (${prevPerCm2.toFixed(4)}/cm²)`,
      );
    }
  }
  return { ok: violations.length === 0, violations };
}

// ── Catalogue: our SKUs → calib.io anchors ──────────────────────────────

const CATALOGUE = [
  // Checkerboard composite
  { sku: 'CT-CHT-P-200150', handle: 'checkerboard-composite', family: 'CHT-P', widthMm: 200, heightMm: 150, anchorEur: 103, anchorSku: 'CHT200150', anchorSource: 'calib.io checkerboard Alu/LDPE', note: '' },
  { sku: 'CT-CHT-P-300200', handle: 'checkerboard-composite', family: 'CHT-P', widthMm: 300, heightMm: 200, anchorEur: 108, anchorSku: 'CHT300200', anchorSource: 'calib.io checkerboard Alu/LDPE', note: '' },
  { sku: 'CT-CHT-P-400300', handle: 'checkerboard-composite', family: 'CHT-P', widthMm: 400, heightMm: 300, anchorEur: 127, anchorSku: 'CHT400300', anchorSource: 'calib.io checkerboard Alu/LDPE', note: '' },
  { sku: 'CT-CHT-P-600400', handle: 'checkerboard-composite', family: 'CHT-P', widthMm: 600, heightMm: 400, anchorEur: 176, anchorSku: 'CHT600400', anchorSource: 'calib.io checkerboard Alu/LDPE', note: '' },
  { sku: 'CT-CHT-P-800600', handle: 'checkerboard-composite', family: 'CHT-P', widthMm: 800, heightMm: 600, anchorEur: 263, anchorSku: 'CHT800600', anchorSource: 'calib.io checkerboard Alu/LDPE', note: '' },

  // ChArUco composite
  { sku: 'CT-CHA-P-200150', handle: 'charuco-composite', family: 'CHA-P', widthMm: 200, heightMm: 150, anchorEur: 116, anchorSku: 'CCT200150', anchorSource: 'calib.io charuco Alu/LDPE', note: '' },
  { sku: 'CT-CHA-P-300200', handle: 'charuco-composite', family: 'CHA-P', widthMm: 300, heightMm: 200, anchorEur: 120, anchorSku: 'CCT300200', anchorSource: 'calib.io charuco Alu/LDPE', note: '' },
  { sku: 'CT-CHA-P-400300', handle: 'charuco-composite', family: 'CHA-P', widthMm: 400, heightMm: 300, anchorEur: 134, anchorSku: 'CCT400300', anchorSource: 'calib.io charuco Alu/LDPE', note: '' },
  { sku: 'CT-CHA-P-600400', handle: 'charuco-composite', family: 'CHA-P', widthMm: 600, heightMm: 400, anchorEur: 203, anchorSku: 'CCT600400', anchorSource: 'calib.io charuco Alu/LDPE', note: '' },
  { sku: 'CT-CHA-P-800600', handle: 'charuco-composite', family: 'CHA-P', widthMm: 800, heightMm: 600, anchorEur: 273, anchorSku: 'CCT800600', anchorSource: 'calib.io charuco Alu/LDPE', note: '' },

  // ChArUco ceramic — only 150×100 has a like-for-like anchor
  { sku: 'CT-CHA-C-110085', handle: 'charuco-ceramic', family: 'CHA-C', widthMm: 110, heightMm: 85, anchorEur: 680, anchorSku: 'CCT100075F', anchorSource: 'calib.io charuco ceramic 100×75', note: 'Not like-for-like: our 110×85 vs calib.io 100×75; also Calibvision $277–977 ±2 µm' },
  { sku: 'CT-CHA-C-150100', handle: 'charuco-ceramic', family: 'CHA-C', widthMm: 150, heightMm: 100, anchorEur: 915, anchorSku: 'CCT150100F', anchorSource: 'calib.io charuco ceramic 150×100', note: 'Like-for-like; Calibvision $277–977 ±2 µm also available' },
  { sku: 'CT-CHA-C-185110', handle: 'charuco-ceramic', family: 'CHA-C', widthMm: 185, heightMm: 110, anchorEur: null, anchorSku: null, anchorSource: 'Calibvision $277–977 ±2 µm (no calib.io equivalent)', note: 'No like-for-like; largest calib.io ceramic is 150×100' },
  { sku: 'CT-CHA-C-230140', handle: 'charuco-ceramic', family: 'CHA-C', widthMm: 230, heightMm: 140, anchorEur: null, anchorSku: null, anchorSource: 'Calibvision $277–977 ±2 µm (no calib.io equivalent)', note: 'No like-for-like; largest calib.io ceramic is 150×100' },

  // Mounting fixture
  { sku: 'CT-ACC-A-FIX-14', handle: 'mounting-fixture', family: 'ACC', widthMm: null, heightMm: null, anchorEur: 240, anchorSku: 'MNTFIX01', anchorSource: 'calib.io mounting-fixture', note: 'Fixture ↔ fixture; calib.io is CNC alu, ours is anodised alu 6061 + TPU jaws' },

  // ILAC certificate — no competitor equivalent
  { sku: 'CT-SVC-X-CERT-ILAC', handle: 'certificate-ilac', family: 'SVC', widthMm: null, heightMm: null, anchorEur: null, anchorSku: null, anchorSource: 'No competitor equivalent', note: 'Service add-on; no anchor' },
];

// ── Generate ladder ─────────────────────────────────────────────────────

function generateLadder() {
  const rows = [];
  for (const item of CATALOGUE) {
    const proposedEur = item.anchorEur != null ? computePriceEur(item.anchorEur) : null;
    const proposedUsd = proposedEur != null ? convertToUsd(proposedEur) : null;
    const pctAbove = item.anchorEur != null && proposedEur != null
      ? (((proposedEur - item.anchorEur) / item.anchorEur) * 100).toFixed(1)
      : null;
    rows.push({ ...item, proposedEur, proposedUsd, pctAbove });
  }

  // Monotonicity check per family
  const families = new Map();
  for (const r of rows) {
    if (r.widthMm == null || r.proposedEur == null) continue;
    if (!families.has(r.family)) families.set(r.family, []);
    families.get(r.family).push(r);
  }

  const monotonicity = {};
  for (const [family, items] of families) {
    monotonicity[family] = checkMonotonicity(
      items.map(r => ({ sku: r.sku, widthMm: r.widthMm, heightMm: r.heightMm, priceEur: r.proposedEur })),
    );
  }

  return { rows, monotonicity };
}

// ── Output: markdown table ──────────────────────────────────────────────

function ladderMarkdown({ rows, monotonicity }) {
  const lines = [
    '# Price ladder — 2026-10-29',
    '',
    `ECB EUR/USD reference rate: **${ECB_EURUSD}** (2026-10-28)`,
    '',
    'Rule: target = anchor × 1.175, precise-rounded (avoid last digits 0/5/9),',
    'bounded [anchor × 1.15, anchor × 1.20]. USD = EUR × ECB rate, same rounding.',
    '',
    '| SKU | Size | Anchor € | Anchor source | Proposed € | Proposed $ | % above | €/cm² | Note |',
    '|-----|------|----------|---------------|------------|------------|---------|-------|------|',
  ];

  for (const r of rows) {
    const size = r.widthMm != null ? `${r.widthMm}×${r.heightMm}` : '—';
    const anchor = r.anchorEur != null ? `€${r.anchorEur}` : '—';
    const eur = r.proposedEur != null ? `€${r.proposedEur}` : '—';
    const usd = r.proposedUsd != null ? `$${r.proposedUsd}` : '—';
    const pct = r.pctAbove != null ? `+${r.pctAbove}%` : '—';
    const area = r.widthMm != null && r.proposedEur != null
      ? (r.proposedEur / ((r.widthMm * r.heightMm) / 100)).toFixed(4)
      : '—';
    lines.push(`| ${r.sku} | ${size} | ${anchor} | ${r.anchorSource} | ${eur} | ${usd} | ${pct} | ${area} | ${r.note || '—'} |`);
  }

  lines.push('');
  lines.push('## Monotonicity check');
  lines.push('');
  for (const [family, result] of Object.entries(monotonicity)) {
    if (result.ok) {
      lines.push(`- **${family}**: PASS — price/cm² decreases with size`);
    } else {
      lines.push(`- **${family}**: **FAIL**`);
      for (const v of result.violations) lines.push(`  - ${v}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

// ── Output: Shopify CSV ─────────────────────────────────────────────────

function shopifyCsv(rows) {
  const lines = ['Handle,Variant SKU,Variant Price'];
  for (const r of rows) {
    if (r.proposedEur == null) continue;
    lines.push(`${r.handle},${r.sku},${r.proposedEur}.00`);
  }
  return lines.join('\n') + '\n';
}

// ── Main ────────────────────────────────────────────────────────────────

import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const docsDir = join(__dirname, '..', 'docs', 'pricing');

const ladder = generateLadder();

writeFileSync(join(docsDir, '2026-10-29-price-ladder.md'), ladderMarkdown(ladder));
writeFileSync(join(docsDir, 'shopify-price-import-2026-10-29.csv'), shopifyCsv(ladder.rows));

console.log(ladderMarkdown(ladder));

const failedFamilies = Object.entries(ladder.monotonicity).filter(([, r]) => !r.ok);
if (failedFamilies.length > 0) {
  console.error('\n⚠ Monotonicity violations found — review before import.');
  process.exit(1);
}
console.log('✓ All monotonicity checks pass.');
