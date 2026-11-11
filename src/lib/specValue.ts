/**
 * Splits a specification value into the figure and the condition it holds under,
 * so the key-spec strip can set them apart (DESIGN.md, spec strip: label, value, condition).
 *   "±0.3 mm + 0.2 mm/m (any corner to nominal grid, at 20 °C)" → value, condition in brackets
 *   "≤ 0.5 mm per meter, three-point support"                    → value, condition after the comma
 * Short values are left whole.
 */
export function splitSpecValue(raw: string): { value: string; cond: string } {
  const text = raw.trim();
  const bracket = /^(.+?)\s*\((.+)\)$/.exec(text);
  if (bracket) return { value: bracket[1].trim(), cond: bracket[2].trim() };
  const comma = text.indexOf(', ');
  if (comma > 0 && text.length > 24) return { value: text.slice(0, comma).trim(), cond: text.slice(comma + 2).trim() };
  return { value: text, cond: '' };
}
