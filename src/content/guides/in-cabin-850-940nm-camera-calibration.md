---
title: "In-cabin NIR camera calibration (850/940 nm)"
description: "Calibrate a driver or occupant monitoring camera under its own 850 or 940 nm light: fisheye model, board contrast in the NIR, illuminator glare, coverage."
date: 2026-11-23
updated: 2026-11-23
readingTime: "13 min"
keyRule: "Calibrate the camera as it will run: its own illuminator on, the band-pass filter in place, the cabin light off, and a board that is still dark at your wavelength. In our test a pattern that kept 0.87 contrast in the NIR gave the focal length within 0.03 %; the same board faded to 0.13 contrast lost two thirds of its corners and the edge error grew tenfold."
related: ["opencv-camera-calibration", "corner-detection-troubleshooting", "calibration-target-size", "charuco-vs-checkerboard-vs-aprilgrid", "tof-depth-camera-calibration", "thermal-camera-geometric-calibration", "reprojection-error"]
products: ["nir-calibration-target", "charuco-composite", "mounting-fixture"]
sampleFiles: []
faq:
  - q: "Why does my checkerboard look gray under the 940 nm illuminator?"
    a: "Many black inks are dyes that absorb visible light and pass the near infrared: the light goes through the ink, reflects off the white board and comes back, so the squares turn gray. Measure the contrast in your camera's image; below 0.2 the detector drops corners, below 0.1 it loses the board."
  - q: "Can I use cv2.calibrateCamera for a 120° in-cabin camera?"
    a: "Not with the standard model. On our 120° camera the five-parameter fit returned a focal length 19 % too long and sat 40 to 90 px off the true projection, while the reprojection error of 3.6 px hid most of it. cv2.fisheye.calibrate fit the same views to 0.12 px with the focal length within 0.1 %."
  - q: "How close should the board be to a DMS camera?"
    a: "Close enough for the markers. With a 600 px focal length and 18 mm markers, detection fell from 58 corners at 0.5 m to 8 at 0.7 m and none at 0.8 m, which is 2 px per marker bit. Keep the board under 0.6 m with that lens, or use 40 mm markers for the seat positions further back."
  - q: "What about the bright spot from the LEDs in the middle of the board?"
    a: "That is the specular reflection of your own illuminator, biggest in square-on views. In our test a glossy board square to the camera killed 10 of 12 checkerboard detections; the ChArUco board kept all 12 views with two thirds of the corners. Tilting the board 15° or more moved the spot off the pattern."
  - q: "Should I calibrate in daylight or in the dark?"
    a: "In the dark, with the camera's own illuminator. Daylight at 850 nm adds a second, uneven light source that the band-pass filter does not remove, and it is not the light the camera sees at night. If the camera also runs by day, repeat the check views in daylight; the intrinsics do not change, the contrast does."
---

A driver or occupant monitoring camera sits a few hundred millimeters from a face, looks through a wide lens and carries its own 850 or 940 nm illuminator next to the lens. Often it sees nothing else: a band-pass filter removes the visible light.

None of this changes the geometry of calibration, but each point changes what the calibration images look like.

This guide calibrates such a camera in OpenCV 4.x under its operating illumination: the lens model a 120° camera needs, whether your board is still dark at your wavelength, how close it has to be, what the illuminator's glare does to the pattern, and a check on views you did not fit.

Every number comes from a synthetic 1280 × 960 in-cabin camera we rendered pixel by pixel; the method section at the end says how.

## What is different about an in-cabin camera

| Property | Typical value | What it means for calibration |
|---|---|---|
| Field of view | 100 to 160° diagonal | The standard distortion model fails; use the fisheye model |
| Working distance | 0.3 to 1.2 m | A 300 × 200 mm board fills a tenth of the image; many views are needed |
| Illumination | 850 or 940 nm LEDs next to the lens | Falls off toward the edges; specular glare on square-on views |
| Filter | Band-pass around the LED wavelength | Room light does not help; the board must be dark at the LED wavelength |
| Shutter | Global, pulsed with the LEDs | Capture is clean, but exposure is one setting for near and far |

The wavelength matters for the board more than for the camera. A printed pattern gets its black from an ink, and many black inks are transparent beyond 800 nm. Under the illuminator such a board looks pale gray, and the detector works with whatever contrast is left.

## The test

A 1280 × 960 global-shutter sensor behind a fisheye lens with a 600 px focal length: 120° horizontal and 148° diagonal field of view, with an equidistant projection plus distortion terms and a small extra term the four-parameter OpenCV model does not have, as real lenses have.

The board is 300 × 200 mm: 11 × 7 squares of 25 mm with 18 mm 4 × 4 markers. The illuminator sits at the lens, with a cos³ falloff off axis and 1/d² with distance.

Rendering was pixel by pixel through the true model, supersampled 3 × 3, with a 0.9 px lens blur, shot and read noise, and a dark cabin around the board.

Thirty calibration views cover the image at 0.25 to 0.55 m, tilted 5 to 35°; fifteen more are held out for the check in step 7.

## 1. Capture under the operating illumination

Switch the illuminator on and the cabin light off, and leave the band-pass filter in place. The images should look like the night-time images the camera will produce. Room light at 850 nm adds a second light source from another direction and hides what the LEDs alone do to the board.

Take raw frames. Switch off any tone mapping, HDR merging, local contrast enhancement or defogging in the ISP: these move edges by fractions of a pixel in ways that depend on the content, and the corner detector cannot undo them. A flat gain and offset table is fine.

Keep one exposure for the whole session and set it on the nearest view you will take. Table 5 shows what happens when near views saturate.

Focus is set at the LED wavelength, not in room light. A lens focused under white light is slightly out of focus at 940 nm, and the shift is not the same across the field. If the camera is sealed and focused at the factory, this is already done; if you focus it yourself, do it under the illuminator.

## 2. Check that the board is dark at your wavelength

Detect the board once and read the contrast off the image around the corners it found. The function takes the four squares at each corner, two dark and two bright, and reports the Michelson contrast of their medians.

```python
import cv2, numpy as np, glob

# 11 x 7 squares of 25 mm, 18 mm markers, DICT_4X4_50
dictionary = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)
board = cv2.aruco.CharucoBoard((11, 7), 25.0, 18.0, dictionary)
detector = cv2.aruco.CharucoDetector(board)

def board_contrast(img, corners, ids):
    """Michelson contrast of the pattern from the squares around each detected corner."""
    h, w = img.shape
    dark, bright = [], []
    for (u, v), cid in zip(corners.reshape(-1, 2), ids.ravel()):
        # a corner's four squares: sample 6 px diagonally into each quadrant
        step = 6
        q = [img[int(v - step), int(u - step)], img[int(v - step), int(u + step)],
             img[int(v + step), int(u - step)], img[int(v + step), int(u + step)]]
        q = sorted(int(x) for x in q)
        dark += q[:2]; bright += q[2:]
    d, b = np.median(dark), np.median(bright)
    return (b - d) / (b + d), d, b

for path in sorted(glob.glob("captures/*.png"))[:5]:
    img = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
    corners, ids, _, _ = detector.detectBoard(img)
    if ids is None:
        print(path, "no board"); continue
    c, d, b = board_contrast(img, corners, ids)
    print(f"{path}: {len(ids)} corners, dark {d:.0f}, bright {b:.0f}, contrast {c:.2f}")
```

We rendered the same 30 views with the dark squares at six reflectances, from a pigment that stays black in the NIR to a dye that has almost disappeared. The white stayed at 0.85.

| Dark reflectance | Contrast | Views found | Corners of 1800 | Corner error | Focal length error | Model error at 60° |
|---|---|---|---|---|---|---|
| 0.06 | 0.87 | 30 | 1537 | 0.13 px | −0.03 % | 0.26 px |
| 0.25 | 0.55 | 30 | 1438 | 0.17 px | −0.02 % | 0.39 px |
| 0.40 | 0.36 | 30 | 1270 | 0.22 px | −0.08 % | 0.56 px |
| 0.55 | 0.21 | 28 | 993 | 0.33 px | −0.04 % | 0.42 px |
| 0.65 | 0.13 | 21 | 522 | 0.45 px | −0.10 % | 3.3 px |
| 0.72 | 0.08 | 9 | 113 | 0.65 px | −0.29 % | 18.6 px |

Contrast above 0.5 costs nothing. Between 0.5 and 0.2 the detector keeps the board but loses corners, first in the dim edge views, and the corner error more than doubles.

Below 0.2 the markers go, and with them the views at the edge of the image, which is where the lens model needs them most: the error at 60° off axis went from 0.4 to 3.3 to 18.6 px.

A contrast reading under 0.3 in your own images means a different board, not a different detector setting. Measure it under the illuminator at the distance you will calibrate at, because the ink that fades at 940 nm may still be fine at 850 nm.

## 3. Keep the board close enough

The 4 × 4 marker has six cells across with its border, and the detector needs about 3 px per cell. With a 600 px focal length an 18 mm marker gives that at 0.5 m and not much further.

| Board distance | Board width | Marker width | Pixels per bit | Markers found of 38 | Corners of 60 |
|---|---|---|---|---|---|
| 0.3 m | 443 px | 32 px | 5.3 | 31 | 42 (white saturated at this exposure) |
| 0.4 m | 339 px | 24 px | 4.1 | 38 | 60 |
| 0.5 m | 278 px | 20 px | 3.3 | 37 | 58 |
| 0.6 m | 235 px | 17 px | 2.8 | 32 | 42 |
| 0.7 m | 199 px | 14 px | 2.4 | 16 | 8 |
| 0.8 m | 177 px | 13 px | 2.1 | 1 | 0 |
| 0.9 m | 154 px | 11 px | 1.8 | 0 | 0 |

For a DMS camera the face is at 0.5 to 0.8 m, which is the far end of this range. Calibrate closer than the face: intrinsics do not depend on where the board was, and a board at 0.3 to 0.5 m gives every corner.

If the camera also covers the rear seats, a second board with 40 mm markers keeps 3 px per bit to about 1.3 m with the same lens.

The [FOV calculator](/tools/fov/) gives the board width in pixels for your lens and distance; divide by the number of squares and multiply by the marker fraction to get the marker width.

## 4. Fit the fisheye model

Use `cv2.fisheye.calibrate`. It fits the equidistant projection with four distortion terms, which is what a lens past 100° needs; the standard `cv2.calibrateCamera` model is a pinhole with a polynomial correction and cannot represent a 60° ray in a sensible way.

```python
import cv2, numpy as np, glob

dictionary = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)
board = cv2.aruco.CharucoBoard((11, 7), 25.0, 18.0, dictionary)
detector = cv2.aruco.CharucoDetector(board)
all_corners = board.getChessboardCorners()          # (60, 3) in mm

obj_pts, img_pts, size = [], [], None
for path in sorted(glob.glob("captures/*.png")):
    img = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
    size = img.shape[::-1]
    corners, ids, _, _ = detector.detectBoard(img)
    if ids is None or len(ids) < 12:
        continue
    obj_pts.append(all_corners[ids.ravel()].reshape(1, -1, 3).astype(np.float64))
    img_pts.append(corners.reshape(1, -1, 2).astype(np.float64))

K = np.eye(3); D = np.zeros((4, 1))
flags = cv2.fisheye.CALIB_RECOMPUTE_EXTRINSIC | cv2.fisheye.CALIB_FIX_SKEW
crit = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 200, 1e-9)
rms, K, D, rvecs, tvecs = cv2.fisheye.calibrate(obj_pts, img_pts, size, K, D, flags=flags, criteria=crit)
print(f"{len(obj_pts)} views, RMS {rms:.3f} px")
print("fx fy", K[0, 0].round(1), K[1, 1].round(1), " cx cy", K[0, 2].round(1), K[1, 2].round(1))
print("k1..k4", D.ravel().round(5))

# the same views through the standard model, for comparison
o5 = [o.reshape(-1, 1, 3).astype(np.float32) for o in obj_pts]
i5 = [i.reshape(-1, 1, 2).astype(np.float32) for i in img_pts]
rms5, K5, D5, _, _ = cv2.calibrateCamera(o5, i5, size, None, None)
print(f"standard model: RMS {rms5:.3f} px, fx {K5[0, 0]:.1f}")
np.savez("intrinsics.npz", K=K, D=D)
```

The fisheye call wants each view's points as a 1 × N × 3 and 1 × N × 2 array in float64, and it accepts partial boards; a view with fewer than 12 corners is skipped because a handful of near-collinear points gives the solver nothing to hold on to. Our 30 views and 1543 corners gave:

| Model | RMS on the fit | Focal length (true 600) | Error at 20° | Error at 40° | Error at 60° | Held-out RMS / max |
|---|---|---|---|---|---|---|
| Standard, 5 terms | 3.61 px | 715 px | 43 px | 75 px | 11 px | 1.22 / 5.3 px |
| Rational, 8 terms | 4.64 px | 711 px | 42 px | 75 px | 216 px | 1.18 / 5.2 px |
| Fisheye, 4 terms | 0.118 px | 599.8 px | 0.11 px | 0.15 px | 0.22 px | 0.128 / 1.03 px |

The error columns are the distance between where each model puts a ray and where the true camera puts it. The standard model's focal length is 19 % too long and its projection is 40 to 90 px off across most of the image; the oscillating error at 60° is its polynomial turning over.

Note what the residuals say about this: 3.6 px is high but not absurd, and the held-out boards fit to 1.2 px. The board is small in the image, so a wrong focal length is absorbed by a wrong distance, view by view.

With a wide lens and a small board, reprojection error is a weak test of the model; the held-out check in step 7 and a tape-measured distance are better.

## 5. Cover the image, especially the corners

With the board filling a tenth of the image, coverage is a matter of counting. The script bins the corners of all views into an 8 × 6 grid and reports the farthest corner from the optical axis through the fitted model.

```python
import cv2, numpy as np, glob

dictionary = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)
board = cv2.aruco.CharucoBoard((11, 7), 25.0, 18.0, dictionary)
detector = cv2.aruco.CharucoDetector(board)

nx, ny = 8, 6                                   # grid of cells over the image
counts = np.zeros((ny, nx), int)
max_angle = 0.0
K, D = [np.load("intrinsics.npz")[k] for k in ("K", "D")]
for path in sorted(glob.glob("captures/*.png")):
    img = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
    h, w = img.shape
    corners, ids, _, _ = detector.detectBoard(img)
    if ids is None:
        continue
    pts = corners.reshape(-1, 2)
    for u, v in pts:
        counts[min(int(v * ny / h), ny - 1), min(int(u * nx / w), nx - 1)] += 1
    # off-axis angle of the farthest corner, through the fitted model
    rays = cv2.fisheye.undistortPoints(pts.reshape(-1, 1, 2), K, D).reshape(-1, 2)
    max_angle = max(max_angle, np.degrees(np.arctan(np.linalg.norm(rays, axis=1))).max())

print("corners per cell (image rows top to bottom):")
print(counts)
print(f"cells with corners: {(counts > 0).sum()} of {nx * ny}")
print(f"farthest corner from the axis: {max_angle:.1f} deg")
```

We fit two sets of 30 views: one spread over the image, one with the board center kept inside the middle 40 % of the width and height, as happens when the board is held where the driver's head will be.

| View set | Cells with corners | RMS on the fit | Error at 40° | Error at 60° | Error at 70° | Held-out RMS |
|---|---|---|---|---|---|---|
| Spread over the image | 47 of 48 | 0.118 px | 0.15 px | 0.22 px | 0.79 px | 0.128 px |
| Center 40 % only | 25 of 48 | 0.084 px | 0.40 px | 0.36 px | 1.07 px | 0.143 px |

The center-only set reports the lower RMS and is the worse calibration: its error is two to three times larger at 40 and 60°, where the model is extrapolating.

The difference is modest here because our lens departs only a little from the four-term model. A real lens may depart more, and the only way to know is to have corners there.

Aim for corners in every cell of the grid, with the farthest corner within 5° of the edge of the field you will use. On a 120° camera that means holding the board at the edge of the image, where it is dim and foreshortened. Take more views there than feel necessary; the dim ones fail first.

## 6. Glare from the illuminator

The LEDs sit next to the lens, so the board's specular reflection comes back along the line of sight: a bright spot wherever the board faces the camera squarely. A matte board spreads it; a glossy one saturates a patch of pattern a few squares wide.

We rendered 12 near square-on views (0 to 6° tilt) and 12 tilted views (15 to 30°) of a matte and a glossy board, as a ChArUco board and as a plain checkerboard of the same squares.

| Views | Board finish | ChArUco views found | ChArUco corners of 720 | Checkerboard views found |
|---|---|---|---|---|
| Square-on, 0 to 6° | Matte | 12 of 12 | 613 | 10 of 12 |
| Square-on, 0 to 6° | Glossy | 12 of 12 | 474 | 2 of 12 |
| Tilted, 15 to 30° | Matte | 12 of 12 | 598 | 12 of 12 |
| Tilted, 15 to 30° | Glossy | 12 of 12 | 597 | 12 of 12 |

A checkerboard needs every corner, and the spot takes some; the ChArUco board gives up the corners under the spot and keeps the rest. Tilting the board moves the spot off the pattern and both work again.

In practice: a matte board, views tilted 15° or more, and a coded pattern for the few square-on views you want anyway.

Two of the matte square-on views were not found as checkerboards either, and nothing is wrong with them to the eye. A checkerboard detector returns all 60 corners or nothing, so one weak corner costs the view.

The ChArUco detector returned 613 corners from the same 12 poses. That all-or-nothing behavior is why the test uses a ChArUco board throughout.

## 7. Exposure, and a check on held-out views

One exposure has to serve the whole session. We rendered the 30 spread views at four exposures, from half the reference to four times it.

| Exposure | Saturated pixels | Views with 12+ corners | Corners of 1800 | Corner error | Model error at 60° |
|---|---|---|---|---|---|
| × 0.5 | 0.3 % | 30 | 1447 | 0.17 px | 0.25 px |
| × 1 | 1.2 % | 30 | 1525 | 0.13 px | 0.23 px |
| × 2 | 2.8 % | 30 | 1276 | 0.11 px | 0.31 px |
| × 4 | 4.4 % | 22 | 510 | 0.10 px | 0.39 px |

Underexposure costs a little precision in the dim edge views. Overexposure costs corners: the white squares in the near, central views bloom over the markers, and the view is left with a handful of corners or none.

Set the exposure on the nearest view so that the white stays below saturation, and accept the dim far views.

Finally, check the result on views that were not in the fit. The script solves each held-out board's pose through the fisheye model and reports its reprojection error.

```python
import cv2, numpy as np, glob

dictionary = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)
board = cv2.aruco.CharucoBoard((11, 7), 25.0, 18.0, dictionary)
detector = cv2.aruco.CharucoDetector(board)
all_corners = board.getChessboardCorners()
K, D = [np.load("intrinsics.npz")[k] for k in ("K", "D")]

errs = []
for path in sorted(glob.glob("holdout/*.png")):
    img = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
    corners, ids, _, _ = detector.detectBoard(img)
    if ids is None or len(ids) < 12:
        continue
    obj = all_corners[ids.ravel()].astype(np.float64)
    pts = corners.reshape(-1, 1, 2).astype(np.float64)
    # pose from undistorted (normalized) points, then project back through the fisheye model
    norm = cv2.fisheye.undistortPoints(pts, K, D)
    ok, rvec, tvec = cv2.solvePnP(obj, norm.reshape(-1, 2), np.eye(3), None)
    proj, _ = cv2.fisheye.projectPoints(obj.reshape(1, -1, 3), rvec, tvec, K, D)
    e = np.linalg.norm(proj.reshape(-1, 2) - pts.reshape(-1, 2), axis=1)
    errs.append(e)
    print(f"{path}: {len(ids)} corners, distance {np.linalg.norm(tvec):.0f} mm, RMS {np.sqrt(np.mean(e**2)):.3f} px, max {e.max():.2f} px")

e = np.concatenate(errs)
print(f"held-out: RMS {np.sqrt(np.mean(e**2)):.3f} px, max {e.max():.2f} px over {len(e)} corners")
```

Our 15 held-out views gave 0.128 px RMS over 786 corners with a maximum of 1.03 px, against 0.118 px on the fit. A held-out RMS more than about 1.5 times the fitted one means the fit is tuned to its own views, usually from too few of them or too little coverage. Add views and refit.

The printed distance is the second check: compare it with a tape measure on one or two views. A 1 % disagreement at 0.5 m is 5 mm, and it points at the focal length, not the tape.

## Checks

Before the intrinsics go into the product:

- Contrast: 0.5 or more in the camera's own images under the illuminator. Below 0.3, change the board.

- Marker size: 3 px per marker bit, 18 px per 4 × 4 marker, on the farthest calibration view. Print the marker width from the detections.

- Model: `cv2.fisheye`, with k1 to k4 free. fx and fy within 0.2 % of each other; the principal point within a few pixels of the sensor center unless the lens is deliberately offset.

- Coverage: corners in every cell of an 8 × 6 grid; the farthest corner within 5° of the edge of the used field.

- Residuals: RMS under 0.15 px at this resolution on the fit, and no more than 1.5 times that on held-out views.

- Distance: the solved board distance against a tape measure, within 1 %.

- Repeat: a second session on another day, same camera, agrees in fx within 0.2 % and in the projection of a 60° ray within 0.5 px.

## Common problems

| What you see | Likely cause | Fix |
|---|---|---|
| Board pale gray under the illuminator | Dye-based ink, transparent in the NIR | A board with an NIR-dark pattern; check the contrast at your wavelength |
| Found at the center, lost toward the edges | Low contrast plus illumination falloff | Brighter board or more exposure, and more views at the edge |
| Not found beyond a certain distance | Marker bits under 3 px | Closer views, or larger markers |
| RMS of several pixels with every view detected | Standard distortion model on a wide lens | `cv2.fisheye.calibrate` |
| Low RMS, wrong distances | Small board, focal length traded against distance | Held-out check and a tape measure; more views near the edge |
| Bright spot with no pattern in the middle of the board | Specular reflection of the illuminator | Matte board, tilt 15° or more, ChArUco |
| Corners lost in the nearest views | White squares saturating | Set the exposure on the nearest view |
| Corners in the fit, poor results on new views | Coverage concentrated at the center | Corners in every cell of the grid |
| Calibration differs between day and night | Daylight changed the contrast and the glare, not the lens | Calibrate at night under the illuminator; check by day |
| Sharp in room light, soft under the LEDs | Focus set at visible wavelengths | Focus under the illuminator |

## Next steps

- [Camera calibration with OpenCV](/calibacademy/opencv-camera-calibration/): the full intrinsics pipeline that step 4 condenses, including the standard model for narrower lenses.

- [Why your board is not detected](/calibacademy/corner-detection-troubleshooting/): contrast, blur and resolution limits of the detectors, with numbers.

- [How big should your target be?](/calibacademy/calibration-target-size/): square and marker size for a given sensor, lens and distance.

- [ToF depth camera calibration](/calibacademy/tof-depth-camera-calibration/): the same NIR illumination and the same marker-size limit, with a depth channel on top.

- Our [NIR calibration targets](/targets/nir-calibration-target/) keep their contrast at 850 and 940 nm on a matte surface; tell us the wavelength, lens and working distance and we size the markers for the far end of your cabin.

## Method

Images were rendered per pixel through the true camera model: an equidistant fisheye projection with four polynomial terms in θ plus a small θ¹⁰ term, inverted per pixel by Newton's method, supersampled 3 × 3.

Illumination came from the lens position with a cos³ profile off axis, 1/d² with distance and a cosine with incidence; the glossy board added a narrow specular lobe along the line of sight.

The board reflectances were 0.85 for white and 0.06 for the dark squares unless stated; the contrast table varied the dark value. A 0.9 px Gaussian blur, shot noise and read noise were added before quantizing to 8 bits.

Detection and calibration used OpenCV 4.14; the model error columns compare each fitted model's projection of fixed rays with the true one. Write to hello@calib.tools for the scripts.
