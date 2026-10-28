# Content Inventory — UI-2

Date: 2026-10-29

## 1a. Text blocks >= 300 characters

Measured from `dist/` after build (`scripts/measure-text-blocks.mjs`).

| Page | Tag | Chars | Source | Preview |
|---|---|---|---|---|
| /about/ | `<p>` | 322 | component literal | [WHY WE BUILT THIS — calibration targets should be affordable, well-documented a... |
| /targets/certificate-ilac/ | `<p>` | 328 | component literal | How reviews work: Reviews come from customers we invite after delivery and from... |
| /targets/charuco-ceramic/ | `<p>` | 328 | component literal | How reviews work: Reviews come from customers we invite after delivery and from... |
| /targets/charuco-composite/ | `<p>` | 328 | component literal | How reviews work: Reviews come from customers we invite after delivery and from... |
| /targets/checkerboard-composite/ | `<p>` | 328 | component literal | How reviews work: Reviews come from customers we invite after delivery and from... |
| /targets/collection/ceramic-glass/ | `<p>` | 435 | component literal | White alumina ceramic with matte blue chrome pattern, lithographed in a cleanroo... |
| /targets/collection/composite-boards/ | `<p>` | 520 | component literal | ChArUco pattern (checkerboard with embedded ArUco markers) on aluminium/LDPE com... |
| /targets/collection/composite-boards/ | `<p>` | 459 | component literal | Aluminium/LDPE composite, 6 mm. UV-printed matte pattern. Feature tolerance 0.3... |
| /targets/mounting-fixture/ | `<p>` | 328 | component literal | How reviews work: Reviews come from customers we invite after delivery and from... |
| /tools/capture/ | `<p>` | 313 | component literal | Mount a ChArUco board on a flat surface. Start the camera, capture "Center" at r... |
| /tools/check/ | `<p>` | 340 | component literal | The detection check loads OpenCV.js in your browser and runs the appropriate cor... |
| /tools/convert/ | `<p>` | 341 | component literal | The format converter takes a calibration target config in any supported format —... |

**Summary:** 12 blocks >= 300 chars. 5 are the HOW_REVIEWS_WORK paragraph (328 chars each, will be condensed to one sentence in UI-2). 3 are collection page descriptions (Shopify descriptionHtml rendered as prose). 3 are tool page body paragraphs (will move into disclosures). 1 is the about page placeholder.

## 1b. Shopify description decomposition

### charuco-composite

Full Shopify description:
> ChArUco pattern (checkerboard with embedded ArUco markers) on aluminium/LDPE composite, 6 mm. UV-printed matte finish. Feature tolerance 0.3 mm + 0.2 mm/m. Operating range -50 C to +80 C, outdoor use up to 3 years. Each board ships with an inspection report, datasheet, DXF outline and pattern files for OpenCV, Kalibr and HALCON. [Spec table: Substrate, Feature tolerance, Thermal expansion, Operating range, Mounting]

| Statement | Datasheet field | Tag |
|---|---|---|
| ChArUco pattern (checkerboard with embedded ArUco markers) | — | **story** (what it is) |
| on aluminium/LDPE composite, 6 mm | CT-DS-CHA-P Physical > Substrate | spec |
| UV-printed matte finish | CT-DS-CHA-P Physical > Pattern | spec |
| Feature tolerance 0.3 mm + 0.2 mm/m | CT-DS-CHA-P Geometry > Feature position tolerance | spec |
| Operating range -50 C to +80 C | CT-DS-CHA-P Environment > Operating temperature | spec |
| outdoor use up to 3 years | CT-DS-CHA-P Environment > Outdoor lifetime | spec |
| Each board ships with an inspection report, datasheet, DXF outline and pattern files for OpenCV, Kalibr and HALCON | CT-DS-CHA-P Deliverables > Inspection report, Files | spec (in-the-box) |
| Spec table rows (Substrate, Feature tolerance, Thermal expansion, Operating range, Mounting) | Verbatim from datasheet | spec |

**Story-only (kept):** "ChArUco combines a checkerboard with ArUco markers in the white squares. Markers identify each corner, so the board works even when partially outside the frame — exactly where lens distortion is strongest. Native in OpenCV, supported by MATLAB and most multi-camera toolchains."

### charuco-ceramic

Full Shopify description:
> White alumina ceramic with matte blue chrome pattern, lithographed in a cleanroom. Feature accuracy +/-2 um. Thermal expansion ~7.2 um/(C.m). For front-lit, small-FOV and metrology-grade calibration. Inspection report included; ILAC-recognised calibration certificate available as an add-on. [Spec table: Substrate, Feature accuracy, Thermal expansion, Operating range, Finish]

| Statement | Datasheet field | Tag |
|---|---|---|
| White alumina ceramic with matte blue chrome pattern, lithographed in a cleanroom | CT-DS-CHA-C Physical > Substrate + Pattern | spec |
| Feature accuracy +/-2 um | CT-DS-CHA-C Geometry > Feature position accuracy | spec |
| Thermal expansion ~7.2 um/(C.m) | CT-DS-CHA-C Environment > Thermal expansion | spec |
| For front-lit, small-FOV and metrology-grade calibration | — | **story** (who it's for) |
| Inspection report included | CT-DS-CHA-C Deliverables > Inspection report | spec (in-the-box) |
| ILAC-recognised calibration certificate available as an add-on | CT-DS-CHA-C Deliverables > Options | spec |
| Spec table rows | Verbatim from datasheet | spec |

**Story-only (kept):** "Lithographed chrome pattern on white alumina ceramic. Feature accuracy two orders of magnitude better than printed boards, thermally stable, chemically inert. For metrology-grade camera calibration, high-magnification optics, and setups where the target must not be the error budget."

### checkerboard-composite

Full Shopify description:
> Aluminium/LDPE composite, 6 mm. UV-printed matte pattern. Feature tolerance 0.3 mm + 0.2 mm/m. Operating range -50 C to +80 C, outdoor use up to 3 years. Each board ships with an inspection report, datasheet, DXF outline and pattern files for OpenCV, Kalibr and HALCON. [Spec table same as charuco-composite]

| Statement | Datasheet field | Tag |
|---|---|---|
| Aluminium/LDPE composite, 6 mm | CT-DS-CHT-P Physical > Substrate | spec |
| UV-printed matte pattern | CT-DS-CHT-P Physical > Pattern | spec |
| Feature tolerance 0.3 mm + 0.2 mm/m | CT-DS-CHT-P Geometry > Feature position tolerance | spec |
| Operating range -50 C to +80 C | CT-DS-CHT-P Environment > Operating temperature | spec |
| outdoor use up to 3 years | CT-DS-CHT-P Environment > Outdoor lifetime | spec |
| Each board ships with... | CT-DS-CHT-P Deliverables | spec (in-the-box) |
| Spec table rows | Verbatim from datasheet | spec |

**Story-only (kept):** "The classic pattern: highest corner localisation accuracy of any planar target when the whole board is in view. Supported by every calibration toolchain. Choose Fine for more corners per image or Coarse for low-resolution and long-distance setups."

**Conclusion:** Every Shopify description is >80% spec data that duplicates the datasheet. The story-only extraction keeps 1-2 paragraphs of positioning.

## 1c. Competitor product page anatomy

| Section | calib.io (ChArUco board) | thorlabs.com (optical post) | edmundoptics.com (lens) |
|---|---|---|---|
| 1 | Hero image + title + price | Image + title + part# + price + in-stock | Image + title + part# + price + stock |
| 2 | Short description (1 sentence) | Ordering table (sizes/configs) | Key specs strip (4-6 values) |
| 3 | Add to cart | Tab: Overview (description) | Tab: Description (2 paragraphs) |
| 4 | Specifications table | Tab: Specs (full table) | Tab: Specifications (full table) |
| 5 | Downloads | Tab: Documents (PDFs) | Tab: Documents (CAD, PDF) |
| 6 | — | Tab: Feedback | Tab: Related products |
| Tabs/Accordions | None (flat page) | **Tabs** (4-5 tabs) | **Tabs** (4-5 tabs) |
| Above the fold | Image, title, price, 1-line desc | Image, title, price, stock, part# | Image, title, price, key specs |
| Key observation | Minimal — no progressive disclosure | Tabs keep specs/docs below fold | Specs strip above fold, detail in tabs |

**Takeaway for calib.tools:** Thorlabs and Edmund use tabs to hide detail; we use native `<details>` accordions (same progressive disclosure, better for SEO since content is in DOM). Our approach matches industry pattern: key specs visible, detail in disclosures. The "decide-specs strip" above the fold mirrors Edmund's approach.

## 1d. User task -> information slot mapping

### From docs/ia/tasks.md

| Task | Information slot needed first |
|---|---|
| 1. Find a board that works with Kalibr | Compatibility (framework support) |
| 2. See who pays import duties | Shipping (DAP terms) |
| 3. Download OpenCV YAML for a ChArUco board | Files & formats (config files) |
| 4. Verify inspection report for serial 000311 | Inspection report (verify link) |
| 5. Ask for a quote on 1200 mm custom board | Price / quote CTA |
| 6. Compare composite vs ceramic | Specs table (decide-specs: accuracy, substrate) |
| 7. Check what detector sees in calibration photo | Tool page (check tool) |
| 8. Buy a ChArUco ceramic board | Price + add to cart |
| 9. Find the return policy | Shipping, returns & warranty |
| 10. Convert OpenCV to HALCON format | Tool page (convert tool) |

### From Search Console queries (docs/ia/baseline.md)

| Query group | Slot needed first |
|---|---|
| "charuco board download/generator" (tool intent) | Tool page or Files & formats |
| "aprilgrid" (tool/product) | Tool page or product card |
| "calibration board/tools" (category) | Product cards with decide-specs |
| "fov simulator/converter/calculator" (tool intent) | Tool page |
| "calib" / "calib io" (brand confusion) | H1 + summary (identity) |
| "checkerboard generator" (tool intent) | Tool page |

**Conclusion:** Tasks 1, 3, 6, 9 need information inside disclosures — confirming the need for hash deep-links. Tasks 2, 4, 8 need always-visible slots (price, shipping summary, verify link). Search queries are predominantly tool-intent, validating the tool page intro being visible above the fold.
