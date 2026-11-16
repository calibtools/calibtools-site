---
title: "Thermal camera geometric calibration"
description: "Calibrate an LWIR thermal camera in OpenCV: emissivity contrast, 14-bit conversion, soft edges, and the detector settings that keep the focal length honest."
date: 2026-11-16
updated: 2026-11-16
readingTime: "13 min"
keyRule: "Stretch the radiometric frame before detection, refine the corners with cornerSubPix on the unstretched image, and judge the target by its contrast in gray levels: in our test, contrast cost more accuracy than blur ever did."
related: ["opencv-camera-calibration", "corner-detection-troubleshooting", "calibration-target-size", "reprojection-error"]
products: ["thermal-calibration-target", "circlegrid-composite", "checkerboard-composite"]
sampleFiles: []
faq:
  - q: "Can I calibrate a thermal camera with a printed checkerboard?"
    a: "Not at room temperature. Ink and paper have almost the same emissivity, so the board radiates evenly and the pattern is invisible in the 8 to 14 µm band. The pattern needs an emissivity or temperature difference: a heated plate with low- and high-emissivity areas, or a board in front of a warm or cold background."
  - q: "Checkerboard or circle grid for a thermal camera?"
    a: "Both worked in our synthetic test. A checkerboard found with findChessboardCornersSB and refined with cornerSubPix gave a focal length within 0.02 %; a circle grid with 20 mm dots gave 0.03 % and the lowest reprojection error. Larger dots (30 mm on a 40 mm pitch) cost 0.5 % through the perspective bias of ellipse centers."
  - q: "Why does findChessboardCornersSB find nothing in my thermal image?"
    a: "Usually contrast. In our test the detector stopped at a pattern contrast of about 15 gray levels on an 8-bit image, and a frame converted from 14 bits by dropping the low bits had 5. A percentile stretch of the 16-bit frame before detection brought every image back, down to 3 gray levels of original contrast."
  - q: "Does the softness of thermal edges bias the calibration?"
    a: "Symmetric blur did not. Heat spreading in the plate up to a 6 mm sigma and lens blur up to 2.5 px left the corner error under 0.16 px and the focal length within 0.1 %. What biased the focal length by 0.7 % was the detector's own sub-pixel step; cornerSubPix on the original image removed it."
  - q: "How do I get the extrinsics between a thermal and a visible camera?"
    a: "Use a board both cameras see, calibrate each camera on its own, then run stereoCalibrate with CALIB_FIX_INTRINSIC on the paired detections. In our test with 20 pairs at about 1 m, the 60 mm translation came back within about 1 mm and the rotation within 0.06°."
---

A thermal camera does not see ink. It sees how much each surface radiates in the 8 to 14 µm band, and black ink on white paper radiates almost exactly like the paper around it. The checkerboard that calibrates every other camera in the building looks like a blank gray rectangle.

Once the pattern is visible, the rest is familiar but shifted: fewer pixels, softer edges, a 14-bit frame that has to become 8 bits, and a contrast that drifts while you capture. This guide walks through an OpenCV 4.x calibration for an LWIR camera with the numbers we measured on synthetic images.

## The test

We rendered a target through a 640 × 512 LWIR camera with 17 µm pixels and a 13 mm lens (about 45° horizontal field of view, focal length 765 px, moderate barrel distortion). The board has 10 × 7 squares of 40 mm, so 9 × 6 inner corners, and the circle grid has 9 × 6 dots on a 40 mm pitch.

Views were taken 0.9 to 1.5 m away, tilted up to 40°, which puts 20 to 34 px on a square. Every pixel was rendered through the distortion model, then blurred twice: in board space for heat spreading in the plate (1 mm sigma unless stated) and in image space for the lens (1.5 px).

The pattern contrast is 60 gray levels on a 110 level background with 1.5 levels of noise unless stated. Detection numbers are over 30 views; calibration numbers are the median of 8 runs of 20 views each.

## 1. Make the pattern radiate

A surface's thermal signal depends on its temperature and emissivity; neighboring areas look different when either differs. A heated plate uses both: it is warmer than the room, and it pairs a high-emissivity surface (reads warm) with a low-emissivity one (reflects the cooler room, reads cool).

The do-it-yourself versions work for a few minutes. A board warmed with a hair dryer, foil and paint in front of a radiator, a printed board in the sun: all give contrast that fades or drifts between frames, and the low-emissivity squares mirror whatever warm object stands in front of them.

What matters for the calibration is the contrast in gray levels after conversion, not the temperature difference as such. Measure it on a converted frame as the 95th minus the 5th percentile of the pattern area. Below about 15 levels the detectors needed help in our test; below 8 the accuracy went.

Before you capture, let the camera run for its warm-up time, trigger a flat-field (shutter) correction, and keep the board still while the core takes the next one: frames taken during the correction are unusable, and a frame right before it carries the accumulated non-uniformity.

## 2. Convert the radiometric frame

Most thermal cores deliver 14- or 16-bit frames. The pattern occupies a few hundred counts of that range, and the obvious conversion, keeping the top 8 bits, throws most of it away:

| Conversion of the 14-bit frame | Pattern contrast after conversion | Boards found (of 30) | Corner error |
|---|---|---|---|
| Keep the top 8 bits (`>> 6`) | 5 gray levels | 0 | — |
| Top 8 bits, then 1–99 % percentile stretch | 255 | 30 | 0.09 px |
| 1–99 % percentile stretch of the 16-bit frame | 255 | 30 | 0.06 px |

The simulated frame had 300 counts of pattern contrast on a 7600 count background with 8 counts of noise, which is a comfortable signal. The checkerboard detector with its `CALIB_CB_NORMALIZE_IMAGE` flag (a histogram equalization) still found nothing at 5 gray levels.

Stretch before you detect, and stretch from the original bit depth, which keeps the sub-pixel information the 8-bit rounding would have discarded:

```python
import cv2
import numpy as np

frame = cv2.imread("frame16.png", cv2.IMREAD_UNCHANGED)   # uint16 radiometric frame
assert frame.dtype == np.uint16

def stretch(img, lo=1, hi=99):
    """Map the lo..hi percentile range to 0..255."""
    a, b = np.percentile(img, [lo, hi])
    return np.clip((img.astype(np.float32) - a) * 255.0 / max(b - a, 1), 0, 255).astype(np.uint8)

img8 = stretch(frame)
cv2.imwrite("frame8.png", img8)
```

If the camera's own AGC already gives you an 8-bit stream, switch it to a fixed (linear) mode or lock it for the capture: an AGC that re-stretches every frame changes the gray levels around every edge from frame to frame.

## 3. Choose the pattern

Three detectors, three behaviors. The table is for a stretched 8-bit image at full contrast as the lens blur grows:

| Lens blur sigma | Checkerboard, classic | Checkerboard, SB | Circle grid |
|---|---|---|---|
| 0.7 px | 30 found, 0.06 px | 30, 0.09 px | 30, 0.29 px |
| 1.5 px | 30, 0.10 px | 30, 0.08 px | 30, 0.23 px |
| 2.5 px | 30, 0.24 px | 30, 0.10 px | 30, 0.22 px |
| 4 px | 28, 1.54 px | 29, 0.14 px | 27, 0.23 px |

"Classic" is `findChessboardCorners` plus `cornerSubPix`; "SB" is `findChessboardCornersSB`. The corner error is the median over views of the mean distance from the true projection.

The classic detector's accuracy falls apart with blur; SB keeps 0.1 px at a blur of 2.5 px, which is a soft thermal lens. The circle grid sits at 0.22 px regardless of blur: the perspective bias of ellipse centers at tilt, not detection error, and the calibration absorbs most of it (section 5).

Heat spreading in the plate behaves the same way. With a Gaussian sigma of 0, 1, 2, 4 and 6 mm in board space the SB corner error was 0.10, 0.10, 0.10, 0.13 and 0.16 px, and every board was found. Soft edges are not the thermal problem; symmetric softness leaves the corner where it was.

Contrast is the thermal problem. On an unstretched image with 1.5 levels of noise:

| Pattern contrast | Classic | SB | Circle grid (default blobs) |
|---|---|---|---|
| 60 levels | 30 found | 30 | 30 |
| 30 | 30 | 28 | 30 |
| 15 | 30 | 0 | 0 |
| 8 | 21 | 0 | 0 |
| 5 | 3 | 0 | 0 |

After the percentile stretch, SB found all 30 boards at every contrast down to 3 levels (corner error 0.11 to 0.44 px), and the circle grid found 30, 30, 30, 29 and 29 with the blob settings of the next section. The stretch adds no information; it puts the pattern where the thresholds expect it.

Polarity matters for two of the three. `findChessboardCorners` needs a light border around the board and found nothing on an inverted image; SB found every board either way; `findCirclesGrid` looks for dark blobs by default, so warm dots need the image negated (`255 - img`) or `blobColor = 255`.

## 4. Detect

Checkerboard: find on the stretched image, refine on the original. The refinement step is not optional, see the next section.

```python
import cv2
import numpy as np

PATTERN = (9, 6)                       # inner corners (columns, rows)
img = cv2.imread("frame8.png", cv2.IMREAD_GRAYSCALE)

def stretch(img, lo=1, hi=99):
    a, b = np.percentile(img, [lo, hi])
    return np.clip((img.astype(np.float32) - a) * 255.0 / max(b - a, 1), 0, 255).astype(np.uint8)

ok, corners = cv2.findChessboardCornersSB(stretch(img), PATTERN, cv2.CALIB_CB_NORMALIZE_IMAGE)
if ok:
    corners = cv2.cornerSubPix(img, corners, (9, 9), (-1, -1),
                               (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 0.01))
roi = img[int(corners[:, 0, 1].min()):int(corners[:, 0, 1].max()),
          int(corners[:, 0, 0].min()):int(corners[:, 0, 0].max())] if ok else img
print(f"found {ok}  pattern contrast {np.percentile(roi, 95) - np.percentile(roi, 5):.0f} gray levels")
```

The 9 × 9 `cornerSubPix` window matches a 1.5 to 3 px blur; a 5 × 5 window on a 3 px blur gave 0.49 px RMS instead of 0.14. On a sharper image, 5 × 5 is fine.

Circle grid: the default blob detector steps its threshold in 10 gray levels and needs a blob to survive two steps, which a low-contrast dot does not. Smooth, stretch and use coarser steps:

```python
import cv2
import numpy as np

PATTERN = (9, 6)
img = cv2.imread("frame8_circles.png", cv2.IMREAD_GRAYSCALE)

def stretch(img, lo=1, hi=99):
    a, b = np.percentile(img, [lo, hi])
    return np.clip((img.astype(np.float32) - a) * 255.0 / max(b - a, 1), 0, 255).astype(np.uint8)

p = cv2.SimpleBlobDetector_Params()
p.filterByArea = True; p.minArea = 20; p.maxArea = 20000
p.filterByCircularity = False; p.filterByConvexity = False; p.filterByInertia = False
p.minThreshold = 20; p.maxThreshold = 240; p.thresholdStep = 20
p.blobColor = 0                        # 255 if the dots are the warm side
detector = cv2.SimpleBlobDetector_create(p)

prepared = cv2.GaussianBlur(stretch(img), (0, 0), 1.0)
ok, centers = cv2.findCirclesGrid(prepared, PATTERN, flags=cv2.CALIB_CB_SYMMETRIC_GRID,
                                  blobDetector=detector)
print("found", ok)
```

With these settings the grid was found at 5 gray levels of contrast in 29 of 30 views. Circle centers need no `cornerSubPix`; the blob centroid is the estimate.

## 5. Calibrate

`calibrateCamera` runs exactly as for a visible camera; the [OpenCV calibration guide](/guides/opencv-camera-calibration/) has the full pipeline. What changes is which numbers you can trust:

| Pattern and detector | Conditions | RMS | Focal length error |
|---|---|---|---|
| Checkerboard, SB only | blur 1.5 px, contrast 60 | 0.086 px | +0.72 % |
| Checkerboard, SB + cornerSubPix | blur 1.5 px, contrast 60 | 0.064 px | −0.02 % |
| Circle grid, 20 mm dots | blur 1.5 px, contrast 60 | 0.030 px | +0.03 % |
| Checkerboard, SB + cornerSubPix | blur 3 px | 0.135 px | −0.10 % |
| Circle grid, 20 mm dots | blur 3 px | 0.156 px | −0.43 % |
| Checkerboard, SB + cornerSubPix | contrast 15 | 0.335 px | −0.22 % |
| Circle grid, 20 mm dots | contrast 15 | 0.489 px | +0.14 % |
| Checkerboard, SB + cornerSubPix | contrast 8 | 0.892 px | −0.45 % |
| Circle grid, 20 mm dots | contrast 8 | 0.520 px | −0.21 % |
| Circle grid, 30 mm dots | blur 1.5 px, contrast 60 | 0.419 px | −0.48 % |

Three things to take from it.

The SB detector's own sub-pixel result carried a +0.7 % focal length bias in this setup with an RMS that looked fine. The corners were off by less than 0.1 px each, but in a way that correlated with the view. A `cornerSubPix` pass on the original image brought the focal length back to within 0.02 %.

Contrast costs more than blur. Doubling the lens blur to 3 px moved the checkerboard focal length 0.1 %; a contrast of 15 levels (signal-to-noise ratio 10) cost 0.2 % and five times the RMS; 8 levels cost 0.45 % at an RMS near 0.9 px. A target that holds its contrast buys more than a sharper lens.

Dot size matters for a circle grid. The ellipse-center bias grows with the square of the dot radius: 20 mm dots on a 40 mm pitch were absorbed to 0.03 %, 30 mm dots cost 0.48 % and 0.42 px. Keep dots at half the pitch or less, or use a checkerboard when a low-resolution core needs large features.

```python
import cv2
import numpy as np

# obj_points: list of (54, 3) float32 board corners in mm, one per view
# img_points: list of (54, 1, 2) float32 detections from section 4
# image_size: (width, height) of the thermal frame, e.g. (640, 512)
rms, K, dist, rvecs, tvecs = cv2.calibrateCamera(obj_points, img_points, image_size, None, None)
print(f"RMS {rms:.3f} px  fx {K[0, 0]:.1f}  fy {K[1, 1]:.1f}  cx {K[0, 2]:.1f}  cy {K[1, 2]:.1f}")
print("k1 k2 p1 p2 k3:", np.round(dist.ravel(), 4))
```

With 20 views, the principal point came back within 0.1 px at full contrast and within about 1 px at 15 levels; at 8 levels it wandered by several pixels. If your principal point moves by more than a pixel between two calibration sets, look at the contrast before anything else.

## 6. Thermal–visible extrinsics

For fusion you need the rigid transform between the thermal camera and a visible one. Use a board both cameras see at once (a heated pattern whose warm and cool areas are also light and dark in the visible), calibrate each camera on its own, then solve for the transform with the intrinsics fixed.

```python
import cv2
import numpy as np

# obj_points: list of (54, 3) float32 board corners, one per paired view
# pts_thermal, pts_visible: lists of (54, 1, 2) float32 detections of the same views
# K_t, d_t and K_v, d_v: intrinsics from calibrateCamera on each camera alone
rms, _, _, _, _, R, T, E, F = cv2.stereoCalibrate(
    obj_points, pts_thermal, pts_visible, K_t, d_t, K_v, d_v, size_thermal,
    flags=cv2.CALIB_FIX_INTRINSIC,
    criteria=(cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 100, 1e-6))

angle = np.degrees(np.linalg.norm(cv2.Rodrigues(R)[0]))
print(f"RMS {rms:.3f} px  baseline {np.linalg.norm(T):.1f} mm  rotation {angle:.2f} deg")
# x_visible = R @ x_thermal + T
```

We ran this with the thermal camera above and a 1600 × 1200 visible camera (8 mm lens, 4.5 µm pixels) 60 mm to its right, yawed 2° inward, 20 pairs at about 1 m. The baseline length came back within 0.02 mm, the translation within about 1 mm (0.1 to 1.9 mm over six runs), the rotation within 0.06°.

Both detections must list the corners in the same order. In our test SB ordered the 9 × 6 board from the same corner in both images because the warm squares were also the light squares; check one pair by drawing the first corner in each image before you trust 20.

The thermal frame and the visible frame have to be taken at the same instant. If the cameras are not hardware-triggered, mount the board and move nothing between the two exposures.

## Checks

Before you accept the calibration:

- Pattern contrast on the converted frames: 30 gray levels or more. Print the 5th and 95th percentile inside the board for every frame; a frame that drifted during a flat-field correction will show up here.

- RMS: under 0.15 px for a checkerboard or circle grid at this resolution. Anything above 0.3 px means low contrast or a board that moved; our 0.9 px frames were all contrast.

- Focal length against the lens: a 13 mm lens on 17 µm pixels is 765 px. A result more than 1 % away usually means an unrefined detection or an aspect-ratio problem, not a lens that is off.

- fy/fx: 1.000 for a square-pixel microbolometer. Our runs returned it to within 0.001.

- Principal point: within a few pixels of the image center for most lenses; a jump between two sets is a contrast warning.

- Coverage: tilt the board to 30–40° and put it in the corners of the frame. The 640 × 512 frame needs the same coverage a visible one does, and the corners are where the distortion model is decided.

## Common problems

| What you see | Likely cause | Fix |
|---|---|---|
| Board invisible or nearly uniform in the image | Printed target at room temperature | Use a heated target with emissivity contrast, or a board against a warm or cold background |
| Pattern visible to the eye, detector finds nothing | Contrast under about 15 gray levels after conversion | Percentile-stretch the 16-bit frame before detection |
| Classic detector fails, SB works | Image polarity inverted (dark border) | Use SB, or negate the image |
| Circle grid never found | Blob detector looking for dark dots on a warm-dot board; threshold steps too fine | `blobColor = 255` or negate; `thresholdStep = 20` with a 1 px smoothing |
| Focal length 0.5–1 % off, RMS fine | SB sub-pixel used as is | `cornerSubPix` with a 9 × 9 window on the original image |
| RMS 0.5–1 px on every frame | Low contrast, AGC re-stretching, or heat drift | Lock the AGC, let the target settle, raise the plate temperature |
| Some frames much worse than the rest | Flat-field correction during capture, or a warm object reflected in low-emissivity squares | Drop those frames, keep people and lamps out of the reflection path |
| Principal point jumps between sets | Contrast fell between sessions | Compare the percentile contrast of the two sets |
| Extrinsics wrong by a board width | Corner order differs between thermal and visible detections | Check the first corner in one pair, flip one list if needed |

## Next steps

- [Camera calibration with OpenCV](/guides/opencv-camera-calibration/) — the full pipeline that sections 4 and 5 plug into.

- [Why your calibration board is not detected](/guides/corner-detection-troubleshooting/) — the resolution, blur and tilt limits for the same detectors on a visible camera.

- [How big should your target be?](/guides/calibration-target-size/) — size the board for a 640 × 512 or 320 × 256 core; plan for 20 px per square or more.

- [What reprojection error tells you](/guides/reprojection-error/) — why a 0.09 px RMS with a 0.7 % focal length error is possible.

- Our [heated thermal target](/targets/thermal-calibration-target/) is built to your pattern and size; tell us the core, lens and working distance and we lay out the squares or dots for it.

## Method

Images were rendered per pixel through the true camera model (five-parameter Brown distortion), supersampled 2 × 2, blurred in board and image space, quantized and given Gaussian noise. Detection and calibration used OpenCV 4.14, default distortion model. Write to hello@calib.tools for the scripts.
