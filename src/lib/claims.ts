/**
 * Centralised wording for shipping, inspection and legal claims.
 * Import these constants everywhere — never hard-code location or lead-time text.
 */

/** Footer copyright line (no location). */
export const FOOTER_LINE = '\u00A9 2026 Calib.Tools';

/** Lead-time / availability one-liner for product pages and datasheets. */
export const LEAD_TIME = 'Made to order \u00B7 ships in 2\u20133 weeks';

/** Short shipping origin label for the purchase table header. */
export const SHIPS_FROM = 'Ships from the factory';

/** Inspection claim for product pages and datasheets. */
export const INSPECTION_CLAIM =
  'Measured before it ships \u2014 against a DAkkS-calibrated reference';

/** Certificate add-on claim. */
export const CERT_CLAIM =
  'ILAC-MRA certificate from a CNAS-accredited laboratory (add-on)';

/** Default Incoterm (to be confirmed). */
export const INCOTERM = 'DAP' as const;

// ── Material specs ───────────────────────────────────────────────────

/** Ceramic feature accuracy (lithography on alumina). */
export const CERAMIC_ACCURACY = '\u00B12 \u00B5m';

/** Composite feature tolerance (UV flatbed on aluminium composite). */
export const COMPOSITE_TOLERANCE = '\u00B10.3 mm + 0.2 mm/m';

/** Composite flatness specification. */
export const COMPOSITE_FLATNESS = '\u22640.5 mm per metre (three-point support)';

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
