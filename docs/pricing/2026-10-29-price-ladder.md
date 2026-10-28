# Price ladder — 2026-10-29

ECB EUR/USD reference rate: **1.1133** (2026-10-28)

Rule: target = anchor × 1.175, precise-rounded (avoid last digits 0/5/9),
bounded [anchor × 1.15, anchor × 1.20]. USD = EUR × ECB rate, same rounding.

| SKU | Size | Anchor € | Anchor source | Proposed € | Proposed $ | % above | €/cm² | Note |
|-----|------|----------|---------------|------------|------------|---------|-------|------|
| CT-CHT-P-200150 | 200×150 | €103 | calib.io checkerboard Alu/LDPE | €121 | $134 | +17.5% | 0.4033 | — |
| CT-CHT-P-300200 | 300×200 | €108 | calib.io checkerboard Alu/LDPE | €127 | $141 | +17.6% | 0.2117 | — |
| CT-CHT-P-400300 | 400×300 | €127 | calib.io checkerboard Alu/LDPE | €148 | $164 | +16.5% | 0.1233 | — |
| CT-CHT-P-600400 | 600×400 | €176 | calib.io checkerboard Alu/LDPE | €207 | $231 | +17.6% | 0.0862 | — |
| CT-CHT-P-800600 | 800×600 | €263 | calib.io checkerboard Alu/LDPE | €308 | $343 | +17.1% | 0.0642 | — |
| CT-CHA-P-200150 | 200×150 | €116 | calib.io charuco Alu/LDPE | €136 | $151 | +17.2% | 0.4533 | — |
| CT-CHA-P-300200 | 300×200 | €120 | calib.io charuco Alu/LDPE | €141 | $157 | +17.5% | 0.2350 | — |
| CT-CHA-P-400300 | 400×300 | €134 | calib.io charuco Alu/LDPE | €157 | $174 | +17.2% | 0.1308 | — |
| CT-CHA-P-600400 | 600×400 | €203 | calib.io charuco Alu/LDPE | €238 | $264 | +17.2% | 0.0992 | — |
| CT-CHA-P-800600 | 800×600 | €273 | calib.io charuco Alu/LDPE | €321 | $357 | +17.6% | 0.0669 | — |
| CT-CHA-C-110085 | 110×85 | €680 | calib.io charuco ceramic 100×75 | €798 | $888 | +17.4% | 8.5348 | Not like-for-like: our 110×85 vs calib.io 100×75; also Calibvision $277–977 ±2 µm |
| CT-CHA-C-150100 | 150×100 | €915 | calib.io charuco ceramic 150×100 | €1076 | $1198 | +17.6% | 7.1733 | Like-for-like; Calibvision $277–977 ±2 µm also available |
| CT-CHA-C-185110 | 185×110 | — | Calibvision $277–977 ±2 µm (no calib.io equivalent) | — | — | — | — | No like-for-like; largest calib.io ceramic is 150×100 |
| CT-CHA-C-230140 | 230×140 | — | Calibvision $277–977 ±2 µm (no calib.io equivalent) | — | — | — | — | No like-for-like; largest calib.io ceramic is 150×100 |
| CT-ACC-A-FIX-14 | — | €240 | calib.io mounting-fixture | €282 | $314 | +17.5% | — | Fixture ↔ fixture; calib.io is CNC alu, ours is anodised alu 6061 + TPU jaws |
| CT-SVC-X-CERT-ILAC | — | — | No competitor equivalent | — | — | — | — | Service add-on; no anchor |

## Monotonicity check

- **CHT-P**: PASS — price/cm² decreases with size
- **CHA-P**: PASS — price/cm² decreases with size
- **CHA-C**: PASS — price/cm² decreases with size
