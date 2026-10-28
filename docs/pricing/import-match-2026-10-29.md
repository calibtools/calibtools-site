# Shopify price import match report — 2026-10-29

Source export: `~/Downloads/products_export_1.csv` (38 variant rows across 5 products).
Price file: `shopify-price-import-2026-10-29.csv` (38 SKUs, USD).
Output: `products_import_prices_2026-10-29.csv` — ready for Shopify Admin import.

## Match table

| Variant SKU | Old $ | New $ | Status |
|-------------|------:|------:|--------|
| SVC-CERT-ILAC | 149.00 | 307.00 | matched |
| ACC-FIX-14 | 39.00 | 181.00 | matched |
| CHA-C-11085-6X6 | 189.00 | 887.00 | matched |
| CHA-C-11085-5X5 | 189.00 | 887.00 | matched |
| CHA-C-185110-6X6 | 239.00 | 1454.00 | matched |
| CHA-C-185110-5X5 | 239.00 | 1454.00 | matched |
| CHA-C-230140-6X6 | 299.00 | 1946.00 | matched |
| CHA-C-230140-5X5 | 299.00 | 1946.00 | matched |
| CHA-200150-6X6 | 89.00 | 151.00 | matched |
| CHA-200150-5X5 | 89.00 | 151.00 | matched |
| CHA-200150-4X4 | 89.00 | 151.00 | matched |
| CHA-200150-AT36 | 89.00 | 151.00 | matched |
| CHA-300200-6X6 | 109.00 | 157.00 | matched |
| CHA-300200-5X5 | 109.00 | 157.00 | matched |
| CHA-300200-4X4 | 109.00 | 157.00 | matched |
| CHA-300200-AT36 | 109.00 | 157.00 | matched |
| CHA-400300-6X6 | 139.00 | 174.00 | matched |
| CHA-400300-5X5 | 139.00 | 174.00 | matched |
| CHA-400300-4X4 | 139.00 | 174.00 | matched |
| CHA-400300-AT36 | 139.00 | 174.00 | matched |
| CHA-600400-6X6 | 199.00 | 264.00 | matched |
| CHA-600400-5X5 | 199.00 | 264.00 | matched |
| CHA-600400-4X4 | 199.00 | 264.00 | matched |
| CHA-600400-AT36 | 199.00 | 264.00 | matched |
| CHA-800600-6X6 | 269.00 | 357.00 | matched |
| CHA-800600-5X5 | 269.00 | 357.00 | matched |
| CHA-800600-4X4 | 269.00 | 357.00 | matched |
| CHA-800600-AT36 | 269.00 | 357.00 | matched |
| CHT-200150-F | 79.00 | 134.00 | matched |
| CHT-200150-C | 79.00 | 134.00 | matched |
| CHT-300200-F | 99.00 | 141.00 | matched |
| CHT-300200-C | 99.00 | 141.00 | matched |
| CHT-400300-F | 129.00 | 164.00 | matched |
| CHT-400300-C | 129.00 | 164.00 | matched |
| CHT-600400-F | 189.00 | 231.00 | matched |
| CHT-600400-C | 189.00 | 231.00 | matched |
| CHT-800600-F | 259.00 | 343.00 | matched |
| CHT-800600-C | 259.00 | 343.00 | matched |

## Summary

- **38/38** price-file SKUs matched an export row.
- **0** price-file SKUs missing from export.
- All non-price columns preserved unchanged (including Variant Compare At Price).
