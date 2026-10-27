# Consistency Audit — 2026-10-28

## 1a. Ceramic accuracy not ±2 µm

| File | Line | Text | Action |
|------|------|------|--------|
| src/content/collections/ceramic-glass.md | 3 | "±1–2 µm feature accuracy" | Fix: replace with ±2 µm |
| src/content/collections/ceramic-glass.md | 5 | "±1–2 µm measured against" | Fix: replace with ±2 µm |
| src/content/collections/ceramic-glass.md | 15 | "±1–2 µm" in specsTable | Fix: replace with ±2 µm |
| src/content/collections/ceramic-glass.md | 24 | "±1–2 µm feature positions" | Fix: replace with ±2 µm |
| src/content/collections/composite-boards.md | 60 | "±1–2 µm (roughly 100×)" | Fix: replace with ±2 µm, fix ratio |
| src/lib/faq.ts | 14 | "±1–2 µm" | Fix: use CERAMIC_ACCURACY constant |
| src/lib/shopify.ts | 546 | "±1–2 µm" fallback | Fix: use CERAMIC_ACCURACY constant |
| src/lib/shopify.ts | 521 | "±2 µm" | Already correct |

## 1b. Fixture price

| File | Line | Text | Action |
|------|------|------|--------|
| src/lib/shopify.ts | 538 | "€149" hardcoded fallback price | Left for owner (Shopify provides live price) |

## 1c. 2025 as future date

| File | Line | Text | Action |
|------|------|------|--------|
| src/content/collections/lidar-image-quality.md | 38 | "ship in early 2025" | Fix: remove stale date |
| src/lib/shopify.ts and shopifyAdmin.ts | — | "2025-07" API version | Left for owner (API version, not prose) |
| tools index / home | — | "coming soon" | OK, constant-driven (computed from tools.ts live flag) |

## 1d. Multi-board sets

| File | Line | Text | Action |
|------|------|------|--------|
| src/pages/index.astro | 29, 34 | lidar-image-quality overridden to "Multi-board sets" | Left for owner (TODO noted in code, collection handle not yet changed) |

## 1e. "Not flat, not accurate..."

| File | Line | Text | Action |
|------|------|------|--------|
| src/pages/index.astro | 60 | in why[] array | Not in claims.ts, inline |
| src/pages/returns.astro | 10 | same sentence | Not in claims.ts |
| — | — | — | Left for owner: consider adding RETURNS_POLICY to claims.ts |

## 1f. Currency in prose

| File | Line | Text | Action |
|------|------|------|--------|
| src/pages/shipping.astro | 24 | "Prices are in EUR" | Left for owner (shipping terms not decided) |

## 1g. DAkkS as certificate

| File | Line | Text | Action |
|------|------|------|--------|
| All usages | — | "DAkkS-calibrated reference" / "DAkkS-accredited laboratory" | OK — correctly describes the golden sample, not the certificate |
| src/docs/build/ct-sv-cert-ilac.ts | 107 | "DAkkS certificate" in document PDF | Fix: clarify wording (this is the golden-sample reference cert number) |
| — | — | No instance implies the customer certificate is DAkkS-issued | OK |
