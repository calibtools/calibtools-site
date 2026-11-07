/**
 * Canonical fallback prices — sourced from docs/pricing/2026-10-29-price-ladder.md (rev c).
 *
 * These are used ONLY when the Storefront API is unreachable (e.g. missing credentials
 * in CI or dev). The live site always reads prices from Shopify at build time.
 *
 * Currency: EUR (store base currency). USD equivalents are in the ladder doc.
 */

export interface FallbackPrice {
  /** Ladder SKU, e.g. "CT-CHA-P-200X150". */
  sku: string;
  /** EUR amount as integer (all ladder prices are whole euros). */
  eur: number;
}

/** Price ladder — 2026-10-29 rev c. */
export const PRICE_LADDER: FallbackPrice[] = [
  // Checkerboard composite
  { sku: 'CT-CHT-P-200X150', eur: 121 },
  { sku: 'CT-CHT-P-300X200', eur: 127 },
  { sku: 'CT-CHT-P-400X300', eur: 148 },
  { sku: 'CT-CHT-P-600X400', eur: 207 },
  { sku: 'CT-CHT-P-800X600', eur: 308 },
  // ChArUco composite
  { sku: 'CT-CHA-P-200X150', eur: 136 },
  { sku: 'CT-CHA-P-300X200', eur: 141 },
  { sku: 'CT-CHA-P-400X300', eur: 157 },
  { sku: 'CT-CHA-P-600X400', eur: 238 },
  { sku: 'CT-CHA-P-800X600', eur: 321 },
  // AprilGrid composite
  { sku: 'CT-APR-P-200X150-T36', eur: 121 },
  { sku: 'CT-APR-P-300X200-T36', eur: 127 },
  { sku: 'CT-APR-P-400X300-T36', eur: 207 },
  { sku: 'CT-APR-P-600X400-T36', eur: 274 },
  { sku: 'CT-APR-P-800X600-T36', eur: 371 },
  // Circle grid composite (symmetric)
  { sku: 'CT-CIR-P-200X150-SYM', eur: 121 },
  { sku: 'CT-CIR-P-300X200-SYM', eur: 127 },
  { sku: 'CT-CIR-P-400X300-SYM', eur: 148 },
  { sku: 'CT-CIR-P-600X400-SYM', eur: 207 },
  { sku: 'CT-CIR-P-800X600-SYM', eur: 308 },
  // Asymmetric circle grid composite
  { sku: 'CT-CIR-P-200X150-ASY', eur: 121 },
  { sku: 'CT-CIR-P-300X200-ASY', eur: 127 },
  { sku: 'CT-CIR-P-400X300-ASY', eur: 142 },
  { sku: 'CT-CIR-P-600X400-ASY', eur: 207 },
  { sku: 'CT-CIR-P-800X600-ASY', eur: 308 },
  // HALCON composite
  { sku: 'CT-HAL-P-200X150-STD', eur: 148 },
  { sku: 'CT-HAL-P-300X200-STD', eur: 156 },
  { sku: 'CT-HAL-P-400X300-STD', eur: 167 },
  { sku: 'CT-HAL-P-600X400-STD', eur: 244 },
  { sku: 'CT-HAL-P-800X600-STD', eur: 333 },
  // ChArUco ceramic
  { sku: 'CT-CHA-C-110X85', eur: 797 },
  { sku: 'CT-CHA-C-150X100', eur: 1076 },
  { sku: 'CT-CHA-C-185X110', eur: 1306 },
  { sku: 'CT-CHA-C-230X140', eur: 1748 },
  // Fixture
  { sku: 'CT-ACC-M-FIX14', eur: 163 },
  // Certificate
  { sku: 'CT-SVC-CERT-ILAC', eur: 276 },
];

/** Look up the minimum EUR price for a product handle. */
export function fallbackMinEur(handle: string): number {
  const prefixMap: Record<string, string> = {
    'checkerboard-composite': 'CT-CHT-P-',
    'charuco-composite': 'CT-CHA-P-',
    'charuco-ceramic': 'CT-CHA-C-',
    'aprilgrid-composite': 'CT-APR-P-',
    'circlegrid-composite': 'CT-CIR-P-',
    'halcon-composite': 'CT-HAL-P-',
    'mounting-fixture': 'CT-ACC-A-',
    'certificate-ilac': 'CT-SVC-X-',
  };
  const prefix = prefixMap[handle];
  if (!prefix) return 0;
  const matches = PRICE_LADDER.filter((p) => p.sku.startsWith(prefix));
  return matches.length > 0 ? Math.min(...matches.map((p) => p.eur)) : 0;
}
