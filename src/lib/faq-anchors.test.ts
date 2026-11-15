import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { faqGroups, faqItemId } from './faq-groups';

describe('FAQ anchors', () => {
  const ids = faqGroups.flatMap((g) => g.items.map((i) => faqItemId(i.question)));
  it('every question has a unique, URL-safe id', () => {
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^q-[a-z0-9]+(-[a-z0-9]+)*$/);
  });
  it('question ids do not collide with group ids', () => {
    for (const g of faqGroups) expect(ids).not.toContain(g.id);
  });
  it('the page puts the id on the folded item, which the site-wide hash handler opens', () => {
    expect(readFileSync('src/pages/faq.astro', 'utf8')).toContain('<details id={faqItemId(item.question)}');
    expect(readFileSync('src/layouts/Base.astro', 'utf8')).toContain('openDisclosuresFor(el)');
  });
});
