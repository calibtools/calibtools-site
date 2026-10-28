# AprilTag verification, multi-format detection, and artifact regeneration — 2026-10-28

## 1. AprilTag comparison against OpenCV

### Hex codes
All hex codes in the 5 shipped JSON files match the official
[AprilRobotics/apriltag](https://github.com/AprilRobotics/apriltag) C source `uint64_t codedata[]`.
The codes themselves were never wrong.

### Bit layout bug
`decodeAprilBits()` decoded codes using row-major order (`grid[r][c] = bit(r*d+c)`).
AprilTag families use a non-row-major spiral layout defined by per-family `bit_x[]`/`bit_y[]`
arrays in the C source. Every rendered AprilTag marker was wrong.

### Fix
Extracted `bit_x`/`bit_y` arrays from OpenCV `generateImageMarker()` output for the three
families OpenCV supports. Added the arrays to the JSON files. Modified `decodeAprilBits()`
to accept and use the layout arrays. Updated all callers: `renderAprilGrid.ts`, `renderMarkerSheet.ts`.

### Verification against OpenCV 4.9.0

| Family | IDs | Before fix | After fix | Source |
|--------|-----|-----------|-----------|--------|
| 16h5 | 30 | 0/30 | **30/30** | OpenCV `DICT_APRILTAG_16H5` |
| 25h9 | 35 | 0/35 | **35/35** | OpenCV `DICT_APRILTAG_25H9` |
| 36h11 | 587 | 0/587 | **587/587** | OpenCV `DICT_APRILTAG_36H11` |
| **Total** | **652** | **0/652** | **652/652** | |

### 36h10
Not shipped. OpenCV has `DICT_APRILTAG_36H10` (2320 markers). Can be added.

### 41h12 and 52h13
**Removed from the generator UI and dictionary loader.** No OpenCV dictionary exists for
verification. The C source confirms they use `bit_x`/`bit_y` layouts with negative indices
(border cells: `width_at_border=5`, `total_width=9` for 41h12). Without verified layouts,
these families produce incorrect renderings. JSON files retained in `src/lib/dicts/` for
future use once layouts are derived and verified.

### Reference PNGs
Committed at `tests/fixtures/aruco/APRILTAG_{16h5,25h9,36h11}_id{0,1,last}.png`.
Vitest verifies `decodeAprilBits()` matches these PNGs without Python.

## 2. Per-format detection

| Case | Format | Detector | Markers | Corners | Brand | Axes | Result |
|------|--------|----------|---------|---------|-------|------|--------|
| ChArUco 6×10@20 DICT_6X6_250 | PDF 300 dpi | CharucoDetector | **30/30** | **45/45** | 0 | 0 | PASS |
| ChArUco 7×12@25 tiled sheet 1 | PDF 300 dpi | ArucoDetector (brand) | 0/0 | — | 0 | 0 | PASS |
| Checkerboard 5×7@15 | PDF 300 dpi | findChessboardCornersSB | — | **24/24** | 0 | 0 | PASS |
| CT-DS-CHA-C page 1 | PDF 300 dpi | ArucoDetector | **42** | — | — | — | PASS |
| CT-IR-000311 page 2 | PDF 300 dpi | ArucoDetector | **36** | — | — | — | PASS |
| ChArUco 6×10@20 DICT_6X6_250 | SVG → Playwright 300 dpi | CharucoDetector | **30/30** | **45/45** | 0 | 0 | PASS |
| ChArUco 6×10@20 DICT_6X6_250 | PNG → Playwright 300 dpi | CharucoDetector | **30/30** | **45/45** | 0 | 0 | PASS |

### SVG/PNG detection
Playwright 1.64 headless Chromium rasterises the SVG at 300 DPI (viewport sized so 1 mm = 300/25.4 px).
Both SVG and PNG paths produce identical detection results to the PDF path: 30/30 markers, 45/45 corners.

### CT-IR-000311 marker detection (36/42)
CT-IR-000311 page 2 detects 36/42 markers at 300 DPI. Missing IDs [10,13,18,24,28,33] are
scattered throughout the board — not edge markers. Root cause: the inspection report feature map
uses `mode:'map'` (grey fills: squares #E6E6E6, markers #B3B3B3) at 56% scale (104 mm width for
a 185 mm board). The low contrast + small rendering size causes borderline detection failures.
At 600 DPI the count is identical (36) but different IDs fail, confirming the issue is contrast
not resolution. **Not a bug in ctpattern.ts** — the feature map is a visualization overlay, not
a detection target. CT-DS-CHA-C pages 1-2 use `mode:'print'` (black/white) and detect 42/42.

### CT-DS-CHA-C rejected candidates (51)
The 51 rejected candidates on CT-DS page 1 are the black chess squares and other quadrilateral
features (page borders, dimension lines) that pass contour detection but fail dictionary bit
lookup. This is normal OpenCV ArUco pipeline behavior.

## 3. Regenerated files

`pnpm docs:build` regenerated all customer documents with the corrected ArUco dictionary data:

| File | Type | Size change | Markers detected |
|------|------|-------------|-----------------|
| `public/files/datasheets/CT-DS-CHA-C.pdf` | ChArUco composite datasheet | 126 302 → 127 457 | 42 (IDs 0–41) |
| `public/files/datasheets/CT-DS-CHA-C-letter.pdf` | Letter variant | 126 428 → 127 568 | — |
| `public/files/datasheets/CT-DS-CHA-C-p-1.png` | Preview page 1 | 68 003 → 68 364 | — |
| `public/files/datasheets/CT-DS-CHA-C-p-2.png` | Preview page 2 | 92 243 → 92 593 | — |
| `public/files/reports/CT-IR-000311.pdf` | Inspection report | 136 791 → 137 350 | 36 |
| `public/files/reports/CT-IR-000311-letter.pdf` | Letter variant | 136 655 → 137 194 | — |
| `public/files/reports/CT-IR-000311-p-2.png` | Preview page 2 | 98 891 → 99 148 | — |
| `public/files/manifest.json` | Hash manifest | updated | — |

Files that did not change size: CT-DS-CHA-P, CT-DS-CHT-P, CT-DS-ACC-A-FIX-14, CT-SV-CERT-ILAC.
These documents do not contain ChArUco board illustrations.

## 4. Plumbline finding

`~/Documents/Calib.Tools/plumbline` exists but contains **no copy** of `src/lib/dicts`,
`gen-dicts.py`, or any ArUco/AprilTag dictionary files. No action needed.
