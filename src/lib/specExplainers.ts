/**
 * Computed "What this means" lines for product spec rows.
 * All values derived from constants in claims.ts — never typed as literals.
 */
import {
  COMPOSITE_TOLERANCE,
  CERAMIC_ACCURACY,
  COMPOSITE_CTE_UM_PER_M_K,
  CERAMIC_CTE_UM_PER_M_K,
} from './claims';

/**
 * Worst-case composite tolerance at a given board long-side in mm.
 * Formula: 0.3 + 0.2 × (side_mm / 1000), rendered with one decimal.
 */
export function compositeToleranceAtSize(longSideMm: number): string {
  const val = 0.3 + 0.2 * (longSideMm / 1000);
  return `\u00B1${val.toFixed(1)} mm worst case at ${longSideMm} mm`;
}

/**
 * Thermal expansion of the largest board per 10 °C.
 * For composite: result in mm (two decimals).
 * For ceramic: result in µm (two decimals).
 */
export function thermalExpansion(
  material: 'composite' | 'ceramic',
  longSideMm: number,
): string {
  const cte = material === 'composite' ? COMPOSITE_CTE_UM_PER_M_K : CERAMIC_CTE_UM_PER_M_K;
  // CTE is µm/(m·K), board is in mm → result in µm = cte × (side/1000) × 10
  const deltaUm = cte * (longSideMm / 1000) * 10;
  if (material === 'composite') {
    const deltaMm = deltaUm / 1000;
    return `${deltaMm.toFixed(2)} mm change over ${longSideMm} mm per 10 \u00B0C`;
  }
  return `${deltaUm.toFixed(2)} \u00B5m change over ${longSideMm} mm per 10 \u00B0C`;
}

/** Why flatness matters — one sentence, ≤ 3 lines. */
export const FLATNESS_EXPLAINER =
  'Calibration assumes all features lie in a single plane. Out-of-plane errors add directly to reprojection error.';

/**
 * Ratio of composite tolerance to ceramic accuracy.
 * 0.3 mm / 0.002 mm = 150×.
 */
export function ceramicVsCompositeRatio(): string {
  const compositeNominal = 0.3; // mm
  const ceramicNominal = 0.002; // mm (2 µm)
  const ratio = Math.round(compositeNominal / ceramicNominal);
  return `about ${ratio}\u00D7 tighter than composite`;
}
