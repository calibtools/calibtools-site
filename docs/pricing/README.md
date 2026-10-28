# Pricing — rules, anchors, and regeneration

## Price rule

1. **Composite targets** (CHT-P, CHA-P): `target_EUR = calib.io_anchor × 1.175`,
   precise-rounded to avoid last digits 0/5/9, bounded `[anchor × 1.15, anchor × 1.20]`.
2. **Ceramic targets** (CHA-C):
   - 110×85 and 150×100 use the same ×1.175 rule from calib.io ceramic anchors
     (110×85 anchored to calib.io 100×75 — one size smaller).
   - 185×110 and 230×140 are extrapolated via a power-law fit:
     `€/cm² = 45.26 × area_cm²^(−0.3676)`, fitted through the two anchored points.
3. **USD conversion**: `EUR × ECB_rate`, precise-rounded (same digit rule).
4. **Precise-round**: round to nearest integer; if last digit ∈ {0, 5, 9}, nudge
   ±1–3 to the nearest digit in {1, 2, 3, 4, 6, 7, 8} within bounds.
5. **Monotonicity**: within each sized family, price-per-cm² must strictly decrease
   with area. The script flags (does not silently fix) any violation.

## Anchors

| Family | Anchor source | Date captured |
|--------|--------------|---------------|
| CHT-P (composite checkerboard) | calib.io `checkerboard.json` Alu/LDPE variants | 2026-10-29 |
| CHA-P (composite ChArUco) | calib.io `charuco-targets.json` Alu/LDPE variants | 2026-10-29 |
| CHA-C 110×85 | calib.io `charuco-targets.json` ceramic 100×75 (€680) | 2026-10-29 |
| CHA-C 150×100 | calib.io `charuco-targets.json` ceramic 150×100 (€915) | 2026-10-29 |
| CHA-C 185×110, 230×140 | Power-law extrapolation (no calib.io equivalent) | 2026-10-29 |
| ECB EUR/USD | 1.1133 (ECB daily XML feed) | 2026-10-28 |

Raw JSON snapshots are in `calib-io/2026-10-29/`.

## Owner overrides

These prices were set by owner decision, not derived from the rule:

| SKU | Decision | Rationale |
|-----|----------|-----------|
| CT-ACC-A-FIX-14 (fixture) | €163 / $181 | Owner band €140–180; different construction from calib.io MNTFIX01 (€240) |
| CT-SVC-X-CERT-ILAC (certificate) | $307 / €276 | Anchored to Calibvision CNAS cert ≈$260/PN; owner markup to $307 |

## Store currency

The Shopify store currency is **USD**. The import CSV uses USD prices.
When/if the store switches to EUR via Shopify Markets, regenerate the CSV
with EUR prices and update this section.

## SKU mapping

Shopify variant SKUs differ from datasheet SKUs:

| Datasheet SKU | Shopify SKU pattern | Variants per size |
|---------------|--------------------|--------------------|
| CT-CHT-P-{size} | CHT-{size}-F, CHT-{size}-C | 2 (Fine/Coarse) |
| CT-CHA-P-{size} | CHA-{size}-6X6, -5X5, -4X4, -AT36 | 4 (dictionary) |
| CT-CHA-C-{size} | CHA-C-{size}-6X6, -5X5 | 2 (dictionary) |
| CT-ACC-A-FIX-14 | ACC-FIX-14 | 1 |
| CT-SVC-X-CERT-ILAC | SVC-CERT-ILAC | 1 |

**Not yet in Shopify**: CT-CHA-C-150100 (150×100 ceramic). Create the variants
before importing prices for that size.

## Regeneration

```bash
# 1. Regenerate ladder + CSV from scripts/pricing.mjs
node scripts/pricing.mjs

# 2. Owner imports shopify-price-import-2026-10-29.csv into Shopify Admin
#    (Settings → Import, or Matrixify bulk editor)
```

## After import — what needs rebuilding

| Artefact | Carries a price literal? | Action needed |
|----------|-------------------------|---------------|
| Product pages (`/targets/[handle]`) | No — reads `priceFrom` from Shopify Storefront API at build time | Rebuild site (deploy hook is enough) |
| Collection pages | No — same Storefront API query | Rebuild site |
| JSON-LD (`Product` schema) | No — uses `priceMinAmount` from API | Rebuild site |
| OG images | No — no price in OG images | None |
| `src/lib/shopify.ts` FALLBACK_PRODUCTS | **Yes** — `priceFrom` / `priceMinAmount` for 5 products (lines ~504–539) | Update manually to match new "from" prices; these are only used when API credentials are missing |
| Datasheets (`docs/datasheets/*.md`) | No — no price literals | None |
| `src/lib/claims.ts` | No — no price literals | None |
| `src/islands/VariantPicker.tsx` | Has "free EU shipping over €150" threshold (not a product price) | Review if fixture/cert prices change the threshold decision |
| Customer docs sample data (`docs/design/customer-docs/_source/system/sample.json`) | Yes — sample invoice unit prices | Update if sample should reflect real prices |

**TL;DR**: after Shopify import, trigger a site rebuild (Netlify/Vercel deploy hook
or `pnpm build`). Optionally update the 5 fallback prices in `shopify.ts` for
dev-without-credentials parity.
