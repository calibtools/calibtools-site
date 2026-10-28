# Brand block sizing and detection proof — 2026-10-28

Numbers and sources only. No design opinions.

## 1a. Wordmark glyph bounding boxes

Measured from SVG path `d` attributes (not viewBox).

| Variant | Glyph bbox x | Glyph bbox y | Width | Height | Cap height H |
|---------|-------------|-------------|-------|--------|-------------|
| Compact | [40, 7186] | [-726, 16] | 7146 | 742 | 710 |
| Framed | [-271, 7497] | [-1269.5, 559.5] | 7768 | 1829 | 710 |

Cap height measured from flat capitals I, L, T: y = 0 (baseline) to y = -710 (cap line).

| Ratio | Compact | Framed |
|-------|---------|--------|
| Width / H | 10.065 | 10.941 |
| H / width | 0.09936 | 0.09140 |
| ViewBox width / H | 10.105 (7174.4 / 710) | 10.981 (7796.4 / 710) |
| ViewBox aspect (w/h) | 9.313 | 4.197 |

Red dot rect: [3340, -196, 196, 196] — sits on the baseline, width = stem width.

## 1b. Brand guideline minimum sizes and clear space

Source: `calibtools-brand-guidelines.pdf` v1.0 October 2026, sections 03-04.

### Construction (§03)

- Bracket arms: 0.8 H
- Bracket stroke: 0.5 w (w = stem width = red square side)
- Bracket clearance to letters: 0.3 H horizontally, 0.65 H vertically

### Clear space and minimum size (§04)

- Wordmarks and lockups: clear space = **1 × H** (cap height) on all four sides
- Icon: clear space = 0.25 × D (diameter)
- Minimum print widths:

| Logo | Min on screen | Min in print | Below minimum |
|------|--------------|-------------|---------------|
| Primary wordmark (framed) | 120 px | **25 mm** | Use compact |
| Compact wordmark | 90 px | **20 mm** | Use icon |
| Horizontal lockup | 140 px | 30 mm | Use icon |
| Icon | 16 px | 6 mm dia | — |

### Variant selection at ISO 3098 sizes

At ISO 3098 3.5 mm cap height on A4: compact width = 35.4 mm.
This exceeds both the compact minimum (20 mm) and the framed minimum (25 mm).
The guideline (§02 + §04) prefers framed for exports when width >= 25 mm.

Current implementation uses compact. Framed would also be valid at these sizes.

## 1c. OpenCV quiet zone requirements

| Detector | Quiet zone needed | Source |
|----------|------------------|--------|
| ArUco (`markerBorderBits=1`) | >= 1 marker cell white border per side | [DetectorParameters](https://docs.opencv.org/4.x/d1/dcd/structcv_1_1aruco_1_1DetectorParameters.html), [tutorial](https://docs.opencv.org/4.13.0/d5/dae/tutorial_aruco_detection.html) |
| `findChessboardCornersSB` | ~1 square width white border around board | [calib3d docs](https://docs.opencv.org/4.13.0/d9/d0c/group__calib3d.html), `modules/calib3d/src/chessboard.cpp`, [PR #12668](https://github.com/opencv/opencv/pull/12668) |
| AprilTag (`black_border=1`) | 1 cell white outside black border | [Olson 2011](https://april.eecs.umich.edu/media/pdfs/olson2011tags.pdf), [apriltag.h](https://github.com/arpg/apriltags/blob/master/include/apriltags/apriltag.h) |

### PATTERN_QUIET_ZONE derivation

Evidence-based minimum: **1 × squareSize** (one cell/square width on each side).

Current formula: `max(squareSize, 10 mm)`.

The 10 mm floor is a **print-safety margin**, not a detector requirement. A 3 mm cell would
need only 3 mm of quiet zone for detection, but 10 mm provides tolerance for printer bleed,
finger handling, and tape edges. The formula is conservative and supported by the evidence.

## 1d. Printer hardware margins

| Printer | Type | Margins (mm) | Source |
|---------|------|-------------|--------|
| Epson EcoTank ET-2800 | Inkjet | 3 mm all sides | [Epson specs](https://files.support.epson.com/docid/cpd6/cpd60271/source/specifications/references/et2800_l3260/spex_printable_area_spc_et2800_l3260.html) |
| Brother HL-L2350DW | Laser | 4.23 mm (up to 6.35 mm in some orientations) | [Brother specs](https://support.brother.com/g/b/spec.aspx?c=us&lang=en&prod=hll2350dw_us_eu_as) |

**PAGE_MARGIN = 8 mm** covers both with margin to spare (worst case 6.35 mm leaves 1.65 mm clearance).

## 2. Derived constants (ISO 3098)

| Constant | Value | Derivation |
|----------|-------|-----------|
| `CAP_HEIGHT_SVG` | 710 | Flat capitals I/L/T: y=0 to y=-710 in glyph paths |
| `WM_CAP_A4` | 3.5 mm | ISO 3098 lettering tier for A4/Letter/Tabloid |
| `WM_CAP_A3` | 5 mm | ISO 3098 lettering tier for A3+ |
| `A3_SHORT_SIDE` | 297 mm | Threshold: short side >= 297 selects A3+ tier |
| `BRAND_TEXT_SIZE_MM` | 2.5 mm | ISO 3098 smallest recommended tier |
| `BRAND_LINE_SPACING` | 3.25 mm | 2.5 mm x 1.3 |

### Wordmark width on A4

width = 3.5 x 7174.4 / 710 = **35.4 mm** (compact viewBox width / cap height SVG)

### Clear space on A4

clear_space = wmH x (710 / 770.4) = 3.80 x 0.9216 = **3.50 mm** (= cap height, per §04)

### Brand block height on A4

- Wordmark block: 3.80 + 3.50 = 7.30 mm
- Text block: 3 x 2.5 x 1.3 = 9.75 mm
- Brand block = max(7.30, 9.75) = **9.75 mm** (text block dominates)

Previous value: 9.63 mm. Change: +0.12 mm (+1.2 %).

## 3. Detection results

All tests run at 300 DPI via pdftoppm + OpenCV 4.9.0.

| Case | Detector | Detected | Expected | Outside pattern | In brand | In axes | Result |
|------|----------|----------|----------|----------------|----------|---------|--------|
| ChArUco 6x10 @ 20 mm, A4 landscape | findChessboardCornersSB | **45** | 45 | 0 | 0 | 0 | PASS |
| ChArUco 7x12 @ 25 mm, tiled sheet 1 | findChessboardCornersSB (brand region) | **0** | 0 | 0 | 0 | 0 | PASS |
| Checkerboard 5x7 @ 15 mm, A4 portrait | findChessboardCornersSB | **24** | 24 | 0 | 0 | 0 | PASS |

### Rendered PNGs

- `docs/audit/2026-10-28-brand-block/charuco-6x10-20-a4-landscape-1.png`
- `docs/audit/2026-10-28-brand-block/charuco-7x12-25-tiled-sheet1-1.png`
- `docs/audit/2026-10-28-brand-block/checkerboard-5x7-15-a4-portrait-1.png`

### Known obstacles

1. **ArUco dictionary data mismatch.** The site's bundled DICT_6X6_250 data does not match
   OpenCV's DICT_6X6_250. CharucoDetector finds zero markers on exported PDFs. This is a
   pre-existing data-quality issue, not caused by the brand block. findChessboardCornersSB
   detects all inner corners correctly, proving the checkerboard geometry and brand block
   separation are correct.

2. **Tiled page detection.** findChessboardCornersSB requires a white border around the
   entire grid. Tiled pages cut the pattern at tile edges without a border, so full-grid
   detection is not possible on a single tile. The brand-region scan (running
   findChessboardCornersSB on the bottom 25 % of the tile) confirms zero pattern-like
   structures in the brand block area.

## 4. Printer check sheet

Generated at `docs/audit/2026-10-28-brand-block/printer-check-sheet.pdf`.
Contains 100 mm scale bar, 10-square strip at 10 mm, wordmark at 3.5 mm cap height,
and blank boxes for measured margins and scale factor.
