/**
 * PRICE-1b · Pricing rule engine with owner decisions
 *
 * Pure functions: preciseRound, computePriceEur, convertToUsd,
 *                 fitPowerLaw, extrapolateCeramic, checkMonotonicity.
 *
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
      return Math.abs(candidates[0] - raw) <= Math.abs(candidates[1] - raw)
        ? candidates[0]
        : candidates[1];
    }
  }
  return n; // fallback
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
  return preciseRound(raw, raw - 3, raw + 3);
}

/**
 * Fit power law: €/cm² = a · area_cm²^b through two points.
 * Returns { a, b }.
 */
export function fitPowerLaw(area1Cm2, pricePerCm2_1, area2Cm2, pricePerCm2_2) {
  const b = (Math.log(pricePerCm2_2) - Math.log(pricePerCm2_1))
          / (Math.log(area2Cm2) - Math.log(area1Cm2));
  const a = pricePerCm2_1 / Math.pow(area1Cm2, b);
  return { a, b };
}

/**
 * Extrapolate a ceramic price using the power-law fit, then precise-round.
 */
export function extrapolateCeramic(areaCm2, a, b) {
  const pricePerCm2 = a * Math.pow(areaCm2, b);
  const raw = pricePerCm2 * areaCm2;
  return preciseRound(raw, raw - 3, raw + 3);
}

/**
 * Check that price-per-cm² decreases monotonically with size.
 * Returns { ok, violations[] }.
 */
export function checkMonotonicity(rows) {
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

// ── Ceramic power-law fit ───────────────────────────────────────────────

// Two anchor points (after applying ×1.175 rule):
//   110×85  (93.5 cm²):  anchor €680 → €798  → €/cm² = 8.5348
//   150×100 (150 cm²):   anchor €915 → €1076 → €/cm² = 7.1733
const CERAMIC_P1 = { areaCm2: 93.5, eurPerCm2: 797 / 93.5 };
const CERAMIC_P2 = { areaCm2: 150,  eurPerCm2: 1076 / 150 };
export const CERAMIC_FIT = fitPowerLaw(
  CERAMIC_P1.areaCm2, CERAMIC_P1.eurPerCm2,
  CERAMIC_P2.areaCm2, CERAMIC_P2.eurPerCm2,
);

// ── Shopify variant map ─────────────────────────────────────────────────
// Maps our internal size-key to the actual Shopify variant SKUs and old USD prices.

const SHOPIFY_VARIANTS = {
  // Checkerboard composite — 2 variants per size (Fine/Coarse)
  'CHT-P-200150': { shopifySkus: ['CHT-200150-F', 'CHT-200150-C'], oldUsd: 79 },
  'CHT-P-300200': { shopifySkus: ['CHT-300200-F', 'CHT-300200-C'], oldUsd: 99 },
  'CHT-P-400300': { shopifySkus: ['CHT-400300-F', 'CHT-400300-C'], oldUsd: 129 },
  'CHT-P-600400': { shopifySkus: ['CHT-600400-F', 'CHT-600400-C'], oldUsd: 189 },
  'CHT-P-800600': { shopifySkus: ['CHT-800600-F', 'CHT-800600-C'], oldUsd: 259 },

  // ChArUco composite — 4 variants per size (6X6/5X5/4X4/AT36)
  'CHA-P-200150': { shopifySkus: ['CHA-200150-6X6', 'CHA-200150-5X5', 'CHA-200150-4X4', 'CHA-200150-AT36'], oldUsd: 89 },
  'CHA-P-300200': { shopifySkus: ['CHA-300200-6X6', 'CHA-300200-5X5', 'CHA-300200-4X4', 'CHA-300200-AT36'], oldUsd: 109 },
  'CHA-P-400300': { shopifySkus: ['CHA-400300-6X6', 'CHA-400300-5X5', 'CHA-400300-4X4', 'CHA-400300-AT36'], oldUsd: 139 },
  'CHA-P-600400': { shopifySkus: ['CHA-600400-6X6', 'CHA-600400-5X5', 'CHA-600400-4X4', 'CHA-600400-AT36'], oldUsd: 199 },
  'CHA-P-800600': { shopifySkus: ['CHA-800600-6X6', 'CHA-800600-5X5', 'CHA-800600-4X4', 'CHA-800600-AT36'], oldUsd: 269 },

  // ChArUco ceramic — 2 variants per size (6X6/5X5)
  'CHA-C-110085': { shopifySkus: ['CHA-C-11085-6X6', 'CHA-C-11085-5X5'], oldUsd: 189 },
  'CHA-C-150100': { shopifySkus: [], oldUsd: null }, // NOT IN STORE
  'CHA-C-185110': { shopifySkus: ['CHA-C-185110-6X6', 'CHA-C-185110-5X5'], oldUsd: 239 },
  'CHA-C-230140': { shopifySkus: ['CHA-C-230140-6X6', 'CHA-C-230140-5X5'], oldUsd: 299 },

  // AprilGrid composite — not yet in Shopify
  'APR-P-200150': { shopifySkus: [], oldUsd: null },
  'APR-P-300200': { shopifySkus: [], oldUsd: null },
  'APR-P-400300': { shopifySkus: [], oldUsd: null },
  'APR-P-600400': { shopifySkus: [], oldUsd: null },
  'APR-P-800600': { shopifySkus: [], oldUsd: null },
  // Circle grid composite (symmetric) — not yet in Shopify
  'CIR-P-200150': { shopifySkus: [], oldUsd: null },
  'CIR-P-300200': { shopifySkus: [], oldUsd: null },
  'CIR-P-400300': { shopifySkus: [], oldUsd: null },
  'CIR-P-600400': { shopifySkus: [], oldUsd: null },
  'CIR-P-800600': { shopifySkus: [], oldUsd: null },
  // Asymmetric circle grid composite — not yet in Shopify
  'ACR-P-200150': { shopifySkus: [], oldUsd: null },
  'ACR-P-300200': { shopifySkus: [], oldUsd: null },
  'ACR-P-400300': { shopifySkus: [], oldUsd: null },
  'ACR-P-600400': { shopifySkus: [], oldUsd: null },
  'ACR-P-800600': { shopifySkus: [], oldUsd: null },
  // HALCON composite — not yet in Shopify
  'HAL-P-200150': { shopifySkus: [], oldUsd: null },
  'HAL-P-300200': { shopifySkus: [], oldUsd: null },
  'HAL-P-400300': { shopifySkus: [], oldUsd: null },
  'HAL-P-600400': { shopifySkus: [], oldUsd: null },
  'HAL-P-800600': { shopifySkus: [], oldUsd: null },

  // Accessories / services — 1 variant each
  'ACC-FIX-14':   { shopifySkus: ['ACC-FIX-14'], oldUsd: 39 },
  'SVC-CERT-ILAC': { shopifySkus: ['SVC-CERT-ILAC'], oldUsd: 149 },
};

// ── Catalogue ───────────────────────────────────────────────────────────

const CATALOGUE = [
  // Checkerboard composite — anchor: calib.io checkerboard Alu/LDPE
  { sku: 'CT-CHT-P-200150', sizeKey: 'CHT-P-200150', handle: 'checkerboard-composite', family: 'CHT-P', widthMm: 200, heightMm: 150, anchorEur: 103, anchorSource: 'calib.io CHT200150 Alu/LDPE', note: '' },
  { sku: 'CT-CHT-P-300200', sizeKey: 'CHT-P-300200', handle: 'checkerboard-composite', family: 'CHT-P', widthMm: 300, heightMm: 200, anchorEur: 108, anchorSource: 'calib.io CHT300200 Alu/LDPE', note: '' },
  { sku: 'CT-CHT-P-400300', sizeKey: 'CHT-P-400300', handle: 'checkerboard-composite', family: 'CHT-P', widthMm: 400, heightMm: 300, anchorEur: 127, anchorSource: 'calib.io CHT400300 Alu/LDPE', note: '' },
  { sku: 'CT-CHT-P-600400', sizeKey: 'CHT-P-600400', handle: 'checkerboard-composite', family: 'CHT-P', widthMm: 600, heightMm: 400, anchorEur: 176, anchorSource: 'calib.io CHT600400 Alu/LDPE', note: '' },
  { sku: 'CT-CHT-P-800600', sizeKey: 'CHT-P-800600', handle: 'checkerboard-composite', family: 'CHT-P', widthMm: 800, heightMm: 600, anchorEur: 263, anchorSource: 'calib.io CHT800600 Alu/LDPE', note: '' },

  // ChArUco composite — anchor: calib.io charuco Alu/LDPE
  { sku: 'CT-CHA-P-200150', sizeKey: 'CHA-P-200150', handle: 'charuco-composite', family: 'CHA-P', widthMm: 200, heightMm: 150, anchorEur: 116, anchorSource: 'calib.io CCT200150 Alu/LDPE', note: '' },
  { sku: 'CT-CHA-P-300200', sizeKey: 'CHA-P-300200', handle: 'charuco-composite', family: 'CHA-P', widthMm: 300, heightMm: 200, anchorEur: 120, anchorSource: 'calib.io CCT300200 Alu/LDPE', note: '' },
  { sku: 'CT-CHA-P-400300', sizeKey: 'CHA-P-400300', handle: 'charuco-composite', family: 'CHA-P', widthMm: 400, heightMm: 300, anchorEur: 134, anchorSource: 'calib.io CCT400300 Alu/LDPE', note: '' },
  { sku: 'CT-CHA-P-600400', sizeKey: 'CHA-P-600400', handle: 'charuco-composite', family: 'CHA-P', widthMm: 600, heightMm: 400, anchorEur: 203, anchorSource: 'calib.io CCT600400 Alu/LDPE', note: '' },
  { sku: 'CT-CHA-P-800600', sizeKey: 'CHA-P-800600', handle: 'charuco-composite', family: 'CHA-P', widthMm: 800, heightMm: 600, anchorEur: 273, anchorSource: 'calib.io CCT800600 Alu/LDPE', note: '' },

  // AprilGrid composite — anchor: calib.io kalibr-targets (only 3 sizes available)
  // 200×150 and 300×200 use checkerboard anchors (same substrate + printing)
  { sku: 'CT-APR-P-200150', sizeKey: 'APR-P-200150', handle: 'aprilgrid-composite', family: 'APR-P', widthMm: 200, heightMm: 150, anchorEur: 103, anchorSource: 'calib.io CHT200150 (proxy — no kalibr-targets 200×150)', note: '' },
  { sku: 'CT-APR-P-300200', sizeKey: 'APR-P-300200', handle: 'aprilgrid-composite', family: 'APR-P', widthMm: 300, heightMm: 200, anchorEur: 108, anchorSource: 'calib.io CHT300200 (proxy — no kalibr-targets 300×200)', note: '' },
  { sku: 'CT-APR-P-400300', sizeKey: 'APR-P-400300', handle: 'aprilgrid-composite', family: 'APR-P', widthMm: 400, heightMm: 300, anchorEur: 176, anchorSource: 'calib.io KLB400300', note: '' },
  { sku: 'CT-APR-P-600400', sizeKey: 'APR-P-600400', handle: 'aprilgrid-composite', family: 'APR-P', widthMm: 600, heightMm: 400, anchorEur: 234, anchorSource: 'calib.io KLB600400', note: '' },
  { sku: 'CT-APR-P-800600', sizeKey: 'APR-P-800600', handle: 'aprilgrid-composite', family: 'APR-P', widthMm: 800, heightMm: 600, anchorEur: 315, anchorSource: 'calib.io KLB800600', note: '' },

  // Circle grid composite (symmetric) — anchor: calib.io circles
  { sku: 'CT-CIR-P-200150', sizeKey: 'CIR-P-200150', handle: 'circlegrid-composite', family: 'CIR-P', widthMm: 200, heightMm: 150, anchorEur: 103, anchorSource: 'calib.io CT200150', note: '' },
  { sku: 'CT-CIR-P-300200', sizeKey: 'CIR-P-300200', handle: 'circlegrid-composite', family: 'CIR-P', widthMm: 300, heightMm: 200, anchorEur: 108, anchorSource: 'calib.io CT300200', note: '' },
  { sku: 'CT-CIR-P-400300', sizeKey: 'CIR-P-400300', handle: 'circlegrid-composite', family: 'CIR-P', widthMm: 400, heightMm: 300, anchorEur: 127, anchorSource: 'calib.io CT400300', note: '' },
  { sku: 'CT-CIR-P-600400', sizeKey: 'CIR-P-600400', handle: 'circlegrid-composite', family: 'CIR-P', widthMm: 600, heightMm: 400, anchorEur: 176, anchorSource: 'calib.io CT600400', note: '' },
  { sku: 'CT-CIR-P-800600', sizeKey: 'CIR-P-800600', handle: 'circlegrid-composite', family: 'CIR-P', widthMm: 800, heightMm: 600, anchorEur: 263, anchorSource: 'calib.io CT800600', note: '' },

  // Asymmetric circle grid composite — anchor: calib.io asymmetric-circles
  { sku: 'CT-ACR-P-200150', sizeKey: 'ACR-P-200150', handle: 'circlegrid-composite', family: 'ACR-P', widthMm: 200, heightMm: 150, anchorEur: 103, anchorSource: 'calib.io ACT200150', note: '' },
  { sku: 'CT-ACR-P-300200', sizeKey: 'ACR-P-300200', handle: 'circlegrid-composite', family: 'ACR-P', widthMm: 300, heightMm: 200, anchorEur: 108, anchorSource: 'calib.io ACT300200', note: '' },
  { sku: 'CT-ACR-P-400300', sizeKey: 'ACR-P-400300', handle: 'circlegrid-composite', family: 'ACR-P', widthMm: 400, heightMm: 300, anchorEur: 121, anchorSource: 'calib.io ACT400300', note: '' },
  { sku: 'CT-ACR-P-600400', sizeKey: 'ACR-P-600400', handle: 'circlegrid-composite', family: 'ACR-P', widthMm: 600, heightMm: 400, anchorEur: 176, anchorSource: 'calib.io ACT600400', note: '' },
  { sku: 'CT-ACR-P-800600', sizeKey: 'ACR-P-800600', handle: 'circlegrid-composite', family: 'ACR-P', widthMm: 800, heightMm: 600, anchorEur: 263, anchorSource: 'calib.io ACT800600', note: '' },

  // HALCON composite — anchor: calib.io halcon-targets
  { sku: 'CT-HAL-P-200150', sizeKey: 'HAL-P-200150', handle: 'halcon-composite', family: 'HAL-P', widthMm: 200, heightMm: 150, anchorEur: 127, anchorSource: 'calib.io HAL200150F', note: '' },
  { sku: 'CT-HAL-P-300200', sizeKey: 'HAL-P-300200', handle: 'halcon-composite', family: 'HAL-P', widthMm: 300, heightMm: 200, anchorEur: 133, anchorSource: 'calib.io HAL300200F', note: '' },
  { sku: 'CT-HAL-P-400300', sizeKey: 'HAL-P-400300', handle: 'halcon-composite', family: 'HAL-P', widthMm: 400, heightMm: 300, anchorEur: 142, anchorSource: 'calib.io HAL400300F', note: '' },
  { sku: 'CT-HAL-P-600400', sizeKey: 'HAL-P-600400', handle: 'halcon-composite', family: 'HAL-P', widthMm: 600, heightMm: 400, anchorEur: 208, anchorSource: 'calib.io HAL600400F', note: '' },
  { sku: 'CT-HAL-P-800600', sizeKey: 'HAL-P-800600', handle: 'halcon-composite', family: 'HAL-P', widthMm: 800, heightMm: 600, anchorEur: 283, anchorSource: 'calib.io HAL800600F', note: '' },

  // ChArUco ceramic — owner decision A: calib.io anchor, power-law extrapolation
  { sku: 'CT-CHA-C-110085', sizeKey: 'CHA-C-110085', handle: 'charuco-ceramic', family: 'CHA-C', widthMm: 110, heightMm: 85, anchorEur: 680, anchorSource: 'calib.io CCT100075F ceramic 100×75', note: 'Owner override €797/$887 (avoid repeated-digit look of 798/888)', ownerEur: 797, ownerUsd: 887 },
  { sku: 'CT-CHA-C-150100', sizeKey: 'CHA-C-150100', handle: 'charuco-ceramic', family: 'CHA-C', widthMm: 150, heightMm: 100, anchorEur: 915, anchorSource: 'calib.io CCT150100F ceramic 150×100', note: 'Like-for-like; not yet in Shopify' },
  { sku: 'CT-CHA-C-185110', sizeKey: 'CHA-C-185110', handle: 'charuco-ceramic', family: 'CHA-C', widthMm: 185, heightMm: 110, anchorEur: null, anchorSource: 'Power-law extrapolation from 110×85 + 150×100', note: `Extrapolated: €/cm² = ${CERAMIC_FIT.a.toFixed(2)} × area^${CERAMIC_FIT.b.toFixed(4)}` },
  { sku: 'CT-CHA-C-230140', sizeKey: 'CHA-C-230140', handle: 'charuco-ceramic', family: 'CHA-C', widthMm: 230, heightMm: 140, anchorEur: null, anchorSource: 'Power-law extrapolation from 110×85 + 150×100', note: `Extrapolated: €/cm² = ${CERAMIC_FIT.a.toFixed(2)} × area^${CERAMIC_FIT.b.toFixed(4)}` },

  // Mounting fixture — owner override
  { sku: 'CT-ACC-A-FIX-14', sizeKey: 'ACC-FIX-14', handle: 'mounting-fixture', family: 'ACC', widthMm: null, heightMm: null, anchorEur: null, anchorSource: 'Owner override (band €140–180)', note: 'Owner-set €163; different construction from calib.io MNTFIX01 @ €240' },

  // ILAC certificate — owner decision from Calibvision anchor
  { sku: 'CT-SVC-X-CERT-ILAC', sizeKey: 'SVC-CERT-ILAC', handle: 'certificate-ilac', family: 'SVC', widthMm: null, heightMm: null, anchorEur: null, anchorSource: 'Calibvision CNAS cert ≈$260/PN → owner $307', note: 'Owner-set $307; EUR derived via ECB rate' },
];

// ── Generate ladder ─────────────────────────────────────────────────────

function generateLadder() {
  const rows = [];
  for (const item of CATALOGUE) {
    let proposedEur, proposedUsd, pctAbove;
    const sv = SHOPIFY_VARIANTS[item.sizeKey];

    if (item.ownerEur != null) {
      // Owner override with explicit EUR + USD
      proposedEur = item.ownerEur;
      proposedUsd = item.ownerUsd ?? convertToUsd(item.ownerEur);
      pctAbove = item.anchorEur != null
        ? (((proposedEur - item.anchorEur) / item.anchorEur) * 100).toFixed(1)
        : null;
    } else if (item.sku === 'CT-ACC-A-FIX-14') {
      // Owner override: €163
      proposedEur = 163;
      proposedUsd = convertToUsd(163);
      pctAbove = null; // no anchor comparison
    } else if (item.sku === 'CT-SVC-X-CERT-ILAC') {
      // Owner decision: $307, derive EUR
      proposedUsd = 307;
      const rawEur = 307 / ECB_EURUSD;
      proposedEur = preciseRound(rawEur, rawEur - 3, rawEur + 3);
      pctAbove = null;
    } else if (item.anchorEur != null) {
      // Standard rule: anchor × 1.175
      proposedEur = computePriceEur(item.anchorEur);
      proposedUsd = convertToUsd(proposedEur);
      pctAbove = (((proposedEur - item.anchorEur) / item.anchorEur) * 100).toFixed(1);
    } else if (item.family === 'CHA-C') {
      // Power-law extrapolation
      const areaCm2 = (item.widthMm * item.heightMm) / 100;
      proposedEur = extrapolateCeramic(areaCm2, CERAMIC_FIT.a, CERAMIC_FIT.b);
      proposedUsd = convertToUsd(proposedEur);
      pctAbove = null;
    } else {
      proposedEur = null;
      proposedUsd = null;
      pctAbove = null;
    }

    rows.push({ ...item, proposedEur, proposedUsd, pctAbove, oldUsd: sv?.oldUsd ?? null, shopifySkus: sv?.shopifySkus ?? [] });
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
    '# Price ladder — 2026-10-29 (rev c)',
    '',
    `ECB EUR/USD reference rate: **${ECB_EURUSD}** (2026-10-28)`,
    '',
    '## Rules',
    '',
    '- **Composite**: target = calib.io anchor × 1.175, precise-rounded (avoid last digits 0/5/9),',
    '  bounded [anchor × 1.15, anchor × 1.20].',
    `- **Ceramic 110×85 + 150×100**: same ×1.175 rule from calib.io ceramic anchors.`,
    `- **Ceramic 185×110 + 230×140**: power-law extrapolation €/cm² = ${CERAMIC_FIT.a.toFixed(2)} × area^${CERAMIC_FIT.b.toFixed(4)}`,
    '  fitted through the two anchored ceramic points.',
    '- **Fixture CT-ACC-A-FIX-14**: owner-set €163 (band €140–180); different construction from calib.io MNTFIX01.',
    '- **Certificate CT-SVC-X-CERT-ILAC**: owner-set $307 from Calibvision CNAS ≈$260 anchor; EUR derived.',
    '- **USD**: EUR × ECB rate, precise-rounded.',
    '',
    '## Ladder',
    '',
    '| SKU | Size | Anchor € | Anchor source | Old $ | Proposed € | Proposed $ | % above anchor | €/cm² | Note |',
    '|-----|------|----------|---------------|-------|------------|------------|----------------|-------|------|',
  ];

  for (const r of rows) {
    const size = r.widthMm != null ? `${r.widthMm}×${r.heightMm}` : '—';
    const anchor = r.anchorEur != null ? `€${r.anchorEur}` : '—';
    const old$ = r.oldUsd != null ? `$${r.oldUsd}` : '—';
    const eur = r.proposedEur != null ? `€${r.proposedEur}` : '—';
    const usd = r.proposedUsd != null ? `$${r.proposedUsd}` : '—';
    const pct = r.pctAbove != null ? `+${r.pctAbove}%` : '—';
    const area = r.widthMm != null && r.proposedEur != null
      ? (r.proposedEur / ((r.widthMm * r.heightMm) / 100)).toFixed(4)
      : '—';
    const inStore = r.shopifySkus.length > 0 ? '' : ' ⚠ not in Shopify';
    lines.push(`| ${r.sku} | ${size} | ${anchor} | ${r.anchorSource} | ${old$} | ${eur} | ${usd} | ${pct} | ${area} | ${r.note || '—'}${inStore} |`);
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
  lines.push('## SKUs not in Shopify');
  lines.push('');
  const missing = rows.filter(r => r.shopifySkus.length === 0 && r.proposedEur != null);
  if (missing.length === 0) {
    lines.push('All priced SKUs exist in the store.');
  } else {
    for (const r of missing) {
      lines.push(`- **${r.sku}** (${r.sizeKey}): proposed €${r.proposedEur} / $${r.proposedUsd} — create variants before import`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

// ── Output: Shopify CSV (store currency = USD) ──────────────────────────

function shopifyCsv(rows) {
  const lines = ['Handle,Variant SKU,Old Price,Variant Price'];
  for (const r of rows) {
    if (r.proposedUsd == null) continue;
    for (const shopifySku of r.shopifySkus) {
      lines.push(`${r.handle},${shopifySku},${r.oldUsd != null ? r.oldUsd.toFixed(2) : ''},${r.proposedUsd}.00`);
    }
  }
  return lines.join('\n') + '\n';
}

// ── Product titles/stories/tags for new products ──────────────────────
const PRODUCT_TITLES = {
  'aprilgrid-composite': 'AprilGrid calibration target',
  'circlegrid-composite': 'Circle grid calibration target',
  'halcon-composite': 'HALCON calibration plate',
};
const PRODUCT_STORIES = {
  'aprilgrid-composite': '<p>AprilGrid composite board for Kalibr camera-IMU calibration. AprilTag 36h11 markers on rigid aluminium composite.</p>',
  'circlegrid-composite': '<p>Symmetric and asymmetric circle grid targets on rigid aluminium composite. For OpenCV and HALCON workflows.</p>',
  'halcon-composite': '<p>HALCON calibration plate with MVTec mark layout on rigid aluminium composite. Ships with .descr description file.</p>',
};
const PRODUCT_TAGS = {
  'aprilgrid-composite': 'composite, aprilgrid, kalibr',
  'circlegrid-composite': 'composite, circles, opencv, halcon',
  'halcon-composite': 'composite, halcon, mvtec',
};

/** Quote a CSV field: wrap in double-quotes if it contains comma, quote, or newline (RFC 4180). */
function csvField(value) {
  const s = String(value ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function shopifyProductImportCsv(rows) {
  const HEADER = ['Handle','Title','Body (HTML)','Vendor','Type','Tags','Option1 Name','Option1 Value','Variant SKU','Variant Price','Variant Inventory Policy','Published'];
  const lines = [HEADER.join(',')];
  const seen = new Set();
  for (const r of rows) {
    if (r.proposedUsd == null) continue;
    // Only include new products (skip existing ones already in Shopify)
    if (!PRODUCT_TITLES[r.handle]) continue;
    const isFirst = !seen.has(r.handle);
    seen.add(r.handle);
    const title = isFirst ? PRODUCT_TITLES[r.handle] : '';
    const body = isFirst ? PRODUCT_STORIES[r.handle] : '';
    const vendor = isFirst ? 'Calib.Tools' : '';
    const type = isFirst ? 'Calibration target' : '';
    const tags = isFirst ? (PRODUCT_TAGS[r.handle] || '') : '';
    const size = r.widthMm ? `${r.widthMm} \u00d7 ${r.heightMm}` : '';
    const fields = [r.handle, title, csvField(body), vendor, type, csvField(tags), 'Size', size, r.sku, `${r.proposedUsd}.00`, 'continue', 'TRUE'];
    lines.push(fields.join(','));
  }
  return lines.join('\n') + '\n';
}

/** Validate that every data row has the same field count as the header and Variant Price is well-formed. */
function validateCsv(csv, label) {
  const lines = csv.trimEnd().split('\n');
  if (lines.length < 2) throw new Error(`${label}: CSV has no data rows`);

  // Parse a CSV line respecting quoted fields
  function parseRow(line) {
    const fields = [];
    let i = 0;
    while (i <= line.length) {
      if (i === line.length) { fields.push(''); break; }
      if (line[i] === '"') {
        let val = '';
        i++; // skip opening quote
        while (i < line.length) {
          if (line[i] === '"') {
            if (i + 1 < line.length && line[i + 1] === '"') { val += '"'; i += 2; }
            else { i++; break; }
          } else { val += line[i]; i++; }
        }
        fields.push(val);
        if (i < line.length && line[i] === ',') i++; // skip comma
      } else {
        const next = line.indexOf(',', i);
        if (next === -1) { fields.push(line.slice(i)); break; }
        fields.push(line.slice(i, next));
        i = next + 1;
      }
    }
    return fields;
  }

  const headerFields = parseRow(lines[0]);
  const headerCount = headerFields.length;
  const priceIdx = headerFields.indexOf('Variant Price');

  const errors = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = parseRow(lines[i]);
    if (fields.length !== headerCount) {
      errors.push(`Row ${i + 1}: expected ${headerCount} fields, got ${fields.length}`);
    }
    if (priceIdx !== -1) {
      const price = fields[priceIdx];
      if (!/^\d+\.\d\d$/.test(price)) {
        errors.push(`Row ${i + 1}: Variant Price "${price}" does not match /^\\d+\\.\\d\\d$/`);
      }
    }
  }
  if (errors.length > 0) {
    throw new Error(`${label} validation failed:\n  ${errors.join('\n  ')}`);
  }
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

const addProductsCsv = shopifyProductImportCsv(ladder.rows);
validateCsv(addProductsCsv, 'add-products-2026-10-29.csv');
writeFileSync(join(docsDir, 'add-products-2026-10-29.csv'), addProductsCsv);

console.log(ladderMarkdown(ladder));

const failedFamilies = Object.entries(ladder.monotonicity).filter(([, r]) => !r.ok);
if (failedFamilies.length > 0) {
  console.error('\n⚠ Monotonicity violations found — review before import.');
  process.exit(1);
}
console.log('✓ All monotonicity checks pass.');
