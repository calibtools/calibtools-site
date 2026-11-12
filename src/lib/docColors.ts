/**
 * Colors for everything that leaves the site as a file: datasheets, inspection reports,
 * pattern PDFs. One place, same values as the site tokens in src/styles/global.css
 * (a test compares the two). PDF pages stay white because they are printed; patterns stay
 * pure black on pure white.
 */
export const DOC_COLORS = {
  black: '#000000',
  white: '#FFFFFF',
  /** Fills, graphics and large text: the wordmark dot, the X axis. */
  red: '#E60012',
  /** Every normal-size red text. */
  redText: '#B3000E',
  /** Table header ground. */
  redTint: '#FBE9EA',
  ink: '#141414',
  inkMuted: '#4A4A47',
  inkSoft: '#6B6A66',
  lineStrong: '#A8A59C',
  /** Zebra rows and hairlines. */
  paperAlt: '#EAE8E2',
  /** Note and code grounds. */
  paper: '#F4F3EF',
  /** Y axis, as printed on the boards. */
  axisGreen: '#00A651',
} as const;

/** `#RRGGBB` as three numbers from 0 to 1, the form pdf-lib takes. */
export function hexToUnitRgb(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) throw new Error(`not a #RRGGBB color: ${hex}`);
  return [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255];
}
