# Content Model

## Rules

1. **Always visible:** Anything needed to decide to buy — price, accuracy/tolerance, sizes, substrate, lead time, star rating.
2. **Disclosure:** "After you decide" slots — in the box, files, mounting, care, compatibility detail.
3. **Never inside a disclosure:** H1, meta description, specs table.
4. **One Disclosure component site-wide:** Native `<details>`/`<summary>` with chevron icon, [APG disclosure pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/). Open state encoded in URL hash so links can deep-link (e.g. `/targets/charuco-composite/#compatibility` opens that disclosure).
5. **Character budgets:** Block elements <= 300 chars (allow-list for form-control groups). Cards (`[data-card]`) <= 220 chars total text.

---

## Product page

| # | Slot | Source field | Char budget | Reveal |
|---|---|---|---|---|
| 1 | H1 (product title) | Shopify `product.title` | — | visible |
| 2 | Star rating | `summarize(getReviewsForProduct)` via Rating component | — | visible (hidden at 0) |
| 3 | Summary | `src/content/products/<handle>.md` frontmatter `summary` | <= 90 | visible |
| 4 | Decide-specs strip | 3 chips: `decideSpecs` keys resolved from `productData.specGroups` | — | visible |
| 5 | Price / variants | Shopify Storefront API | — | visible |
| 6 | Story | Product content `story` (2 short paragraphs, story-only) | <= 400 | visible |
| 7 | Specifications (full table) | `productData.specGroups` (datasheet-derived) | — | visible |
| 8 | In the box | `productData.deliverables` + product content override | — | disclosure |
| 9 | Files & formats | `productData.deliverables` files list + config files | — | disclosure |
| 10 | Mounting & care | `productData.specGroups` Physical mounting + Environment cleaning | — | disclosure |
| 11 | Compatibility | Hardcoded table (see note below) | — | disclosure |
| 12 | Reviews | ReviewsSection island — one-sentence note + link | — | visible (summary) |
| 13 | Related / pairs with | Shopify product relationships | — | visible |

> **Note:** Compatibility table is hardcoded for now. Move to `productData` in PROD-1 so new AprilGrid/HALCON products don't fork another copy.

## Collection page

| # | Slot | Source field | Char budget | Reveal |
|---|---|---|---|---|
| 1 | H1 | Content collection `title` | — | visible |
| 2 | Description | Content collection `description` | <= 160 | visible |
| 3 | Product cards | See Card spec below | — | visible |

## Tool page

| # | Slot | Source field | Char budget | Reveal |
|---|---|---|---|---|
| 1 | H1 | Content tool `h1` | — | visible |
| 2 | Intro | First paragraph of tool markdown body | <= 240 | visible |
| 3 | Tool island | React island | — | visible |
| 4 | How it works | Tool markdown section | — | disclosure |
| 5 | Limits / notes | Tool markdown remaining sections | — | disclosure |
| 6 | FAQ | Tool frontmatter `faq` | — | disclosure (existing) |

## Guide page

| # | Slot | Source field | Char budget | Reveal |
|---|---|---|---|---|
| 1 | H1 | Guide frontmatter `title` | — | visible |
| 2 | Body | Guide markdown | — | visible |
| 3 | FAQ | Guide frontmatter `faq` | — | disclosure (existing) |
| 4 | Related products | Guide frontmatter `products` | — | visible |

## Policy page

| # | Slot | Source field | Char budget | Reveal |
|---|---|---|---|---|
| 1 | H1 | Hardcoded | — | visible |
| 2 | Body | Hardcoded prose | — | visible |

---

## Card spec (unified)

All cards (product cards on /targets/, collection rows, related cards in guides):

| Slot | Source | Char budget |
|---|---|---|
| Image | Shopify CDN or local optimized | — |
| Title | Product/collection title | — |
| Star rating | Rating component; hidden at 0 | — |
| Summary | Product content `summary` or Shopify `description` | <= 90 |
| 3 chips | Product content `decideSpecs` keys -> values from specGroups | — |
| Price | Shopify `priceFrom` | — |

Card total text (title + summary + chips + price) must be <= 220 chars when rendered. `data-card` attribute on root element for guard targeting.
