# Price ladder — 2026-10-29 (rev b)

ECB EUR/USD reference rate: **1.1133** (2026-10-28)

## Rules

- **Composite**: target = calib.io anchor × 1.175, precise-rounded (avoid last digits 0/5/9),
  bounded [anchor × 1.15, anchor × 1.20].
- **Ceramic 110×85 + 150×100**: same ×1.175 rule from calib.io ceramic anchors.
- **Ceramic 185×110 + 230×140**: power-law extrapolation €/cm² = 45.26 × area^-0.3676
  fitted through the two anchored ceramic points.
- **Fixture CT-ACC-A-FIX-14**: owner-set €163 (band €140–180); different construction from calib.io MNTFIX01.
- **Certificate CT-SVC-X-CERT-ILAC**: owner-set $307 from Calibvision CNAS ≈$260 anchor; EUR derived.
- **USD**: EUR × ECB rate, precise-rounded.

## Ladder

| SKU | Size | Anchor € | Anchor source | Old $ | Proposed € | Proposed $ | % above anchor | €/cm² | Note |
|-----|------|----------|---------------|-------|------------|------------|----------------|-------|------|
| CT-CHT-P-200150 | 200×150 | €103 | calib.io CHT200150 Alu/LDPE | $79 | €121 | $134 | +17.5% | 0.4033 | — |
| CT-CHT-P-300200 | 300×200 | €108 | calib.io CHT300200 Alu/LDPE | $99 | €127 | $141 | +17.6% | 0.2117 | — |
| CT-CHT-P-400300 | 400×300 | €127 | calib.io CHT400300 Alu/LDPE | $129 | €148 | $164 | +16.5% | 0.1233 | — |
| CT-CHT-P-600400 | 600×400 | €176 | calib.io CHT600400 Alu/LDPE | $189 | €207 | $231 | +17.6% | 0.0862 | — |
| CT-CHT-P-800600 | 800×600 | €263 | calib.io CHT800600 Alu/LDPE | $259 | €308 | $343 | +17.1% | 0.0642 | — |
| CT-CHA-P-200150 | 200×150 | €116 | calib.io CCT200150 Alu/LDPE | $89 | €136 | $151 | +17.2% | 0.4533 | — |
| CT-CHA-P-300200 | 300×200 | €120 | calib.io CCT300200 Alu/LDPE | $109 | €141 | $157 | +17.5% | 0.2350 | — |
| CT-CHA-P-400300 | 400×300 | €134 | calib.io CCT400300 Alu/LDPE | $139 | €157 | $174 | +17.2% | 0.1308 | — |
| CT-CHA-P-600400 | 600×400 | €203 | calib.io CCT600400 Alu/LDPE | $199 | €238 | $264 | +17.2% | 0.0992 | — |
| CT-CHA-P-800600 | 800×600 | €273 | calib.io CCT800600 Alu/LDPE | $269 | €321 | $357 | +17.6% | 0.0669 | — |
| CT-CHA-C-110085 | 110×85 | €680 | calib.io CCT100075F ceramic 100×75 | $189 | €798 | $888 | +17.4% | 8.5348 | Anchor one size smaller (calib.io 100×75 → our 110×85) |
| CT-CHA-C-150100 | 150×100 | €915 | calib.io CCT150100F ceramic 150×100 | — | €1076 | $1198 | +17.6% | 7.1733 | Like-for-like; not yet in Shopify ⚠ not in Shopify |
| CT-CHA-C-185110 | 185×110 | — | Power-law extrapolation from 110×85 + 150×100 | $239 | €1304 | $1452 | — | 6.4079 | Extrapolated: €/cm² = 45.26 × area^-0.3676 |
| CT-CHA-C-230140 | 230×140 | — | Power-law extrapolation from 110×85 + 150×100 | $299 | €1744 | $1942 | — | 5.4161 | Extrapolated: €/cm² = 45.26 × area^-0.3676 |
| CT-ACC-A-FIX-14 | — | — | Owner override (band €140–180) | $39 | €163 | $181 | — | — | Owner-set €163; different construction from calib.io MNTFIX01 @ €240 |
| CT-SVC-X-CERT-ILAC | — | — | Calibvision CNAS cert ≈$260/PN → owner $307 | $149 | €276 | $307 | — | — | Owner-set $307; EUR derived via ECB rate |

## Monotonicity check

- **CHT-P**: PASS — price/cm² decreases with size
- **CHA-P**: PASS — price/cm² decreases with size
- **CHA-C**: PASS — price/cm² decreases with size

## SKUs not in Shopify

- **CT-CHA-C-150100** (CHA-C-150100): proposed €1076 / $1198 — create variants before import
