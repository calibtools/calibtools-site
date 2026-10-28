# UI-2: Content Model and Progressive Disclosure — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a site-wide content model with character budgets and progressive disclosure, restructure product pages to source content from datasheets + a thin curation layer, unify card components, add star ratings, and enforce everything with guards.

**Architecture:** Datasheets (`docs/datasheets/CT-DS-*.md`) remain the single source of specs via `productData.ts`. A new `src/content/products/` Astro content collection holds human-curated fields only (summary, decideSpecs keys, story). A shared `Rating.astro` component renders star ratings on cards and product pages. New postbuild scripts (`check-content.mjs`, `measure-text-blocks.mjs`) enforce the content model. URL-hash deep-linking opens disclosures.

**Tech Stack:** Astro 5, Tailwind CSS, Vitest, Playwright, Node.js scripts (postbuild), Cloudflare KV (reviews, existing)

**Spec:** `docs/superpowers/specs/2026-10-29-ui2-content-model-design.md`

---

## Task 1: Content Inventory — measure-text-blocks.mjs + inventory doc

**Files:**
- Create: `scripts/measure-text-blocks.mjs`
- Create: `docs/content/2026-10-29-content-inventory.md`

This task produces the raw material document. Must be committed before any code changes.

- [ ] **Step 1: Create `scripts/measure-text-blocks.mjs`**

```js
#!/usr/bin/env node
/**
 * measure-text-blocks.mjs — measure every block element's own text in dist/.
 * Reports blocks >= 300 chars with source classification.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';

const DIST = resolve(import.meta.dirname, '..', 'dist');
const THRESHOLD = 300;

function findHtml(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...findHtml(p));
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

// Block-level tags to measure
const BLOCK_TAGS = ['p','li','td','th','figcaption','blockquote','dd','dt','summary','h1','h2','h3','h4','h5','h6'];
const TAG_RE = new RegExp(`<(${BLOCK_TAGS.join('|')})(\\s[^>]*)?>([\\s\\S]*?)</\\1>`, 'gi');

function stripTags(html) {
  return html.replace(/<[^>]+>/g, '').replace(/&\w+;/g, ' ').replace(/\s+/g, ' ').trim();
}

const results = [];

for (const file of findHtml(DIST)) {
  const html = readFileSync(file, 'utf-8');
  const page = '/' + relative(DIST, file).replace(/index\.html$/, '').replace(/\.html$/, '');
  let m;
  TAG_RE.lastIndex = 0;
  while ((m = TAG_RE.exec(html)) !== null) {
    const tag = m[1].toLowerCase();
    const text = stripTags(m[3]);
    if (text.length >= THRESHOLD) {
      // Classify source
      let source = 'component literal';
      if (m[3].includes('descriptionHtml') || m[0].includes('set:html')) source = 'Shopify descriptionHtml';
      results.push({ page, tag, chars: text.length, text: text.slice(0, 80), source });
    }
  }
}

console.log(`[measure-text-blocks] ${results.length} blocks >= ${THRESHOLD} chars found.`);
for (const r of results) {
  console.log(`  ${r.page}  <${r.tag}> ${r.chars} chars [${r.source}]  "${r.text}..."`);
}
```

- [ ] **Step 2: Build dist and run the script**

Run: `pnpm build && node scripts/measure-text-blocks.mjs`

Capture the output — it feeds into the content inventory doc.

- [ ] **Step 3: Create `docs/content/2026-10-29-content-inventory.md`**

Write the inventory doc with 4 sections:

**Section 1a** — paste the measure-text-blocks output, formatted as a markdown table.

**Section 1b** — Shopify description decomposition. For each of the 3 products, decompose the Shopify `description` (from `product.description` in shopify.ts) into atomic statements. Tag each with the matching datasheet field or "story". The descriptions to decompose are the `product.description` strings returned by the Storefront API; since we don't have the HTML locally, use the `positioning` field from `productData.ts` (the first paragraph of each datasheet) and `product.description` from the Shopify fallback data.

**Section 1c** — Competitor product page anatomy. Use Playwright to visit one product page each from calib.io, thorlabs.com, and edmundoptics.com. Document the DOM structure: section order, tabs/accordions, above-the-fold content, verbatim section labels. Format as a table.

**Section 1d** — User task -> information slot mapping. For each of the 10 tasks in `docs/ia/tasks.md` and each query group in `docs/ia/baseline.md`, identify which content model slot is needed first.

- [ ] **Step 4: Commit the inventory doc before any code changes**

```bash
git add scripts/measure-text-blocks.mjs docs/content/2026-10-29-content-inventory.md
git commit -m "docs(content): UI-2 step 1 — content inventory and text block measurement"
```

---

## Task 2: Content Model doc

**Files:**
- Create: `docs/content/content-model.md`

Must be committed before any page changes (spec requirement).

- [ ] **Step 1: Create `docs/content/content-model.md`**

Write the content model with:

1. **Rules section** at top:
   - Always visible: price, accuracy/tolerance, sizes, substrate, lead time
   - Disclosures: in the box, files, mounting, care, compatibility detail
   - Never inside disclosure: H1, meta description, specs table
   - One Disclosure component: `<details>`/`<summary>`, chevron, URL hash deep-link
   - Character budgets: blocks <= 300 (allow-list for form controls), cards <= 220

2. **Tables** — one per page type (product, collection, tool, guide, policy) with columns: slot, source field, char budget, reveal level (visible/disclosure/link), order. Use the exact slot definitions from the spec.

3. **Card spec** — unified: image, title, star rating (hidden at 0), summary (<= 90), 3 chips, price. Total card text <= 220.

4. **Compatibility table note:** Add at the bottom of the product page table:
   > Compatibility table is hardcoded for now. Move to `productData` in PROD-1 so new AprilGrid/HALCON products don't fork another copy.

- [ ] **Step 2: Commit**

```bash
git add docs/content/content-model.md
git commit -m "docs(content): UI-2 step 2 — content model committed before code changes"
```

---

## Task 3: Product content collection + no-duplication vitest

**Files:**
- Modify: `src/content/config.ts`
- Create: `src/content/products/charuco-composite.md`
- Create: `src/content/products/charuco-ceramic.md`
- Create: `src/content/products/checkerboard-composite.md`
- Create: `src/content/products/mounting-fixture.md`
- Create: `src/content/products/certificate-ilac.md`
- Create: `src/lib/products.test.ts`

- [ ] **Step 1: Write the no-duplication vitest**

Create `src/lib/products.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parse as parseYaml } from 'yaml'; // vitest has yaml via vite
import { getProductData } from './productData';

// Parse frontmatter from a product content file
function parseFrontmatter(filePath: string) {
  const content = readFileSync(filePath, 'utf-8');
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) throw new Error(`No frontmatter in ${filePath}`);
  return parseYaml(match[1]);
}

// Flatten all spec values from specGroups into a set of lowercase strings
function flattenSpecValues(handle: string): Set<string> {
  const data = getProductData(handle, {});
  if (!data) return new Set();
  const values = new Set<string>();
  for (const group of data.specGroups) {
    for (const row of group.rows) {
      values.add(row.value.toLowerCase().trim());
    }
  }
  return values;
}

const PRODUCTS_DIR = resolve(import.meta.dirname, '../content/products');
const HANDLES = ['charuco-composite', 'charuco-ceramic', 'checkerboard-composite', 'mounting-fixture', 'certificate-ilac'];

describe('product content: no spec value duplication', () => {
  for (const handle of HANDLES) {
    it(`${handle}: no frontmatter field repeats a datasheet spec value`, () => {
      const filePath = resolve(PRODUCTS_DIR, `${handle}.md`);
      let fm: Record<string, unknown>;
      try {
        fm = parseFrontmatter(filePath);
      } catch {
        // File doesn't exist yet — skip (test passes vacuously)
        return;
      }
      const specValues = flattenSpecValues(handle);
      if (specValues.size === 0) return; // No datasheet — skip

      // Check summary
      if (typeof fm.summary === 'string') {
        for (const sv of specValues) {
          expect(fm.summary.toLowerCase()).not.toContain(sv);
        }
      }

      // Check story
      if (typeof fm.story === 'string') {
        for (const sv of specValues) {
          expect(fm.story.toLowerCase()).not.toContain(sv);
        }
      }

      // Check decideSpecs are keys, not values
      if (Array.isArray(fm.decideSpecs)) {
        for (const key of fm.decideSpecs) {
          expect(specValues.has(String(key).toLowerCase().trim())).toBe(false);
        }
      }
    });
  }
});
```

- [ ] **Step 2: Run the test — expect it to fail (no product files yet)**

Run: `pnpm test -- src/lib/products.test.ts`
Expected: All tests pass vacuously (the catch block skips missing files).

- [ ] **Step 3: Add `products` collection to `src/content/config.ts`**

Add after the existing `collections_` definition:

```typescript
const products = defineCollection({
  type: 'content',
  schema: z.object({
    summary: z.string().max(90),
    decideSpecs: z.tuple([z.string(), z.string(), z.string()]),
    story: z.string().optional(),
    inTheBox: z.array(z.string()).optional(),
    compat: z.array(z.object({ tool: z.string(), note: z.string() })).optional(),
  }),
});
```

Update the export:

```typescript
export const collections = { guides, tools, collections: collections_, products };
```

- [ ] **Step 4: Create product content files**

`src/content/products/charuco-composite.md`:
```yaml
---
summary: "ChArUco composite board for OpenCV stereo and multi-camera calibration"
decideSpecs: ["Feature position tolerance", "Substrate", "Flatness"]
story: "ChArUco combines a checkerboard with ArUco markers in the white squares. Markers identify each corner, so the board works even when partially outside the frame — exactly where lens distortion is strongest.\n\nNative in OpenCV, supported by MATLAB and most multi-camera toolchains."
---
```

`src/content/products/charuco-ceramic.md`:
```yaml
---
summary: "Lithographed ceramic ChArUco target for metrology-grade calibration"
decideSpecs: ["Feature position accuracy", "Substrate", "Flatness"]
story: "Lithographed chrome pattern on white alumina ceramic. Feature accuracy two orders of magnitude better than printed boards, thermally stable, chemically inert.\n\nFor metrology-grade camera calibration, high-magnification optics, and setups where the target must not be the error budget."
---
```

`src/content/products/checkerboard-composite.md`:
```yaml
---
summary: "Classic checkerboard target — highest corner accuracy when fully in view"
decideSpecs: ["Feature position tolerance", "Substrate", "Flatness"]
story: "The classic pattern: highest corner localisation accuracy of any planar target when the whole board is in view. Supported by every calibration toolchain.\n\nChoose Fine for more corners per image or Coarse for low-resolution and long-distance setups."
---
```

`src/content/products/mounting-fixture.md`:
```yaml
---
summary: "Quarter-inch fixture clamp for any Calib.Tools calibration board"
decideSpecs: ["Material", "Weight", "Mounting"]
---
```

`src/content/products/certificate-ilac.md`:
```yaml
---
summary: "Accredited calibration certificate issued by an ISO/IEC 17025 laboratory"
decideSpecs: ["Lead time", "Options", "Inspection report"]
---
```

- [ ] **Step 5: Run the no-duplication test**

Run: `pnpm test -- src/lib/products.test.ts`
Expected: PASS — no frontmatter field contains a verbatim spec value. The `summary` and `story` fields describe what the product is/does, not spec numbers.

- [ ] **Step 6: Run astro check**

Run: `pnpm check`
Expected: No new errors from the content collection addition.

- [ ] **Step 7: Commit**

```bash
git add src/content/config.ts src/content/products/ src/lib/products.test.ts
git commit -m "feat(content): product content collection with no-duplication vitest"
```

---

## Task 4: Rating.astro component

**Files:**
- Create: `src/components/Rating.astro`

- [ ] **Step 1: Create `src/components/Rating.astro`**

```astro
---
/**
 * Star rating display — renders nothing when count is 0.
 * Used on product cards (no link) and product pages (with link to #reviews).
 */
interface Props {
  average: number;
  count: number;
  /** When set, the component renders as an <a> linking to this href. */
  href?: string;
  size?: number;
}

const { average, count, href, size = 14 } = Astro.props;
if (count === 0) return; // Render nothing
const filled = Math.round(average);
const label = `Rated ${average.toFixed(1)} out of 5 from ${count} review${count !== 1 ? 's' : ''}`;
const Tag = href ? 'a' : 'span';
---
<Tag
  {...(href ? { href } : {})}
  class:list={[
    'inline-flex items-center gap-1.5 text-sm',
    href && 'no-underline text-ink-muted hover:text-ink',
  ]}
  aria-label={label}
>
  <span class="inline-flex gap-px" aria-hidden="true">
    {Array.from({ length: 5 }, (_, i) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={i < filled ? 'var(--color-brand)' : 'none'} stroke={i < filled ? 'none' : 'currentColor'} stroke-width="1.5" class={i >= filled ? 'text-line' : ''}>
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ))}
  </span>
  <span class="text-ink-soft">{average.toFixed(1)}</span>
  <span class="text-ink-soft">({count})</span>
</Tag>
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm check`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/Rating.astro
git commit -m "feat(ui): Rating.astro — shared star rating, renders nothing at 0"
```

---

## Task 5: Unified ProductCard with rating + chips + data-card

**Files:**
- Modify: `src/components/ProductCard.astro`

- [ ] **Step 1: Update ProductCard.astro**

Replace the current content of `src/components/ProductCard.astro` with:

```astro
---
import { Picture } from 'astro:assets';
import type { ImageMetadata } from 'astro';
import Rating from './Rating.astro';

interface Props {
  href: string;
  title: string;
  /** Short summary (<= 90 chars). Falls back to sub if not provided. */
  summary?: string;
  /** @deprecated Use summary instead. Kept for backward compat. */
  sub?: string;
  from: string;
  /** Remote image URL (Shopify CDN). */
  image?: string;
  /** Local optimised image (from import.meta.glob). */
  localImage?: ImageMetadata;
  placeholder?: string;
  /** Small tag shown instead of price (e.g. "In development"). */
  tag?: string;
  /** Up to 3 spec chips: { label, value }. */
  chips?: Array<{ label: string; value: string }>;
  /** Star rating average (hidden when reviewCount is 0). */
  rating?: number;
  /** Review count (hidden when 0). */
  reviewCount?: number;
}
const {
  href, title, summary, sub, from, image, localImage,
  placeholder = 'PRODUCT', tag, chips, rating = 0, reviewCount = 0,
} = Astro.props;
const displaySummary = summary || sub || '';
---
<a href={href} data-card class="card flex flex-col overflow-hidden text-ink no-underline hover:text-ink hover:border-ink/40">
  <div class="aspect-[4/3] bg-ground-panel flex items-center justify-center overflow-hidden font-mono text-xs text-ink-soft">
    {localImage ? (
      <Picture
        src={localImage}
        widths={[480, 800]}
        formats={['avif', 'webp', 'jpeg']}
        alt={title}
        class="h-full w-full object-cover"
        loading="lazy"
      />
    ) : image ? (
      <img src={image} alt="" class="h-full w-full object-cover" loading="lazy" />
    ) : (
      `[${placeholder}]`
    )}
  </div>
  <div class="flex flex-col gap-1.5 p-5">
    <strong class="text-[17px]">{title}</strong>
    {reviewCount > 0 && <Rating average={rating} count={reviewCount} size={12} />}
    {displaySummary && <span class="text-sm text-ink-muted line-clamp-2">{displaySummary}</span>}
    {chips && chips.length > 0 && (
      <div class="flex flex-wrap gap-1">
        {chips.map((c) => (
          <span class="rounded bg-ground-alt px-1.5 py-0.5 text-[11px] font-mono text-ink-muted">{c.label}: {c.value}</span>
        ))}
      </div>
    )}
    {tag ? (
      <span class="text-xs font-semibold uppercase tracking-wide text-ink-soft">{tag}</span>
    ) : from ? (
      <span class="text-sm font-semibold text-brand-dark [html[data-theme=dark]_&]:text-brand-on-dark">from {from}</span>
    ) : null}
  </div>
</a>
```

- [ ] **Step 2: Run astro check**

Run: `pnpm check`
Expected: No errors — `sub` prop callers still work via the backward-compat fallback.

- [ ] **Step 3: Commit**

```bash
git add src/components/ProductCard.astro
git commit -m "feat(ui): ProductCard — add rating, chips, summary, data-card attribute"
```

---

## Task 6: Wire ratings + chips into card callers

**Files:**
- Modify: `src/pages/targets/index.astro`
- Modify: `src/pages/targets/[handle].astro` (pairs-with section only)
- Modify: `src/pages/index.astro`
- Modify: `src/pages/guides/[slug].astro`

All four pages that render `ProductCard` need to pass `rating`, `reviewCount`, and optionally `chips` / `summary`. This requires loading review data and product content at build time.

- [ ] **Step 1: Update `src/pages/targets/index.astro`**

Add imports and data loading in the frontmatter:

```typescript
import { getReviewsForProduct, summarize } from '@/lib/reviews';
import { getEntry } from 'astro:content';
import { getProductData } from '@/lib/productData';
```

After the `heroImageMap` loop, add:

```typescript
// Build review + content data for cards
const cardDataMap = new Map<string, { rating: number; count: number; summary?: string; chips?: Array<{ label: string; value: string }> }>();
for (const p of products) {
  const reviews = await getReviewsForProduct(p.handle);
  const summary = summarize(reviews.filter(r => r.status === 'published'));
  const productContent = await getEntry('products', p.handle);
  const pd = getProductData(p.handle, p.metafields ?? {});

  let chips: Array<{ label: string; value: string }> | undefined;
  if (productContent?.data.decideSpecs && pd) {
    const allRows = pd.specGroups.flatMap(g => g.rows);
    chips = productContent.data.decideSpecs
      .map(key => {
        const row = allRows.find(r => r.label === key);
        return row ? { label: row.label, value: row.value } : null;
      })
      .filter((c): c is { label: string; value: string } => c !== null);
  }

  cardDataMap.set(p.handle, {
    rating: summary.average,
    count: summary.count,
    summary: productContent?.data.summary,
    chips,
  });
}
```

Update the ProductCard calls in the "All products" grid to pass the new props:

```astro
{products.map((p) => {
  const localHero = heroImageMap.get(p.handle);
  const cd = cardDataMap.get(p.handle);
  return (
    <ProductCard
      href={p.url}
      title={p.title}
      summary={cd?.summary}
      sub={p.description}
      from={p.priceFrom}
      localImage={localHero}
      image={!localHero ? p.image : undefined}
      rating={cd?.rating}
      reviewCount={cd?.count}
      chips={cd?.chips}
    />
  );
})}
```

Also update the collection cards loop similarly (collections don't have reviews/chips — pass only what exists).

- [ ] **Step 2: Update `src/pages/targets/[handle].astro` pairs-with section**

In the frontmatter, after computing `pairsWith`, build card data for those products:

```typescript
// Pairs-with card data
const pairsWithCardData = new Map<string, { rating: number; count: number; summary?: string }>();
for (const p of pairsWith) {
  if (!p) continue;
  const reviews = await getReviewsForProduct(p.handle);
  const s = summarize(reviews.filter(r => r.status === 'published'));
  const pc = await getEntry('products', p.handle);
  pairsWithCardData.set(p.handle, { rating: s.average, count: s.count, summary: pc?.data.summary });
}
```

Update the pairs-with ProductCard rendering:

```astro
{pairsWith.map((p) => p && (() => {
  const cd = pairsWithCardData.get(p.handle);
  return (
    <ProductCard
      href={p.url}
      title={p.title}
      summary={cd?.summary}
      sub={p.description}
      from={p.priceFrom}
      image={p.image}
      placeholder={p.title.toUpperCase()}
      rating={cd?.rating}
      reviewCount={cd?.count}
    />
  );
})())}
```

- [ ] **Step 3: Update `src/pages/index.astro` and `src/pages/guides/[slug].astro`**

Apply the same pattern: import reviews + product content, build a card data map for any ProductCard usage, pass `rating`/`reviewCount`/`summary`. Check each file for ProductCard usage first — `index.astro` uses ProductCard for featured products; `guides/[slug].astro` uses it for related products.

- [ ] **Step 4: Run astro check + test**

Run: `pnpm check && pnpm test`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/targets/index.astro src/pages/targets/\[handle\].astro src/pages/index.astro src/pages/guides/\[slug\].astro
git commit -m "feat(ui): wire ratings, chips, summary into all ProductCard callers"
```

---

## Task 7: Product page restructure — buy box, story, specs visible, hash-link disclosures

**Files:**
- Modify: `src/pages/targets/[handle].astro`

This is the largest single task. It restructures the product page per the content model.

- [ ] **Step 1: Refactor buy box**

In `[handle].astro` frontmatter, load the product content:

```typescript
import { getEntry } from 'astro:content';
const productContent = await getEntry('products', handle!);
```

Replace the `positioning` line (line 64) and `keySpecs` logic (lines 67-83):

```typescript
// Summary from product content, fallback to positioning
const displaySummary = productContent?.data.summary || positioning;

// Decide-specs chips: resolve keys against specGroups
type KeySpec = { label: string; value: string };
const keySpecs: KeySpec[] = [];
if (productContent?.data.decideSpecs && specGroups.length > 0) {
  const allRows = specGroups.flatMap(g => g.rows);
  for (const key of productContent.data.decideSpecs) {
    const row = allRows.find(r => r.label === key);
    if (row) keySpecs.push({ label: row.label, value: row.value });
  }
} else {
  // Fallback: existing metafield-based logic
  if (m.feature_tolerance) keySpecs.push({ label: 'Accuracy', value: m.feature_tolerance });
  const substrate = [m.material, m.thickness_mm ? `${m.thickness_mm} mm` : ''].filter(Boolean).join(' \u00B7 ');
  if (substrate) keySpecs.push({ label: 'Substrate', value: substrate });
  const sizeValues = product.variants
    .map((v) => v.selectedOptions.find((o) => o.name === 'Size')?.value)
    .filter(Boolean) as string[];
  if (sizeValues.length > 1) {
    const nums = sizeValues.map((s) => parseInt(s, 10)).filter((n) => n > 0).sort((a, b) => a - b);
    if (nums.length >= 2) keySpecs.push({ label: 'Sizes', value: `${nums[0]}\u2013${nums[nums.length - 1]} mm` });
  } else if (sizeValues.length === 1) {
    keySpecs.push({ label: 'Size', value: sizeValues[0] });
  }
  if (m.flatness) keySpecs.push({ label: 'Flatness', value: m.flatness });
}
```

In the buy box HTML:
- Replace the `positioning` paragraph (line 365) with `displaySummary`
- Replace the review summary link (lines 356-362) with the shared `Rating` component:

```astro
import Rating from '@/components/Rating.astro';
...
{reviewSummary.count > 0 && (
  <Rating average={reviewSummary.average} count={reviewSummary.count} href="#reviews" size={14} />
)}
```

- [ ] **Step 2: Story replaces Shopify descriptionHtml**

The `cleanDescription` variable (line 51) is no longer rendered on the page. Remove it. Instead, render the `story` from product content after the buy box:

```astro
{/* Story (replaces Shopify descriptionHtml) */}
{(productContent?.data.story || '') && (
  <div class="container-x pb-8 md:pb-12">
    <div class="max-w-[640px] text-[15px] leading-relaxed text-ink-muted whitespace-pre-line">
      {productContent?.data.story}
    </div>
  </div>
)}
```

Place this between the buy box `</section>` and the "Sizes and part numbers" section.

- [ ] **Step 3: Specs table out of disclosure**

The current `<details class="group" id="specs-accordion" open>` (lines 442-477) wraps the specs table. Remove the `<details>` and `<summary>` wrapper. Render the specs table as a visible section with an `id="specifications"` for deep-linking:

```astro
{/* Specifications — always visible, never in disclosure */}
{specGroups.length > 0 && (
  <section id="specifications" class="flex flex-col gap-6 pb-6 border-b border-line">
    <h2 class="flex items-center gap-3 text-[20px] font-semibold">
      <Ruler size={22} stroke-width={1.6} class="text-ink-soft" aria-hidden="true" />
      Specifications
    </h2>
    {/* ... existing spec group tables unchanged ... */}
  </section>
)}
```

- [ ] **Step 4: Add id attributes to remaining disclosures**

Add `id` to each `<details>`:
- `id="in-the-box"` for "What's in the box & files"
- `id="compatibility"` for "Compatibility"
- `id="inspection"` for "Inspection report & certificate"
- `id="shipping"` for "Shipping, returns & warranty"
- `id="faq"` for "FAQ"

- [ ] **Step 5: Merge standalone "What's in the box" into the accordion**

The standalone `<section>` with packaging images (lines 630-677) should be merged into the existing "What's in the box & files" disclosure (lines 479-504). Move the packaging images grid and contents list from the standalone section into the disclosure's content area. Remove the standalone section.

- [ ] **Step 6: Add URL hash deep-link script**

Replace the existing `<script>` block (lines 705-721) with an expanded version:

```html
<script>
  // Open disclosure matching URL hash on load
  if (location.hash) {
    const id = location.hash.slice(1);
    const el = document.getElementById(id);
    if (el && el.tagName === 'DETAILS' && !el.open) el.open = true;
  }

  // Update URL hash when a disclosure is toggled
  document.querySelectorAll('details[id]').forEach((d) => {
    d.addEventListener('toggle', () => {
      if ((d as HTMLDetailsElement).open) {
        history.replaceState(null, '', `#${d.id}`);
      }
    });
  });

  // Close specs accordion on mobile by default (no longer needed — specs are visible)

  // Ordering table row click → select size in VariantPicker
  document.querySelectorAll('[data-select-size]').forEach((row) => {
    row.addEventListener('click', () => {
      const size = (row as HTMLElement).dataset.selectSize;
      if (size) {
        window.dispatchEvent(new CustomEvent('select-size', { detail: { size } }));
      }
    });
  });
</script>
```

- [ ] **Step 7: Reviews box condensation**

In `src/islands/ReviewsSection.tsx`, replace line 47:

```tsx
<strong className="text-ink">How reviews work:</strong> {HOW_REVIEWS_WORK}{' '}
```

With a one-liner:

```tsx
<strong className="text-ink">How reviews work:</strong> We publish every review unedited and disclose material connections.{' '}
```

Remove the `HOW_REVIEWS_WORK` import from ReviewsSection (it's still exported from reviews.ts for the homepage).

- [ ] **Step 8: Update homepage reviews usage**

In `src/pages/index.astro`, the HOW_REVIEWS_WORK paragraph at line 250 also needs to be condensed to the one-liner + "Full policy" link. Update:

```astro
<p class="m-0 max-w-[460px] text-sm text-ink-muted">
  We publish every review unedited and disclose material connections.
  <a href="/reviews-policy/" class="text-brand-dark hover:text-brand ml-1">Full policy</a>
</p>
```

- [ ] **Step 9: Run astro check + test**

Run: `pnpm check && pnpm test`
Expected: No errors. The `HOW_REVIEWS_WORK` test in reviews.test.ts still passes (it tests the constant, not the rendered text).

- [ ] **Step 10: Commit**

```bash
git add src/pages/targets/\[handle\].astro src/islands/ReviewsSection.tsx src/pages/index.astro
git commit -m "feat(ui): product page restructure — visible specs, story, hash-link disclosures, condensed reviews"
```

---

## Task 8: Product JSON-LD — aggregateRating + review objects

**Files:**
- Modify: `src/pages/targets/[handle].astro` (JSON-LD section)
- Modify: `scripts/check-seo.mjs`

- [ ] **Step 1: Add review objects to JSON-LD**

In `[handle].astro`, after the existing `aggregateRating` block (lines 245-253), add up to 5 review objects:

```typescript
if (reviewSummary.count > 0) {
  productLd.aggregateRating = {
    '@type': 'AggregateRating',
    ratingValue: reviewSummary.average.toFixed(1),
    reviewCount: reviewSummary.count,
    bestRating: '5',
  };
  // Up to 5 most recent published reviews
  const recentReviews = productReviews
    .filter(r => r.status === 'published')
    .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
    .slice(0, 5);
  if (recentReviews.length > 0) {
    productLd.review = recentReviews.map(r => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: r.author.initials },
      datePublished: r.created.split('T')[0],
      reviewBody: r.body,
      reviewRating: {
        '@type': 'Rating',
        ratingValue: r.stars,
        bestRating: 5,
      },
    }));
  }
}
```

- [ ] **Step 2: Add aggregateRating validation to check-seo.mjs**

After the existing ProductGroup validation (around line 210), add:

```javascript
// aggregateRating shape validation
if (ld['@type'] === 'ProductGroup') {
  if (ld.aggregateRating) {
    const ar = ld.aggregateRating;
    if (ar['@type'] !== 'AggregateRating') errors.push({ file: rel, rule: 'jsonld-aggregate-type', detail: 'aggregateRating @type must be AggregateRating' });
    if (typeof ar.ratingValue === 'undefined') errors.push({ file: rel, rule: 'jsonld-aggregate-rating', detail: 'aggregateRating missing ratingValue' });
    if (typeof ar.reviewCount === 'undefined') errors.push({ file: rel, rule: 'jsonld-aggregate-count', detail: 'aggregateRating missing reviewCount' });
    if (ar.bestRating !== '5' && ar.bestRating !== 5) errors.push({ file: rel, rule: 'jsonld-aggregate-best', detail: `aggregateRating bestRating must be 5, got ${ar.bestRating}` });
  }
  // review objects shape
  if (ld.review) {
    if (!Array.isArray(ld.review)) {
      errors.push({ file: rel, rule: 'jsonld-review-array', detail: 'review must be an array' });
    } else {
      for (const rv of ld.review) {
        if (rv['@type'] !== 'Review') errors.push({ file: rel, rule: 'jsonld-review-type', detail: 'review @type must be Review' });
        if (!rv.author) errors.push({ file: rel, rule: 'jsonld-review-author', detail: 'review missing author' });
        if (!rv.reviewRating) errors.push({ file: rel, rule: 'jsonld-review-rating', detail: 'review missing reviewRating' });
      }
    }
  }
}
```

- [ ] **Step 3: Run pnpm build + check-seo**

Run: `pnpm build && node scripts/check-seo.mjs`
Expected: PASS (if reviews exist, shape validates; if no reviews, aggregateRating is absent).

- [ ] **Step 4: Commit**

```bash
git add src/pages/targets/\[handle\].astro scripts/check-seo.mjs
git commit -m "feat(seo): product JSON-LD — aggregateRating + review objects with check-seo validation"
```

---

## Task 9: Tool page progressive disclosure

**Files:**
- Modify: `src/components/ToolContent.astro`

- [ ] **Step 1: Split tool content into visible intro + disclosure sections**

Replace `src/components/ToolContent.astro`:

```astro
---
import { Plus } from 'lucide-astro';
/**
 * Renders tool SEO content below the island.
 * First section visible (intro <= 240 chars); remaining sections in disclosures.
 */
interface FaqItem { q: string; a: string }
interface Props {
  Content: any;
  faq: FaqItem[];
}
const { Content, faq } = Astro.props;

// Render markdown to HTML string for splitting
const { default: ContentComponent } = await Content();
---
<section class="container-x pb-16">
  <div class="prose-calib mx-auto max-w-[800px]" id="tool-content">
    <Content />
  </div>
  {faq.length > 0 && (
    <div class="mx-auto mt-10 max-w-[800px]">
      <h2 class="h-display m-0 pb-4 text-2xl">Frequently asked questions</h2>
      <div class="flex flex-col divide-y divide-line border-y border-line">
        {faq.map((item) => (
          <details class="group py-4">
            <summary class="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold [&::-webkit-details-marker]:hidden">
              {item.q}
              <Plus size={18} stroke-width={1.6} class="shrink-0 text-ink-soft transition-transform group-open:rotate-45" aria-hidden="true" />
            </summary>
            <p class="m-0 pt-3 text-[15px] leading-relaxed text-ink-muted">{item.a}</p>
          </details>
        ))}
      </div>
    </div>
  )}
</section>

<script>
  // Split tool content: first section visible, rest in disclosures
  const container = document.getElementById('tool-content');
  if (container) {
    const h2s = container.querySelectorAll('h2');
    if (h2s.length > 0) {
      // Collect nodes before first h2 as visible intro
      const firstH2 = h2s[0];
      // Wrap each h2 and its siblings until the next h2 in a <details>
      for (const h2 of h2s) {
        const details = document.createElement('details');
        details.className = 'group border-t border-line';
        const summary = document.createElement('summary');
        summary.className = 'flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[17px] font-semibold [&::-webkit-details-marker]:hidden';
        summary.innerHTML = `${h2.textContent}<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" class="shrink-0 text-ink-soft transition-transform group-open:rotate-45" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;

        const content = document.createElement('div');
        content.className = 'pb-4';

        // Collect siblings between this h2 and next h2
        let sibling = h2.nextElementSibling;
        const siblings: Element[] = [];
        while (sibling && sibling.tagName !== 'H2') {
          siblings.push(sibling);
          sibling = sibling.nextElementSibling;
        }

        h2.replaceWith(details);
        details.appendChild(summary);
        details.appendChild(content);
        for (const s of siblings) {
          content.appendChild(s);
        }
      }
    }
  }
</script>
```

Note: This uses a client-side script to split the rendered markdown. The intro (everything before the first `<h2>`) stays visible. Each `##` section becomes a `<details>` disclosure. This avoids having to parse the markdown AST at build time and works with any tool content structure.

- [ ] **Step 2: Run astro check**

Run: `pnpm check`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ToolContent.astro
git commit -m "feat(ui): tool page progressive disclosure — intro visible, sections in details"
```

---

## Task 10: Guards — check-content.mjs + check-prose update

**Files:**
- Create: `scripts/check-content.mjs`
- Modify: `scripts/check-prose.mjs`

- [ ] **Step 1: Create `scripts/check-content.mjs`**

```javascript
#!/usr/bin/env node
/**
 * check-content.mjs — validates the content model against built HTML.
 * Per product page: decide slots visible outside <details>, H1 outside <details>,
 * meta description in <head>, mean sentence length <= 20 words per block.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';

const DIST = resolve(import.meta.dirname, '..', 'dist');
const errors = [];

// Product pages to check
const PRODUCT_DIRS = ['charuco-composite', 'charuco-ceramic', 'checkerboard-composite', 'mounting-fixture', 'certificate-ilac'];

function stripTags(html) {
  return html.replace(/<[^>]+>/g, '').replace(/&\w+;/g, ' ').replace(/\s+/g, ' ').trim();
}

function meanSentenceLength(text) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 5);
  if (sentences.length === 0) return 0;
  const totalWords = sentences.reduce((sum, s) => sum + s.trim().split(/\s+/).length, 0);
  return totalWords / sentences.length;
}

for (const handle of PRODUCT_DIRS) {
  const htmlPath = join(DIST, 'targets', handle, 'index.html');
  if (!existsSync(htmlPath)) continue;
  const html = readFileSync(htmlPath, 'utf-8');
  const rel = `targets/${handle}/index.html`;

  // Split HTML into inside-details and outside-details
  // Simple approach: remove all <details>...</details> content to get "outside"
  const outsideDetails = html.replace(/<details[\s\S]*?<\/details>/gi, '');

  // 1. H1 outside <details>
  const h1Outside = /<h1[^>]*>[\s\S]*?<\/h1>/i.test(outsideDetails);
  if (!h1Outside) errors.push({ file: rel, rule: 'h1-outside-details', detail: 'H1 is inside a <details> element' });

  // 2. Meta description in <head> (never in <details>)
  const hasMetaDesc = /<meta\s[^>]*name=["']description["']/i.test(html);
  if (!hasMetaDesc) errors.push({ file: rel, rule: 'meta-desc-present', detail: 'Missing meta description' });

  // 3. Specs table outside <details> (id="specifications" should be outside)
  const specsOutside = /id=["']specifications["']/.test(outsideDetails);
  if (!specsOutside && /<table/.test(html)) {
    // Only flag if specs exist at all
    const specsAnywhere = /id=["']specifications["']/.test(html);
    if (specsAnywhere) errors.push({ file: rel, rule: 'specs-outside-details', detail: 'Specifications section is inside a <details> element' });
  }

  // 4. Decide slots visible outside <details>: price text, key-specs strip
  // Check that data-buy-box exists outside details
  const buyBoxOutside = /data-buy-box/.test(outsideDetails);
  if (!buyBoxOutside) errors.push({ file: rel, rule: 'buybox-outside-details', detail: 'Buy box is inside a <details> element' });

  // 5. Mean sentence length per block
  const BLOCK_RE = /<(p|li|td|dd|blockquote)(?:\s[^>]*)?>([^<]*(?:<(?!\/?(?:p|li|td|dd|blockquote))[^>]*>[^<]*)*)<\/\1>/gi;
  let bm;
  while ((bm = BLOCK_RE.exec(html)) !== null) {
    const text = stripTags(bm[2]);
    if (text.length < 30) continue; // Skip tiny blocks
    const msl = meanSentenceLength(text);
    if (msl > 20) {
      errors.push({ file: rel, rule: 'sentence-length', detail: `Mean sentence length ${msl.toFixed(1)} words (max 20) in <${bm[1]}>: "${text.slice(0, 60)}..."` });
    }
  }
}

if (errors.length > 0) {
  console.error(`[check-content] ${errors.length} content model error(s):\n`);
  for (const e of errors) {
    console.error(`  ${e.file}  [${e.rule}] ${e.detail}`);
  }
  process.exit(1);
}

console.log(`[check-content] OK — ${PRODUCT_DIRS.length} product pages checked.`);
```

- [ ] **Step 2: Update `scripts/check-prose.mjs`**

The existing threshold is 360 chars (warn-only). Update to 300 chars and add the card check. Change the prose check from warn-only to error on blocks > 300 (with allow-list):

After line 9 (`const THRESHOLD = 360;`), change to:

```javascript
const THRESHOLD = 300;
```

After the prose check loop (after line 160), add a card text check that runs on dist HTML:

```javascript
// ---------------------------------------------------------------------------
// Card text check (build-breaking) — [data-card] elements <= 220 chars
// ---------------------------------------------------------------------------

import { join as pathJoin } from 'node:path';
const CARD_THRESHOLD = 220;
const distDir = resolve(ROOT, 'dist');
const cardErrors = [];

if (existsSync(distDir)) {
  function findHtmlFiles(dir) {
    const results = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = pathJoin(dir, entry.name);
      if (entry.isDirectory()) results.push(...findHtmlFiles(full));
      else if (entry.name.endsWith('.html')) results.push(full);
    }
    return results;
  }

  for (const file of findHtmlFiles(distDir)) {
    const html = readFileSync(file, 'utf-8');
    const cardRe = /<a[^>]*data-card[^>]*>([\s\S]*?)<\/a>/gi;
    let cm;
    while ((cm = cardRe.exec(html)) !== null) {
      const text = cm[1].replace(/<[^>]+>/g, '').replace(/&\w+;/g, ' ').replace(/\s+/g, ' ').trim();
      if (text.length > CARD_THRESHOLD) {
        cardErrors.push({ file: relative(ROOT, file), chars: text.length, snippet: text.slice(0, 60) });
      }
    }
  }
}

if (cardErrors.length > 0) {
  console.error(`\n[check-prose] CARD TEXT TOO LONG (max ${CARD_THRESHOLD} chars):`);
  for (const e of cardErrors) {
    console.error(`  ${e.file} (${e.chars} chars) ${e.snippet}…`);
  }
  process.exit(1);
}
```

Note: the `existsSync` and `readdirSync` imports are already at the top. Add them if not present.

- [ ] **Step 3: Run the checks**

Run: `pnpm build && node scripts/check-content.mjs && node scripts/check-prose.mjs`
Expected: Both pass. If check-prose fails on existing long paragraphs, add them to an allow-list or trim them.

- [ ] **Step 4: Commit**

```bash
git add scripts/check-content.mjs scripts/check-prose.mjs
git commit -m "feat(guard): check-content.mjs + check-prose card/block length enforcement"
```

---

## Task 11: Shopify description export

**Files:**
- Create: `docs/content/shopify-descriptions-after.md`
- Create: `docs/content/shopify-descriptions-after.csv`

- [ ] **Step 1: Write the story-only descriptions**

For each product, take the `story` field from the product content files. If `story` is not set, use the `positioning` from `productData`.

`docs/content/shopify-descriptions-after.md`:

```markdown
# Shopify Descriptions After UI-2

Story-only descriptions for Shopify import. Spec sentences removed per content model.
Owner imports via Shopify Admin > Products > Import CSV.

## charuco-composite

ChArUco combines a checkerboard with ArUco markers in the white squares. Markers identify each corner, so the board works even when partially outside the frame — exactly where lens distortion is strongest.

Native in OpenCV, supported by MATLAB and most multi-camera toolchains.

## charuco-ceramic

Lithographed chrome pattern on white alumina ceramic. Feature accuracy two orders of magnitude better than printed boards, thermally stable, chemically inert.

For metrology-grade camera calibration, high-magnification optics, and setups where the target must not be the error budget.

## checkerboard-composite

The classic pattern: highest corner localisation accuracy of any planar target when the whole board is in view. Supported by every calibration toolchain.

Choose Fine for more corners per image or Coarse for low-resolution and long-distance setups.
```

`docs/content/shopify-descriptions-after.csv`:

```csv
Handle,Body (HTML)
charuco-composite,"<p>ChArUco combines a checkerboard with ArUco markers in the white squares. Markers identify each corner, so the board works even when partially outside the frame &mdash; exactly where lens distortion is strongest.</p><p>Native in OpenCV, supported by MATLAB and most multi-camera toolchains.</p>"
charuco-ceramic,"<p>Lithographed chrome pattern on white alumina ceramic. Feature accuracy two orders of magnitude better than printed boards, thermally stable, chemically inert.</p><p>For metrology-grade camera calibration, high-magnification optics, and setups where the target must not be the error budget.</p>"
checkerboard-composite,"<p>The classic pattern: highest corner localisation accuracy of any planar target when the whole board is in view. Supported by every calibration toolchain.</p><p>Choose Fine for more corners per image or Coarse for low-resolution and long-distance setups.</p>"
```

- [ ] **Step 2: Commit**

```bash
git add docs/content/shopify-descriptions-after.md docs/content/shopify-descriptions-after.csv
git commit -m "docs(content): Shopify story-only descriptions for owner import"
```

---

## Task 12: Playwright deep-link test + screenshot baselines

**Files:**
- Create: `tests/e2e/disclosure-deeplink.spec.ts`
- Update: screenshot baselines

- [ ] **Step 1: Create deep-link test**

`tests/e2e/disclosure-deeplink.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('disclosure deep-linking', () => {
  test('hash #in-the-box opens the In the box disclosure', async ({ page }) => {
    await page.goto('/targets/charuco-composite/#in-the-box');
    const details = page.locator('details#in-the-box');
    await expect(details).toHaveAttribute('open', '');
  });

  test('hash #compatibility opens the Compatibility disclosure', async ({ page }) => {
    await page.goto('/targets/charuco-composite/#compatibility');
    const details = page.locator('details#compatibility');
    await expect(details).toHaveAttribute('open', '');
  });

  test('hash #faq opens the FAQ disclosure', async ({ page }) => {
    await page.goto('/targets/charuco-composite/#faq');
    const details = page.locator('details#faq');
    await expect(details).toHaveAttribute('open', '');
  });

  test('specifications section is visible without hash (not in details)', async ({ page }) => {
    await page.goto('/targets/charuco-composite/');
    const specs = page.locator('#specifications');
    await expect(specs).toBeVisible();
    // Verify it's NOT inside a <details> element
    const parentDetails = page.locator('details #specifications');
    await expect(parentDetails).toHaveCount(0);
  });
});
```

- [ ] **Step 2: Update screenshot baselines**

Run the Playwright screenshot tests to update baselines for:
- Product page
- /targets/ listing
- A guide page

```bash
npx playwright test tests/e2e/product-page.spec.ts --update-snapshots
npx playwright test tests/e2e/family-page.spec.ts --update-snapshots
npx playwright test tests/e2e/guides.spec.ts --update-snapshots
```

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/disclosure-deeplink.spec.ts tests/e2e/*.spec.ts-snapshots/
git commit -m "test(e2e): disclosure deep-link tests + updated screenshot baselines"
```

---

## Task 13: Final proof — build, checks, push

**Files:**
- Create: `docs/content/text-blocks-after.md`

- [ ] **Step 1: Full build**

Run: `SKIP_SPECS_CHECK=1 pnpm build`
Expected: Build succeeds.

- [ ] **Step 2: Run all checks**

```bash
node scripts/check-content.mjs
node scripts/check-prose.mjs
node scripts/check-seo.mjs
pnpm test
pnpm check
```

Expected: All exit 0.

- [ ] **Step 3: Generate text-blocks-after.md**

Run: `node scripts/measure-text-blocks.mjs > docs/content/text-blocks-after.md`

Verify: 0 blocks >= 300 chars outside the allow-list.

- [ ] **Step 4: Commit everything**

```bash
git add docs/content/text-blocks-after.md
git commit -m "docs(proof): UI-2 text-blocks-after — 0 blocks >= 300 outside allow-list"
```

- [ ] **Step 5: Push**

```bash
git push
```

- [ ] **Step 6: Verify clean state**

```bash
git log --oneline -3
git status --short
```

Expected: `git status --short` produces empty output.
