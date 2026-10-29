# Price ladder — 2026-10-29 (rev c)

ECB EUR/USD reference rate: **1.1133** (2026-10-28)

## Rules

- **Composite**: target = calib.io anchor × 1.175, precise-rounded (avoid last digits 0/5/9),
  bounded [anchor × 1.15, anchor × 1.20].
- **Ceramic 110×85 + 150×100**: same ×1.175 rule from calib.io ceramic anchors.
- **Ceramic 185×110 + 230×140**: power-law extrapolation €/cm² = 44.67 × area^-0.3650
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
| CT-APR-P-200150 | 200×150 | €103 | calib.io CHT200150 (proxy — no kalibr-targets 200×150) | — | €121 | $134 | +17.5% | 0.4033 | — |
| CT-APR-P-300200 | 300×200 | €108 | calib.io CHT300200 (proxy — no kalibr-targets 300×200) | — | €127 | $141 | +17.6% | 0.2117 | — |
| CT-APR-P-400300 | 400×300 | €176 | calib.io KLB400300 | — | €207 | $231 | +17.6% | 0.1725 | — |
| CT-APR-P-600400 | 600×400 | €234 | calib.io KLB600400 | — | €274 | $306 | +17.1% | 0.1142 | — |
| CT-APR-P-800600 | 800×600 | €315 | calib.io KLB800600 | — | €371 | $413 | +17.8% | 0.0773 | — |
| CT-CIR-P-200150 | 200×150 | €103 | calib.io CT200150 | — | €121 | $134 | +17.5% | 0.4033 | — |
| CT-CIR-P-300200 | 300×200 | €108 | calib.io CT300200 | — | €127 | $141 | +17.6% | 0.2117 | — |
| CT-CIR-P-400300 | 400×300 | €127 | calib.io CT400300 | — | €148 | $164 | +16.5% | 0.1233 | — |
| CT-CIR-P-600400 | 600×400 | €176 | calib.io CT600400 | — | €207 | $231 | +17.6% | 0.0862 | — |
| CT-CIR-P-800600 | 800×600 | €263 | calib.io CT800600 | — | €308 | $343 | +17.1% | 0.0642 | — |
| CT-ACR-P-200150 | 200×150 | €103 | calib.io ACT200150 | — | €121 | $134 | +17.5% | 0.4033 | — |
| CT-ACR-P-300200 | 300×200 | €108 | calib.io ACT300200 | — | €127 | $141 | +17.6% | 0.2117 | — |
| CT-ACR-P-400300 | 400×300 | €121 | calib.io ACT400300 | — | €142 | $158 | +17.4% | 0.1183 | — |
| CT-ACR-P-600400 | 600×400 | €176 | calib.io ACT600400 | — | €207 | $231 | +17.6% | 0.0862 | — |
| CT-ACR-P-800600 | 800×600 | €263 | calib.io ACT800600 | — | €308 | $343 | +17.1% | 0.0642 | — |
| CT-HAL-P-200150 | 200×150 | €127 | calib.io HAL200150F | — | €148 | $164 | +16.5% | 0.4933 | — |
| CT-HAL-P-300200 | 300×200 | €133 | calib.io HAL300200F | — | €156 | $174 | +17.3% | 0.2600 | — |
| CT-HAL-P-400300 | 400×300 | €142 | calib.io HAL400300F | — | €167 | $186 | +17.6% | 0.1392 | — |
| CT-HAL-P-600400 | 600×400 | €208 | calib.io HAL600400F | — | €244 | $272 | +17.3% | 0.1017 | — |
| CT-HAL-P-800600 | 800×600 | €283 | calib.io HAL800600F | — | €333 | $371 | +17.7% | 0.0694 | — |
| CT-CHA-C-110085 | 110×85 | €680 | calib.io CCT100075F ceramic 100×75 | $189 | €797 | $887 | +17.2% | 8.5241 | Owner override €797/$887 (avoid repeated-digit look of 798/888) |
| CT-CHA-C-150100 | 150×100 | €915 | calib.io CCT150100F ceramic 150×100 | — | €1076 | $1198 | +17.6% | 7.1733 | Like-for-like; not yet in Shopify |
| CT-CHA-C-185110 | 185×110 | — | Power-law extrapolation from 110×85 + 150×100 | $239 | €1306 | $1454 | — | 6.4177 | Extrapolated: €/cm² = 44.67 × area^-0.3650 |
| CT-CHA-C-230140 | 230×140 | — | Power-law extrapolation from 110×85 + 150×100 | $299 | €1748 | $1946 | — | 5.4286 | Extrapolated: €/cm² = 44.67 × area^-0.3650 |
| CT-ACC-A-FIX-14 | — | — | Owner override (band €140–180) | $39 | €163 | $181 | — | — | Owner-set €163; different construction from calib.io MNTFIX01 @ €240 |
| CT-SVC-X-CERT-ILAC | — | — | Calibvision CNAS cert ≈$260/PN → owner $307 | $149 | €276 | $307 | — | — | Owner-set $307; EUR derived via ECB rate |

## Monotonicity check

- **CHT-P**: PASS — price/cm² decreases with size
- **CHA-P**: PASS — price/cm² decreases with size
- **APR-P**: PASS — price/cm² decreases with size
- **CIR-P**: PASS — price/cm² decreases with size
- **ACR-P**: PASS — price/cm² decreases with size
- **HAL-P**: PASS — price/cm² decreases with size
- **CHA-C**: PASS — price/cm² decreases with size

## SKUs not in Shopify

All priced SKUs exist in the store.
