/**
 * Centralised wording for shipping, inspection and legal claims.
 * Import these constants everywhere — never hard-code location or lead-time text.
 */

/** Footer copyright line (no location). */
export const FOOTER_LINE = '\u00A9 2026 Calib.Tools\u2122';

/** Production lead-time as a human phrase (for prose interpolation). */
export const LEAD_TIME_WEEKS = '2\u20133 weeks';

/** Lead-time / availability one-liner for product pages and datasheets. */
export const LEAD_TIME = `Made to order \u00B7 ships in ${LEAD_TIME_WEEKS}`;

/** Short shipping origin label for the purchase table header. */
export const SHIPS_FROM = 'Ships from the factory';

/** Inspection claim for product pages and datasheets. */
export const INSPECTION_CLAIM =
  'Measured before it ships \u2014 against a golden-sample reference';

/** Certificate add-on claim (withdrawn — lab selection pending). */
export const CERT_CLAIM = '';

/** Default Incoterm (to be confirmed). */
export const INCOTERM = 'DAP' as const;

// ── Returns & shipping policy constants ─────────────────────────────

/** Return window from delivery date (calendar days). */
export const RETURN_WINDOW_DAYS = 30;

/** Return-authorization number validity (calendar days). */
export const RA_VALID_DAYS = 14;

/** Late-return restocking window (prose). */
export const RESTOCKING_WINDOW = '31\u2013120 days';

/** Minimum restocking fee for late returns. */
export const RESTOCKING_FEE_MIN = '25\u00A0%';

/** Defect warranty duration (prose). */
export const DEFECT_WARRANTY = 'one year from invoice';

/** Business days before refund is initiated after inspection. */
export const REFUND_START_DAYS = 3;

/** Number of countries / territories we ship to. */
export const SHIP_COUNTRY_COUNT = 41;

// ── Material specs ───────────────────────────────────────────────────

/** Ceramic feature accuracy (lithography on alumina). */
export const CERAMIC_ACCURACY = '\u00B12 \u00B5m';

/** Composite feature tolerance (UV flatbed on aluminum composite). */
export const COMPOSITE_TOLERANCE = '\u00B10.3 mm + 0.2 mm/m';

/** Composite flatness specification. */
export const COMPOSITE_FLATNESS = '\u22640.5 mm per meter (three-point support)';

/** Ceramic flatness specification. */
export const CERAMIC_FLATNESS = '\u226420 \u00B5m over the pattern area';

/** Composite CTE in µm/(m·K). */
export const COMPOSITE_CTE_UM_PER_M_K = 24;

/** Ceramic CTE in µm/(m·K). */
export const CERAMIC_CTE_UM_PER_M_K = 7.2;

/** Short inspection claim — used where the full INSPECTION_CLAIM is too long. */
export const INSPECTION_CLAIM_SHORT = 'Measured before it ships';

/** Primary tagline — used for the home H1, <title> suffix, OG fallback. */
export const TAGLINE = 'Know your target to the micron';

/** Returns headline — used on index.astro and returns.astro. */
export const RETURNS_LINE = 'Not flat, not accurate, not what you ordered\u2009\u2014\u2009send it back.';

// ── Brand identity for exports ──────────────────────────────────────

export const BRAND_NAME = 'Calib.Tools';
export const SITE_URL = 'calib.tools';
export const CONTACT_EMAIL = 'hello@calib.tools';

/** Disclaimer on printed pattern files — no sales line. */
export const PRINT_NOTE =
  'Printed patterns are not measured. Check square size with a ruler after printing.';

/** App version for provenance lines. */
export const APP_VERSION = '0.1.0';

// ── Review material-connection disclosures (FTC 16 CFR Part 255) ────

import type { MaterialConnection } from './reviews';

/** Visible label shown on each review card when materialConnection ≠ 'none'. */
export const MATERIAL_CONNECTION_LABEL: Record<Exclude<MaterialConnection, 'none'>, string> = {
  free_sample: 'Received a free sample',
  discount: 'Received a discount',
  insider: 'Works with Calib.Tools',
};
