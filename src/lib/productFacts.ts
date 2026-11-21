/**
 * Key facts of a product page as label/value pairs, for the Product structured data (additionalProperty)
 * and the Markdown version. Not rendered as a block on the page (owner's call 2026-11-19: no extra table in
 * the UI). Explicit `facts` in the content file win; otherwise made-to-order targets use the key specs the
 * page shows (each decide-spec looked up in the spec table, `keySpecs`), plus the supported software and how
 * ordering works. Only when the page has no spec table are the decide-specs paired with the chips: chips are
 * short card labels and do not always line up (HALCON plate: "Substrate: 6 mm", "Flatness: 200–800 mm").
 */
export interface Fact { label: string; value: string }

interface ProductData {
  facts?: Fact[];
  decideSpecs?: readonly string[];
  chips?: readonly string[];
  compat?: { tool: string }[];
}

export function productFacts(
  data: ProductData | undefined,
  opts: { madeToOrder?: boolean; keySpecs?: readonly Fact[] } = {},
): Fact[] {
  if (!data) return [];
  if (data.facts && data.facts.length > 0) return data.facts;
  // Stock products carry their full spec sheet on the page already, and their chips are card labels
  // that do not line up with the decide-specs; only made-to-order pages pair the two.
  if (!opts.madeToOrder) return [];
  const out: Fact[] = [];
  if (opts.keySpecs && opts.keySpecs.length > 0) {
    for (const k of opts.keySpecs) if (k.value) out.push({ label: k.label, value: k.value });
  } else {
    (data.decideSpecs ?? []).forEach((label, i) => {
      const value = data.chips?.[i];
      if (value) out.push({ label, value });
    });
  }
  if (out.length === 0) return [];
  const tools = (data.compat ?? []).map((c) => c.tool).filter(Boolean);
  if (tools.length > 0) out.push({ label: 'Software', value: tools.join(', ') });
  if (opts.madeToOrder) out.push({ label: 'Ordering', value: 'Made to order; layout, price and delivery time confirmed with the quote' });
  return out;
}

export function factsJsonLd(facts: Fact[]) {
  return facts.map((f) => ({ '@type': 'PropertyValue', name: f.label, value: f.value }));
}
