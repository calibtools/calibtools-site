/**
 * Helpers for long-form product page content (markdown body of
 * src/content/products/<handle>.md): internal links, SKU anchors and
 * one-line SKU titles shown in the ordering table.
 */

export interface SkuNote {
  partNumber: string;
  title: string;
}

/** Split a markdown file into frontmatter text and body. */
export function splitFrontmatter(raw: string): { frontmatter: string; body: string } {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  return m ? { frontmatter: m[1], body: m[2] } : { frontmatter: '', body: raw };
}

/** Words in the body (frontmatter excluded). */
export function bodyWordCount(raw: string): number {
  const { body } = splitFrontmatter(raw);
  return body.split(/\s+/).filter(Boolean).length;
}

/** Site-internal link targets in markdown (`[text](/path/)`), without the #fragment. */
export function extractInternalLinks(md: string): string[] {
  const out: string[] = [];
  for (const m of md.matchAll(/\]\((\/[^)\s]*)\)/g)) {
    out.push(m[1].split('#')[0]);
  }
  return out;
}

/** Row anchor for a part number: dictionary placeholder removed, e.g. CT-CHA-P-400X300. */
export function skuAnchor(partNumber: string): string {
  return partNumber.replace(/-\{[A-Z0-9|]+\}$/, '').trim();
}

/** One-line title for an ordering-table row, matched by anchor. */
export function skuTitleFor(partNumber: string, skus: SkuNote[] | undefined): string | undefined {
  const key = skuAnchor(partNumber);
  return skus?.find((s) => skuAnchor(s.partNumber) === key)?.title;
}

/** Site-internal `href: "/..."` values in frontmatter (relatedTargets, relatedGuides, links). */
export function extractFrontmatterHrefs(frontmatter: string): string[] {
  return [...frontmatter.matchAll(/href:\s*"?(\/[^"\s,}]*)/g)].map((m) => m[1].split('#')[0]);
}
