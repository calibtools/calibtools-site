/**
 * Claims blacklist — phrases that must not appear in customer-facing copy.
 *
 * Shared by tests/claims-blacklist.test.ts and scripts/live-scan.mjs.
 */

export interface BlacklistRule {
  /** Human-readable label for error messages. */
  label: string;
  /** RegExp to test against each line of text (case-insensitive). */
  pattern: RegExp;
}

/**
 * Each rule matches a single line. Patterns are case-insensitive.
 */
export const BLACKLIST_RULES: BlacklistRule[] = [
  // "inspection report" + "included/includes" in the same sentence (not crossing . ? ! \n); "included inspection"
  {
    label: '"inspection report" with "included/includes" or "included inspection"',
    pattern: /(?:inspection\s+report[^.?!\n]*?\b(?:included|includes)\b|(?:included|includes)\b[^.?!\n]*?inspection\s+report|\bincluded\s+inspection\b)/i,
  },
  // "report included" standalone
  { label: '"report included" standalone', pattern: /\breport\s+included\b/i },
  // Geographic origin claims
  { label: '"ships from Germany"', pattern: /\bships\s+from\s+Germany\b/i },
  { label: '"Munich"', pattern: /\bMunich\b/i },
  { label: '"made in Germany"', pattern: /\bmade\s+in\s+Germany\b/i },
  // Overstated certification claims
  { label: '"ISO 17025 certified"', pattern: /\bISO\s+17025\s+certified\b/i },
  {
    label: '"accredited" + "certificate included"',
    pattern: /\baccredited\b.*?\bcertificate\s+included\b/i,
  },
  // Brand misuse — "calib tools" as two lowercase words (not "Calib.Tools" or "calib.tools")
  { label: '"calib tools" (brand misuse)', pattern: /\bcalib\s+tools\b/ },
  // Placeholder text
  {
    label: 'bracketed ALL-CAPS placeholder',
    pattern: /\[[A-Z][A-Z\s]{2,}\]/,
  },
  { label: '"[BODY COPY]" placeholder', pattern: /\[BODY\s+COPY\]/i },
  { label: '"Lorem ipsum"', pattern: /\bLorem\s+ipsum\b/i },
  { label: '"TODO" in customer copy', pattern: /\bTODO\b/ },
];

/**
 * Parse BLOCKED_NAMES env var into blacklist rules.
 * Returns an empty array if the var is unset or empty.
 */
export function blockedNameRules(): BlacklistRule[] {
  const raw = process.env.BLOCKED_NAMES;
  if (!raw) return [];
  return raw
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean)
    .map((name) => ({
      label: `blocked name`,
      pattern: new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'),
    }));
}
