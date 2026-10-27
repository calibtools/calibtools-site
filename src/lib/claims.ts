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

/** Primary tagline — used for the home H1, <title> suffix, OG fallback. */
export const TAGLINE = 'Measured before it ships';
