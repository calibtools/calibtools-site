/**
 * Key facts of a product page as label/value pairs, for the Product structured data (additionalProperty)
 * and the Markdown version. Not rendered as a block on the page (owner's call 2026-11-19: no extra table in
 * the UI). Explicit `facts` in the content file win; otherwise made-to-order targets pair their three
 * decide-specs with the chips, plus the supported software and how ordering works.
 */
export interface Fact { label: string; value: string }

interface ProductData {
  facts?: Fact[];
  decideSpecs?: readonly string[];
  chips?: readonly string[];
  compat?: { tool: string }[];
}

export function productFacts(data: ProductData | undefined, opts: { madeToOrder?: boolean } = {}): Fact[] {
  if (!data) return [];
  if (data.facts && data.facts.length > 0) return data.facts;
  // Stock products carry their full spec sheet on the page already, and their chips are card labels
  // that do not line up with the decide-specs; only made-to-order pages pair the two.
  if (!opts.madeToOrder) return [];
  const out: Fact[] = [];
  (data.decideSpecs ?? []).forEach((label, i) => {
    const value = data.chips?.[i];
    if (value) out.push({ label, value });
  });
  if (out.length === 0) return [];
  const tools = (data.compat ?? []).map((c) => c.tool).filter(Boolean);
  if (tools.length > 0) out.push({ label: 'Software', value: tools.join(', ') });
  if (opts.madeToOrder) out.push({ label: 'Ordering', value: 'Made to order; layout, price and delivery time confirmed with the quote' });
  return out;
}

export function factsJsonLd(facts: Fact[]) {
  return facts.map((f) => ({ '@type': 'PropertyValue', name: f.label, value: f.value }));
}
