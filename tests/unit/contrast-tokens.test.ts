import { describe, it, expect } from 'vitest';

/**
 * CONTRAST-1 guard: WCAG 2.1 contrast ratio for every brand-on-surface pair.
 *
 * Computes relative luminance per WCAG 2.1 and verifies that every
 * (text colour, surface) pair marked as "on" meets 4.5:1.
 */

/** Parse "R G B" triplet or hex to [r, g, b] in 0–255. */
function parseColour(raw: string): [number, number, number] {
  const trimmed = raw.trim();
  if (trimmed.startsWith('#')) {
    const hex = trimmed.slice(1);
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ];
  }
  const parts = trimmed.split(/\s+/).map(Number);
  return [parts[0], parts[1], parts[2]];
}

/** WCAG 2.1 relative luminance. */
function luminance([r, g, b]: [number, number, number]): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/** WCAG contrast ratio between two colours. */
function contrastRatio(a: [number, number, number], b: [number, number, number]): number {
  const la = luminance(a);
  const lb = luminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

// ── Token definitions (from global.css) ──

const brandTokens = {
  brand:        '230 0 18',    // #E60012
  'brand-dark': '179 0 14',    // #B3000E
  'brand-on-dark': '255 77 77', // #FF4D4D
  'brand-text-light': '230 0 18',
  'brand-text-dark': '255 59 71', // #FF3B47
} as const;

const surfaces = {
  'ground-light': '255 255 255',
  'ground-dark':  '10 10 10',
  'ground-alt-light': '242 242 242',
  'ground-alt-dark': '17 17 17',
  'ground-panel-dark': '22 22 22',
} as const;

// ── Pairs that must pass 4.5:1 ──
// Format: [text token, surface token]
const requiredPairs: [keyof typeof brandTokens, keyof typeof surfaces][] = [
  // brand-on-dark must work on all dark surfaces
  ['brand-on-dark', 'ground-dark'],
  ['brand-on-dark', 'ground-alt-dark'],
  ['brand-on-dark', 'ground-panel-dark'],
  // brand-dark must work on light surfaces
  ['brand-dark', 'ground-light'],
  ['brand-dark', 'ground-alt-light'],
  // brand-text-dark on dark ground
  ['brand-text-dark', 'ground-dark'],
  ['brand-text-dark', 'ground-alt-dark'],
  // brand on white (large headings, icons — not used as body text on ground-alt)
  ['brand', 'ground-light'],
];

describe('WCAG contrast: brand tokens on surfaces', () => {
  for (const [textKey, surfaceKey] of requiredPairs) {
    it(`${textKey} on ${surfaceKey} ≥ 4.5:1`, () => {
      const fg = parseColour(brandTokens[textKey]);
      const bg = parseColour(surfaces[surfaceKey]);
      const ratio = contrastRatio(fg, bg);
      expect(ratio, `${textKey} on ${surfaceKey}: ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    });
  }
});
