/**
 * Canonical fallback prices — sourced from docs/pricing/2026-10-29-price-ladder.md (rev b).
 *
 * These are used ONLY when the Storefront API is unreachable (e.g. missing credentials
 * in CI or dev). The live site always reads prices from Shopify at build time.
 *
 * Currency: EUR (store base currency). USD equivalents are in the ladder doc.
 */

export interface FallbackPrice {
  /** Ladder SKU, e.g. "CT-CHA-P-200150". */
  sku: string;
  /** EUR amount as integer (all ladder prices are whole euros). */
  eur: number;
}

/** Price ladder — 2026-10-29 rev b. */
export const PRICE_LADDER: FallbackPrice[] = [
  // Checkerboard composite
  { sku: 'CT-CHT-P-200150', eur: 121 },
  { sku: 'CT-CHT-P-300200', eur: 127 },
  { sku: 'CT-CHT-P-400300', eur: 148 },
  { sku: 'CT-CHT-P-600400', eur: 207 },
  { sku: 'CT-CHT-P-800600', eur: 308 },
  // ChArUco composite
  { sku: 'CT-CHA-P-200150', eur: 136 },
  { sku: 'CT-CHA-P-300200', eur: 141 },
  { sku: 'CT-CHA-P-400300', eur: 157 },
  { sku: 'CT-CHA-P-600400', eur: 238 },
  { sku: 'CT-CHA-P-800600', eur: 321 },
  // ChArUco ceramic
  { sku: 'CT-CHA-C-110085', eur: 797 },
  { sku: 'CT-CHA-C-150100', eur: 1076 },
  { sku: 'CT-CHA-C-185110', eur: 1306 },
  { sku: 'CT-CHA-C-230140', eur: 1748 },
  // Fixture
  { sku: 'CT-ACC-A-FIX-14', eur: 163 },
  // Certificate
  { sku: 'CT-SVC-X-CERT-ILAC', eur: 276 },
];

/** Look up the minimum EUR price for a product handle. */
export function fallbackMinEur(handle: string): number {
  const prefixMap: Record<string, string> = {
    'checkerboard-composite': 'CT-CHT-P-',
    'charuco-composite': 'CT-CHA-P-',
    'charuco-ceramic': 'CT-CHA-C-',
    'mounting-fixture': 'CT-ACC-A-',
    'certificate-ilac': 'CT-SVC-X-',
  };
  const prefix = prefixMap[handle];
  if (!prefix) return 0;
  const matches = PRICE_LADDER.filter((p) => p.sku.startsWith(prefix));
  return matches.length > 0 ? Math.min(...matches.map((p) => p.eur)) : 0;
}
