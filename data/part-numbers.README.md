# Part-number registry (public subset)

`part-numbers.csv` lists every part number that is sold or visible on calib.tools.
Grammar and validation: `src/lib/partNumber.ts`. Check: `tsx scripts/check-part-numbers.ts` (runs in `prebuild`).

Columns: `pn, status, family, material, size, variant, options, name_en, product_handle, legacy_sku, notes`.

- `pn` is the Shopify Variant SKU, the number printed on the target and the datasheet ordering code.
- `legacy_sku` keeps the pre-v3 SKU while Shopify is migrated; `scripts/check-skus.mjs` reports SKUs still on the old value.
- Planned items and supply-chain data are kept outside this public repository.

New sellable variant: add a row here first, run the check, then create the Shopify variant with `pn` as its SKU.
