# UI-2: Content Model and Progressive Disclosure

**Date:** 2026-10-29
**Status:** Draft
**Scope:** Site-wide content model, product page restructure, card unification, tool disclosure, guards

## Decision: Datasheet-derived vs curated content

Datasheets (`docs/datasheets/CT-DS-*.md`) remain the single source of truth for specs. `productData.ts` continues to auto-derive `specGroups`, `orderingRows`, `positioning` from them. A new thin curation layer at `src/content/products/<handle>.md` holds only human-written fields. **No spec value is ever copied into frontmatter.** A vitest enforces this.

---

## 1. Raw Material (Content Inventory)

### 1a. Text block measurement

Create `scripts/measure-text-blocks.mjs` that:
- Reads every `.html` file in `dist/`
- For each page, extracts every block element's own text (p, li, td, th, figcaption, blockquote, dd, dt, summary, h1-h6, span with >50 chars)
- Reports: page path, element tag, char count, first 80 chars of text
- Lists all blocks >= 300 chars with source classification (Shopify descriptionHtml / local content / component literal)

Output: `docs/content/2026-10-29-content-inventory.md` section 1a.

### 1b. Shopify description decomposition

Three live Shopify descriptions (charuco-composite, charuco-ceramic, checkerboard-composite):
- Decompose each into atomic statements
- Tag each statement with the datasheet field it duplicates (e.g. "Feature position tolerance" from CT-DS-CHA-P Geometry table) or "story" if it conveys positioning/narrative not found in specs
- This determines which statements stay in the Shopify description (story only) and which get dropped (spec-derived)

Output: `docs/content/2026-10-29-content-inventory.md` section 1b.

### 1c. Competitor product page anatomy

Playwright DOM dump of one product page each from:
- **calib.io** (calibration target competitor)
- **thorlabs.com** (optics/photonics)
- **edmundoptics.com** (optics)

For each: section order, which sections use tabs/accordions, what's visible above the fold, verbatim section labels. Output as a table.

Output: `docs/content/2026-10-29-content-inventory.md` section 1c.

### 1d. User task -> information slot mapping

From `docs/ia/tasks.md` (10 tasks) and Search Console queries in `docs/ia/baseline.md`:
- For each task/query, identify which information slot the user needs first
- Maps to content model slots in step 2

Output: `docs/content/2026-10-29-content-inventory.md` section 1d.

---

## 2. Content Model

File: `docs/content/content-model.md`

**This file is committed before any page changes.**

### Rules (written at top of content-model.md)

1. **Always visible:** Anything needed to decide to buy — price, accuracy/tolerance, sizes, substrate, lead time
2. **Disclosure:** "After you decide" slots — in the box, files, mounting, care, compatibility detail
3. **Never inside disclosure:** H1, meta description, specs table
4. **One Disclosure component site-wide:** `<details>`/`<summary>`, APG semantics, chevron icon, open state encoded in URL hash so links can deep-link (e.g. `#specifications` opens that disclosure)
5. **Character budgets enforced:** check-prose guards blocks <= 300 chars (allow-list for form-control groups); cards <= 220 chars (`[data-card]`)

### Tables (one per page type)

#### Product page

| Slot | Source field | Char budget | Reveal | Order |
|---|---|---|---|---|
| H1 (product title) | Shopify product.title | - | visible | 1 |
| Star rating | `summarize(getReviewsForProduct)` — Rating component | - | visible (0 reviews: hidden) | 2 |
| Summary | `src/content/products/<handle>.md` frontmatter `summary` | <= 90 | visible | 3 |
| Decide-specs strip | 3 chips from `decideSpecs` keys in product content, values from `productData.specGroups` | - | visible | 4 |
| Price / variants | Shopify Storefront API | - | visible | 5 |
| Specifications (full table) | `productData.specGroups` (datasheet-derived) | - | visible | 6 |
| In the box | `productData.deliverables` + product content override | - | disclosure | 7 |
| Files & formats | `productData.deliverables` files list + configFiles | - | disclosure | 8 |
| Mounting & care | `productData.specGroups.Physical` mounting + Environment cleaning | - | disclosure | 9 |
| Compatibility | hardcoded compatibility table (existing) | - | disclosure | 10 |
| Reviews | ReviewsSection island | - | visible (summary) | 11 |
| Related / pairs with | Shopify product relationships | - | visible | 12 |

#### Collection page

| Slot | Source field | Char budget | Reveal | Order |
|---|---|---|---|---|
| H1 | content collection title | - | visible | 1 |
| Description | content collection description | <= 160 | visible | 2 |
| Product cards | see Card spec below | - | visible | 3 |

#### Tool page

| Slot | Source field | Char budget | Reveal | Order |
|---|---|---|---|---|
| H1 | content tool h1 | - | visible | 1 |
| Intro | First paragraph of tool markdown body | <= 240 | visible | 2 |
| Tool island | React island | - | visible | 3 |
| How it works | Tool markdown "How to use it" section | - | disclosure | 4 |
| Limits / notes | Tool markdown remaining sections | - | disclosure | 5 |
| FAQ | Tool markdown faq frontmatter | - | disclosure (existing) | 6 |

#### Guide page

| Slot | Source field | Char budget | Reveal | Order |
|---|---|---|---|---|
| H1 | guide frontmatter title | - | visible | 1 |
| Body | guide markdown | - | visible | 2 |
| FAQ | guide frontmatter faq | - | disclosure (existing) | 3 |
| Related products | guide frontmatter products | - | visible | 4 |

#### Policy page

| Slot | Source field | Char budget | Reveal | Order |
|---|---|---|---|---|
| H1 | hardcoded | - | visible | 1 |
| Body | hardcoded prose | - | visible | 2 |

### Card spec (unified)

All cards (product cards on /targets/, collection rows, related cards in guides):

| Slot | Source | Char budget |
|---|---|---|
| Image | Shopify CDN or local optimized | - |
| Title | product/collection title | - |
| Star rating | `summarize(getReviewsForProduct)` — Rating component; hidden when 0 | - |
| Summary | product content `summary` or Shopify `description` | <= 90 |
| 3 chips | product content `decideSpecs` keys -> values from specGroups | - |
| Price | Shopify `priceFrom` | - |

Card total text (title + summary + chips) must be <= 220 chars when rendered.

---

## 3. Implementation

### 3a. Product content collection

**New file:** `src/content/products/<handle>.md` for each product handle.

Schema addition to `src/content/config.ts`:

```typescript
const products = defineCollection({
  type: 'content',
  schema: z.object({
    summary: z.string().max(90),
    decideSpecs: z.tuple([z.string(), z.string(), z.string()]),
    story: z.string().max(400).optional(),
    inTheBox: z.array(z.string()).optional(),
    compat: z.array(z.object({ tool: z.string(), note: z.string() })).optional(),
  }),
});
```

- `summary`: Human-written, <= 90 chars. Used in buy box and cards.
- `decideSpecs`: Array of exactly 3 spec keys (e.g. `['Feature position tolerance', 'Substrate', 'Flatness']`). Values resolved at build time from `productData.specGroups` by key lookup. **Never a value.**
- `story`: Optional, <= 400 chars (2 short paragraphs). Replaces Shopify `descriptionHtml` on the product page. Only "story" statements from the 1b decomposition. If absent, falls back to `positioning` from productData.
- `inTheBox`: Optional override for the in-the-box list. If absent, uses datasheet Deliverables.
- `compat`: Optional override for compatibility table rows. If absent, uses existing hardcoded table.

The markdown body of each product file is unused (type: 'content' but body ignored; we only use frontmatter).

**Example:** `src/content/products/charuco-composite.md`:
```yaml
---
summary: "ChArUco composite target for OpenCV stereo and multi-camera calibration"
decideSpecs: ["Feature position tolerance", "Substrate", "Flatness"]
story: "ChArUco combines a checkerboard with ArUco markers. Markers identify each corner, so the board works even when partially outside the frame — exactly where lens distortion is strongest.\n\nNative in OpenCV, supported by MATLAB and most multi-camera toolchains."
---
```

### 3b. Product page restructure

`src/pages/targets/[handle].astro` changes:

1. **Buy box:** title -> summary (from product content) -> decide-specs strip (3 chips resolved from `decideSpecs` keys against `productData.specGroups`) -> price/variants. Remove `positioning` and `cleanDescription` rendering. The `story` field renders below the buy box as 1-2 short paragraphs (not inside Shopify descriptionHtml).

2. **Key-specs strip refactor:** Currently builds `keySpecs` from hardcoded metafield keys. Change to: read `decideSpecs` from product content, look up each key in the flattened `specGroups` rows, render as 3 chips. If product content doesn't exist, fall back to current logic.

3. **Specs table moves out of disclosure:** Currently in `<details id="specs-accordion" open>`. Per the content model rule "specs table is never inside a disclosure", the specs table renders as a visible section — no `<details>` wrapper. The remaining 5 accordions (In the box, Compatibility, Inspection report, Shipping/returns/warranty, FAQ) stay as `<details>` disclosures. Add `id` attributes to each disclosure for hash-linking. Add URL hash sync script: on load, open the disclosure matching `location.hash`; on toggle, update `location.hash`.

4. **"What's in the box" section (lines 630-677):** Merge into the existing accordion #2 ("What's in the box & files") — no separate standalone section. The packaging images and contents list move inside the accordion.

5. **Shopify descriptionHtml:** No longer rendered on the product page. Replaced by `story` from product content.

6. **Reviews note:** Already shows HOW_REVIEWS_WORK paragraph + "Full policy" link. Change to: one sentence + link only.

### 3c. Unified card component

`src/components/ProductCard.astro` changes:

- Add `summary` prop (replaces `sub`)
- Add `chips` prop: `Array<{ label: string; value: string }>` (max 3)
- Render: image -> title -> summary -> chips row -> price
- Add `data-card` attribute to root element for check-prose targeting
- Keep backward compat: `sub` still works as fallback if `summary` not provided

Callers updated: `targets/index.astro`, `targets/[handle].astro` (pairs with), `guides/[slug].astro`, `index.astro`.

### 3d. Tool page progressive disclosure

`src/components/ToolContent.astro` changes:

- Parse the rendered markdown content to split:
  - First section (before first `##`) or `## What it does`: visible intro, capped at 240 chars displayed
  - `## How to use it` / `## How it works`: wrapped in `<details>` disclosure
  - Remaining `##` sections (e.g. `## Related guides`, `## Limits`): wrapped in `<details>` disclosure
- FAQ already in `<details>` — no change needed

Implementation: Since Astro renders markdown to HTML via `<Content />`, the split happens in `ToolContent.astro` by receiving the rendered HTML and using string splitting on `<h2` boundaries. Alternatively, render the markdown programmatically and split the AST — but string split on `<h2` is simpler and sufficient since tool content is fully controlled.

### 3e. Story-only description definition

"Story-only description" = the Shopify `descriptionHtml` with every spec sentence removed. Spec sentences are those covering: material, tolerance, temperature, outdoor lifetime, in-the-box contents, mounting. What remains is what the product **is**, who it is **for**, and **why** — <= 2 short paragraphs. This is what `story` in `src/content/products/<handle>.md` contains, and what the Shopify CSV export preserves.

### 3f. Star ratings on cards and product page

New `src/components/Rating.astro` component:

- Five stars (SVG or icon), brand red (`text-brand`) for filled portion, `text-line` for empty
- Numeric average to 1 decimal place
- Review count
- Accessible label: `aria-label="Rated {avg} out of 5 from {count} reviews"`
- **Renders nothing when count is 0** — no "no reviews yet" text, no empty stars, no element at all

Usage:
1. **Product card** (`ProductCard.astro`): rendered under the title, above summary. Card receives `rating` and `reviewCount` props; when `reviewCount` is 0, nothing renders.
2. **Product page** (`[handle].astro`): rendered under H1, linking to `#reviews`. Already partially exists as the review summary link (lines 356-362) — refactor to use the shared `<Rating>` component. When count is 0, the link and stars are not rendered.

Rating data is computed at build time from `getReviewsForProduct(handle)` + `summarize()` — the same source `ReviewsSection` uses. No new data fetch needed; the product page already computes `reviewSummary`.

For cards on `/targets/`, `index.astro`, `guides/[slug].astro`: the caller must pass rating data. This means the listing pages need to load reviews per product at build time via `getReviewsForProduct` + `summarize`.

### 3g. Product JSON-LD aggregateRating and review objects

The product page JSON-LD (`productLd`) changes:

1. **aggregateRating** (already partially implemented at lines 245-253): keep as-is, but ensure it is **only present when `reviewCount >= 1`**. Currently guarded by `reviewSummary.count > 0` — correct.

2. **Add up to 5 review objects:** When `reviewCount >= 1`, add `review` array to `productLd` with up to 5 published reviews:
   ```json
   {
     "@type": "Review",
     "author": { "@type": "Person", "name": "<initials>" },
     "datePublished": "<ISO date>",
     "reviewBody": "<body text>",
     "reviewRating": {
       "@type": "Rating",
       "ratingValue": <stars>,
       "bestRating": 5
     }
   }
   ```
   Select the 5 most recent published reviews. When count is 0, neither `aggregateRating` nor `review` appears in the JSON-LD.

3. **check-seo validation:** Add to `scripts/check-seo.mjs`:
   - When `aggregateRating` is present in product page JSON-LD: validate shape has `ratingValue` (number string), `reviewCount` (number), `bestRating` "5"
   - When product page has 0 reviews: validate `aggregateRating` and `review` are both absent
   - Fail on shape mismatch

4. **Vitest:** New test (in `src/lib/reviews.test.ts` or adjacent):
   - `summarize([])` returns count 0, average 0
   - `summarize([{stars:5}, {stars:4}, {stars:3}])` returns average 4.0 (not 4.00), count 3
   - Rounding: `summarize([{stars:5},{stars:5},{stars:4}])` returns average "4.7" when formatted to 1 decimal
   - Zero case: confirm no aggregateRating object generated when count is 0

### 3h. Reviews box condensation

In `src/islands/ReviewsSection.tsx`:
- Replace the full HOW_REVIEWS_WORK paragraph with a one-sentence version
- Keep the "Full policy" link
- New constant `HOW_REVIEWS_WORK_SHORT` or just inline: "We publish every review unedited and disclose material connections."

In `src/lib/reviews.ts`:
- Keep `HOW_REVIEWS_WORK` for the policy page
- The one-liner is used in ReviewsSection only

### 3f. Shopify description export

Create `docs/content/shopify-descriptions-after.md`:
- For each product, the story-only description (from 1b decomposition)
- Spec statements removed

Create `docs/content/shopify-descriptions-after.csv`:
- Columns: `Handle`, `Body (HTML)`
- For the owner to import into Shopify admin
- **Do not write to Shopify**

---

## 4. Guards

### 4a. check-prose update

`scripts/check-prose.mjs` already exists. Add/update:
- Any block element text <= 300 chars (existing blocks are already checked; verify threshold)
- Cards <= 220 chars (target `[data-card]` elements)
- Allow-list for form-control groups (inputs, selects, textareas and their labels)

### 4b. New check-content.mjs

`scripts/check-content.mjs`:
- Per product page in dist/:
  - The 5 "decide" slots (H1, summary, decide-specs, price, lead time) are visible outside `<details>`
  - H1 is outside `<details>`
  - Meta description is in `<head>` (not in `<details>`)
  - Specs table is rendered (can be inside disclosure, per model)
  - Every block element's mean sentence length <= 20 words
- Exit 1 on any failure

### 4c. Vitest: no spec value duplication

New test in `src/content/products.test.ts` (or similar):
- For each product content file, load its frontmatter
- Load `productData.specGroups` for the same handle
- Flatten all spec values from specGroups
- Assert that no frontmatter field value (summary, story, inTheBox items) contains any spec value verbatim
- `decideSpecs` must contain only keys that exist in specGroups (not values)

### 4d. check-seo unchanged

No changes to `scripts/check-seo.mjs`.

---

## 5. Proof

1. `scripts/measure-text-blocks.mjs` run on final dist/ -> `docs/content/text-blocks-after.md` showing 0 blocks >= 300 outside allow-list
2. `scripts/check-content.mjs` exits 0
3. axe-core 0 violations
4. Lighthouse accessibility 100 on a product page
5. Product page section order table compared against the 3 competitor anatomies in the inventory doc
6. Playwright test: navigating to `/targets/charuco-composite/#specifications` opens that disclosure
7. Updated screenshot baselines: product page, /targets/, a guide page
8. `pnpm build` with `SKIP_SPECS_CHECK=1`, all check-* scripts exit 0
9. Commit and push
10. `git log --oneline -3` + `git status --short` (must be empty)

---

## Files touched (estimated)

| File | Change |
|---|---|
| `src/content/config.ts` | Add `products` collection |
| `src/content/products/charuco-composite.md` | New |
| `src/content/products/charuco-ceramic.md` | New |
| `src/content/products/checkerboard-composite.md` | New |
| `src/content/products/mounting-fixture.md` | New |
| `src/content/products/certificate-ilac.md` | New |
| `src/pages/targets/[handle].astro` | Refactor buy box, key-specs, story rendering, hash-link disclosures, merge "what's in the box" |
| `src/components/ProductCard.astro` | Add summary, chips, data-card |
| `src/pages/targets/index.astro` | Pass chips to ProductCard |
| `src/pages/index.astro` | Pass chips to ProductCard, update HOW_REVIEWS_WORK usage |
| `src/pages/guides/[slug].astro` | Pass chips to ProductCard |
| `src/components/ToolContent.astro` | Split body into visible intro + disclosure sections |
| `src/components/Rating.astro` | New: shared star rating component |
| `src/islands/ReviewsSection.tsx` | Condense how-reviews-work to one sentence |
| `src/lib/reviews.ts` | Keep HOW_REVIEWS_WORK, inline short version in ReviewsSection; vitest for summarize rounding/zero |
| `scripts/check-seo.mjs` | Add aggregateRating shape validation + absence check |
| `scripts/measure-text-blocks.mjs` | New |
| `scripts/check-content.mjs` | New |
| `scripts/check-prose.mjs` | Update thresholds, add card check |
| `src/content/products.test.ts` | New vitest: no spec duplication |
| `docs/content/2026-10-29-content-inventory.md` | New |
| `docs/content/content-model.md` | New |
| `docs/content/shopify-descriptions-after.md` | New |
| `docs/content/shopify-descriptions-after.csv` | New |
| `docs/content/text-blocks-after.md` | New |
| `tests/e2e/disclosure-deeplink.spec.ts` | New Playwright test |
