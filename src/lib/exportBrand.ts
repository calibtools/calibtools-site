/**
 * Shared brand module for all file exports (PDF, SVG, DXF, config, zip).
 *
 * Every exporter imports from here — never hard-codes logos, text, or provenance.
 * Logo: bracket-framed wordmark only (positive on light, negative on dark, mono-black for single-colour).
 * Text: from claims.ts constants.
 */

import { BRAND_NAME, SITE_URL, CONTACT_EMAIL, PRINT_NOTE, APP_VERSION } from './claims';
import { patternSummary, brandLine } from './brand';
import { idRange } from './idRange';
import type { PatternSpec } from './patterns';

// Re-export for convenience
export { BRAND_NAME, SITE_URL, CONTACT_EMAIL, PRINT_NOTE, APP_VERSION };
export { patternSummary, brandLine };

// ---------------------------------------------------------------------------
// Inline wordmark SVGs (bracket-framed, from brand kit v1.0)
// Works offline and in the PWA — no fetch required.
// ---------------------------------------------------------------------------

/** Positive (black on white) — compact wordmark for pattern exports. */
export const WORDMARK_SVG_POSITIVE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="25.800 -740.200 7174.400 770.400" width="7174.400" height="770.400"><title>CALIB.TOOLS wordmark-compact positive</title><g fill="#000000"><path d="M383.0 16C577.0 16 689.0 -84 720.0 -270L516.0 -277C504.0 -190 462.0 -141 385.0 -141C294.0 -141 241.0 -224 241.0 -354C241.0 -480 289.0 -569 387.0 -569C455.0 -569 502.0 -522 516.0 -441L719.0 -448C688.0 -629 582.0 -726 387.0 -726C173.0 -726 40.0 -578 40.0 -354C40.0 -120 185.0 16 383.0 16Z"/><path d="M781.0 0H980.0L1020.0 -117H1276.0L1316.0 0H1516.0L1260.0 -710H1037.0ZM1072.0 -269 1149.0 -494 1225.0 -269Z"/><path d="M1617.0 0H2122.0V-157H1813.0V-710H1617.0Z"/><path d="M2232.0 0H2428.0V-710H2232.0Z"/><path d="M2582.0 0H2910.0C3093.0 0 3195.0 -63 3195.0 -196C3195.0 -295 3137.0 -354 3018.0 -366V-368C3114.0 -380 3165.0 -430 3165.0 -516C3165.0 -650 3061.0 -710 2880.0 -710H2582.0ZM2778.0 -425V-560H2872.0C2929.0 -560 2969.0 -540 2969.0 -492C2969.0 -446 2928.0 -425 2872.0 -425ZM2778.0 -150V-297H2897.0C2955.0 -297 2999.0 -274 2999.0 -223C2999.0 -172 2954.0 -150 2897.0 -150Z"/><path d="M3855.0 0H4052.0V-553H4259.0V-710H3648.0V-553H3855.0Z"/><path d="M4669.0 16C4894.0 16 5029.0 -126 5029.0 -354C5029.0 -582 4894.0 -726 4669.0 -726C4444.0 -726 4309.0 -582 4309.0 -354C4309.0 -126 4444.0 16 4669.0 16ZM4669.0 -141C4569.0 -141 4510.0 -218 4510.0 -354C4510.0 -490 4569.0 -569 4669.0 -569C4769.0 -569 4828.0 -490 4828.0 -354C4828.0 -218 4769.0 -141 4669.0 -141Z"/><path d="M5509.0 16C5734.0 16 5869.0 -126 5869.0 -354C5869.0 -582 5734.0 -726 5509.0 -726C5284.0 -726 5149.0 -582 5149.0 -354C5149.0 -126 5284.0 16 5509.0 16ZM5509.0 -141C5409.0 -141 5350.0 -218 5350.0 -354C5350.0 -490 5409.0 -569 5509.0 -569C5609.0 -569 5668.0 -490 5668.0 -354C5668.0 -218 5609.0 -141 5509.0 -141Z"/><path d="M5994.0 0H6499.0V-157H6190.0V-710H5994.0Z"/><path d="M6894.0 16C7078.0 16 7186.0 -69 7186.0 -208C7186.0 -320 7118.0 -393 6908.0 -430C6816.0 -446 6786.0 -466 6786.0 -510C6786.0 -547 6818.0 -572 6874.0 -572C6939.0 -572 6979.0 -533 6984.0 -468L7177.0 -476C7162.0 -623 7066.0 -726 6876.0 -726C6696.0 -726 6590.0 -636 6590.0 -504C6590.0 -373 6668.0 -322 6862.0 -282C6970.0 -260 6990.0 -238 6990.0 -200C6990.0 -158 6956.0 -138 6896.0 -138C6820.0 -138 6782.0 -177 6772.0 -247L6577.0 -238C6587.0 -82 6698.0 16 6894.0 16Z"/></g><rect x="3340.00" y="-196.00" width="196.00" height="196.00" fill="#E60012"/></svg>`;

/** Negative (white on dark) — compact wordmark for dark-background exports. */
export const WORDMARK_SVG_NEGATIVE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="25.800 -740.200 7174.400 770.400" width="7174.400" height="770.400"><title>CALIB.TOOLS wordmark-compact negative</title><g fill="#FFFFFF"><path d="M383.0 16C577.0 16 689.0 -84 720.0 -270L516.0 -277C504.0 -190 462.0 -141 385.0 -141C294.0 -141 241.0 -224 241.0 -354C241.0 -480 289.0 -569 387.0 -569C455.0 -569 502.0 -522 516.0 -441L719.0 -448C688.0 -629 582.0 -726 387.0 -726C173.0 -726 40.0 -578 40.0 -354C40.0 -120 185.0 16 383.0 16Z"/><path d="M781.0 0H980.0L1020.0 -117H1276.0L1316.0 0H1516.0L1260.0 -710H1037.0ZM1072.0 -269 1149.0 -494 1225.0 -269Z"/><path d="M1617.0 0H2122.0V-157H1813.0V-710H1617.0Z"/><path d="M2232.0 0H2428.0V-710H2232.0Z"/><path d="M2582.0 0H2910.0C3093.0 0 3195.0 -63 3195.0 -196C3195.0 -295 3137.0 -354 3018.0 -366V-368C3114.0 -380 3165.0 -430 3165.0 -516C3165.0 -650 3061.0 -710 2880.0 -710H2582.0ZM2778.0 -425V-560H2872.0C2929.0 -560 2969.0 -540 2969.0 -492C2969.0 -446 2928.0 -425 2872.0 -425ZM2778.0 -150V-297H2897.0C2955.0 -297 2999.0 -274 2999.0 -223C2999.0 -172 2954.0 -150 2897.0 -150Z"/><path d="M3855.0 0H4052.0V-553H4259.0V-710H3648.0V-553H3855.0Z"/><path d="M4669.0 16C4894.0 16 5029.0 -126 5029.0 -354C5029.0 -582 4894.0 -726 4669.0 -726C4444.0 -726 4309.0 -582 4309.0 -354C4309.0 -126 4444.0 16 4669.0 16ZM4669.0 -141C4569.0 -141 4510.0 -218 4510.0 -354C4510.0 -490 4569.0 -569 4669.0 -569C4769.0 -569 4828.0 -490 4828.0 -354C4828.0 -218 4769.0 -141 4669.0 -141Z"/><path d="M5509.0 16C5734.0 16 5869.0 -126 5869.0 -354C5869.0 -582 5734.0 -726 5509.0 -726C5284.0 -726 5149.0 -582 5149.0 -354C5149.0 -126 5284.0 16 5509.0 16ZM5509.0 -141C5409.0 -141 5350.0 -218 5350.0 -354C5350.0 -490 5409.0 -569 5509.0 -569C5609.0 -569 5668.0 -490 5668.0 -354C5668.0 -218 5609.0 -141 5509.0 -141Z"/><path d="M5994.0 0H6499.0V-157H6190.0V-710H5994.0Z"/><path d="M6894.0 16C7078.0 16 7186.0 -69 7186.0 -208C7186.0 -320 7118.0 -393 6908.0 -430C6816.0 -446 6786.0 -466 6786.0 -510C6786.0 -547 6818.0 -572 6874.0 -572C6939.0 -572 6979.0 -533 6984.0 -468L7177.0 -476C7162.0 -623 7066.0 -726 6876.0 -726C6696.0 -726 6590.0 -636 6590.0 -504C6590.0 -373 6668.0 -322 6862.0 -282C6970.0 -260 6990.0 -238 6990.0 -200C6990.0 -158 6956.0 -138 6896.0 -138C6820.0 -138 6782.0 -177 6772.0 -247L6577.0 -238C6587.0 -82 6698.0 16 6894.0 16Z"/></g><rect x="3340.00" y="-196.00" width="196.00" height="196.00" fill="#E60012"/></svg>`;

/** Wordmark viewBox dimensions (compact wordmark — read from SVG, never a literal). */
export const WORDMARK_VB = { minX: 25.8, minY: -740.2, width: 7174.4, height: 770.4 } as const;

/** Aspect ratio (w/h) of the compact wordmark. */
export const WORDMARK_ASPECT = WORDMARK_VB.width / WORDMARK_VB.height; // ≈ 9.313

// ---------------------------------------------------------------------------
// SVG path data (extracted from the positive wordmark for PDF rendering)
// ---------------------------------------------------------------------------

/** All <path d="..."> from the wordmark SVG, for pdf-lib drawSvgPath. */
export const WORDMARK_PATHS: readonly string[] = [
  'M383.0 16C577.0 16 689.0 -84 720.0 -270L516.0 -277C504.0 -190 462.0 -141 385.0 -141C294.0 -141 241.0 -224 241.0 -354C241.0 -480 289.0 -569 387.0 -569C455.0 -569 502.0 -522 516.0 -441L719.0 -448C688.0 -629 582.0 -726 387.0 -726C173.0 -726 40.0 -578 40.0 -354C40.0 -120 185.0 16 383.0 16Z',
  'M781.0 0H980.0L1020.0 -117H1276.0L1316.0 0H1516.0L1260.0 -710H1037.0ZM1072.0 -269 1149.0 -494 1225.0 -269Z',
  'M1617.0 0H2122.0V-157H1813.0V-710H1617.0Z',
  'M2232.0 0H2428.0V-710H2232.0Z',
  'M2582.0 0H2910.0C3093.0 0 3195.0 -63 3195.0 -196C3195.0 -295 3137.0 -354 3018.0 -366V-368C3114.0 -380 3165.0 -430 3165.0 -516C3165.0 -650 3061.0 -710 2880.0 -710H2582.0ZM2778.0 -425V-560H2872.0C2929.0 -560 2969.0 -540 2969.0 -492C2969.0 -446 2928.0 -425 2872.0 -425ZM2778.0 -150V-297H2897.0C2955.0 -297 2999.0 -274 2999.0 -223C2999.0 -172 2954.0 -150 2897.0 -150Z',
  'M3855.0 0H4052.0V-553H4259.0V-710H3648.0V-553H3855.0Z',
  'M4669.0 16C4894.0 16 5029.0 -126 5029.0 -354C5029.0 -582 4894.0 -726 4669.0 -726C4444.0 -726 4309.0 -582 4309.0 -354C4309.0 -126 4444.0 16 4669.0 16ZM4669.0 -141C4569.0 -141 4510.0 -218 4510.0 -354C4510.0 -490 4569.0 -569 4669.0 -569C4769.0 -569 4828.0 -490 4828.0 -354C4828.0 -218 4769.0 -141 4669.0 -141Z',
  'M5509.0 16C5734.0 16 5869.0 -126 5869.0 -354C5869.0 -582 5734.0 -726 5509.0 -726C5284.0 -726 5149.0 -582 5149.0 -354C5149.0 -126 5284.0 16 5509.0 16ZM5509.0 -141C5409.0 -141 5350.0 -218 5350.0 -354C5350.0 -490 5409.0 -569 5509.0 -569C5609.0 -569 5668.0 -490 5668.0 -354C5668.0 -218 5609.0 -141 5509.0 -141Z',
  'M5994.0 0H6499.0V-157H6190.0V-710H5994.0Z',
  'M6894.0 16C7078.0 16 7186.0 -69 7186.0 -208C7186.0 -320 7118.0 -393 6908.0 -430C6816.0 -446 6786.0 -466 6786.0 -510C6786.0 -547 6818.0 -572 6874.0 -572C6939.0 -572 6979.0 -533 6984.0 -468L7177.0 -476C7162.0 -623 7066.0 -726 6876.0 -726C6696.0 -726 6590.0 -636 6590.0 -504C6590.0 -373 6668.0 -322 6862.0 -282C6970.0 -260 6990.0 -238 6990.0 -200C6990.0 -158 6956.0 -138 6896.0 -138C6820.0 -138 6782.0 -177 6772.0 -247L6577.0 -238C6587.0 -82 6698.0 16 6894.0 16Z',
];

/** Frame bracket rects — empty for compact wordmark (no brackets). */
export const WORDMARK_FRAME_RECTS: readonly (readonly [number, number, number, number])[] = [];

/** Red dot rect: [x, y, w, h] in SVG coordinates. */
export const WORDMARK_DOT_RECT: readonly [number, number, number, number] = [3340, -196, 196, 196];

// ---------------------------------------------------------------------------
// Text line builders
// ---------------------------------------------------------------------------

/**
 * Parameter line for a pattern spec.
 * Format: "ChArUco · DICT_6X6_250 · 7×10 · 25/18 mm · IDs 0–34"
 */
export function parameterLine(s: PatternSpec): string {
  return patternSummary(s);
}

/**
 * Provenance line for file footers.
 * Format: "Generated with calib.tools/tools/generator · 2026-10-28 · v0.1.0"
 */
export function provenanceLine(toolSlug = 'generator', date?: string): string {
  const iso = date ?? new Date().toISOString().slice(0, 10);
  return `Generated with ${SITE_URL}/tools/${toolSlug} \u00B7 ${iso} \u00B7 v${APP_VERSION}`;
}

// ---------------------------------------------------------------------------
// SVG wordmark embed helper (for SVG exports)
// ---------------------------------------------------------------------------

/**
 * Returns an SVG `<g>` element containing the bracket-framed wordmark
 * positioned at (x, y) mm with a given height in mm.
 */
export function wordmarkSvgGroup(opts: {
  x: number;
  y: number;
  heightMm: number;
  variant?: 'positive' | 'negative';
}): string {
  const { x, y, heightMm, variant = 'positive' } = opts;
  const scale = heightMm / WORDMARK_VB.height;
  const widthMm = WORDMARK_VB.width * scale;
  // Translate so the viewBox minX/minY maps to (x, y)
  const tx = x - WORDMARK_VB.minX * scale;
  const ty = y - WORDMARK_VB.minY * scale;
  const svg = variant === 'positive' ? WORDMARK_SVG_POSITIVE : WORDMARK_SVG_NEGATIVE;
  // Strip the outer <svg> wrapper, keep inner content
  const inner = svg.replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '');
  return `<g transform="translate(${tx},${ty}) scale(${scale})" aria-label="${BRAND_NAME} wordmark">${inner}</g>`;
}
