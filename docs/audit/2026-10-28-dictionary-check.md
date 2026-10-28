# ArUco dictionary verification and detection proof — 2026-10-28

## 1. Dictionary comparison against OpenCV

All dictionaries compared bit-for-bit against `cv2.aruco.generateImageMarker()` in OpenCV 4.9.0.

| Dictionary | Markers | Before fix | After fix |
|-----------|---------|-----------|-----------|
| DICT_4X4_50 | 50 | 0/50 matched | 50/50 matched |
| DICT_5X5_100 | 100 | 0/100 matched | 100/100 matched |
| DICT_6X6_250 | 250 | 0/250 matched | 250/250 matched |
| DICT_7X7_1000 | 1000 | 0/1000 matched | 1000/1000 matched |
| DICT_ARUCO_ORIGINAL | 1024 | 0/1024 matched | 1024/1024 matched |
| DICT_ARUCO_MIP_36h12 | 250 | 0/250 matched | 250/250 matched |
| **Total** | **2674** | **0/2674** | **2674/2674** |

Before the fix, every single marker in every dictionary was wrong.

### First mismatch example (DICT_6X6_250 marker 0)

**Before fix** (decoded from old JSON):
```
0 0 0 1 1 1
0 0 1 1 1 1
1 1 0 1 1 0
0 0 1 0 1 0
0 0 0 0 0 1
1 1 1 0 0 0
```

**OpenCV ground truth** (`generateImageMarker`):
```
0 0 0 1 1 1
1 0 0 0 1 1
1 1 0 1 1 1
0 1 1 0 0 0
0 0 1 0 1 0
1 0 0 1 1 0
```

## Root cause

The `gen-dicts.py` script serialized `d.bytesList[i].flatten().tobytes().hex()`, but
`bytesList[i]` has shape `(ceil(n²/8), 4)` — 4 columns storing 4 rotations of the marker.
`flatten()` interleaves the rotation bytes: `[rot0_byte0, rot1_byte0, rot2_byte0, rot3_byte0,
rot0_byte1, ...]`. The decoder (`decodeMarkerBits`) then read bytes from different rotations
for different rows, producing a garbled bit grid that matched no rotation of the real marker.

Additionally, `bytesList` uses LSB-first continuous bit packing (`bit_pos = i % 8`, packing all
`n²` bits linearly), whereas `decodeMarkerBits` expected row-major MSB-first packing with
per-row byte boundaries (`bytesPerRow = ceil(n/8)`).

**The fix**: regenerated all 6 dictionary JSON files from `cv2.aruco.generateImageMarker()` —
the canonical rendering function — packing the image-read bits in the row-major MSB-first
format that `decodeMarkerBits` expects. This eliminates any dependence on `bytesList` layout.
The decoder (`decodeMarkerBits`) was not changed; only the data was replaced.

## 2. Detection results

All tests run at 300 DPI via pdftoppm + OpenCV 4.9.0 CharucoDetector / findChessboardCornersSB.

| Case | Detector | Markers | Corners | Outside | Brand | Axes | Result |
|------|----------|---------|---------|---------|-------|------|--------|
| ChArUco 6×10 @ 20 mm, A4 landscape | CharucoDetector | **30/30** | **45/45** | 0 | 0 | 0 | PASS |
| ChArUco 7×12 @ 25 mm, tiled sheet 1 | ArucoDetector (brand region) | 0/0 | 0/0 | 0 | 0 | 0 | PASS |
| Checkerboard 5×7 @ 15 mm, A4 portrait | findChessboardCornersSB | — | **24/24** | 0 | 0 | 0 | PASS |

### ChArUco 6×10 detection details

- All 30 ArUco marker IDs detected: 0–29
- All 45 ChArUco inner corners detected with correct IDs
- Zero detections in brand block region (wordmark + text at page bottom)
- Zero detections in axes region (top-left arrows and labels)

## 3. Were exports made before this fix detectable?

**No.** Every ArUco marker rendered by the old dictionary data was rejected by OpenCV's
`ArucoDetector` and `CharucoDetector`. The previous `check-detection.mjs` used
`findChessboardCornersSB` as a fallback, which detects only the chess pattern inner corners
(not the ArUco markers). Users who printed ChArUco boards from the site and ran
`CharucoDetector` would have detected zero markers and zero ChArUco corners.

Checkerboard exports (no ArUco markers) were always detectable.
The pattern geometry (square/marker sizes, positions, corner coordinates) was correct
throughout — only the marker data bits were wrong.

## 4. Verification test

A vitest (`src/lib/dicts/dicts.test.ts`) compares `decodeMarkerBits` output against
OpenCV-generated reference PNGs committed at `tests/fixtures/aruco/`. The test runs
without Python by reading the PNGs with sharp and extracting the inner grid pixels.

Markers verified per dictionary: ids 0, 1, and the last id (3 per dict × 6 dicts = 18 total,
covering both dictionary bounds and typical usage).
