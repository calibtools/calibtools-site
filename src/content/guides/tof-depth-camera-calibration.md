---
title: "ToF depth camera calibration"
description: "Calibrate a time-of-flight camera in OpenCV: intrinsics from the amplitude image, a flat-board depth check, offset and distance tables, and multipath."
date: 2026-11-18
updated: 2026-11-18
readingTime: "14 min"
keyRule: "Take the board's pose from the amplitude image and the intrinsics, never from the depth channel; then the depth channel can be checked against it. In our test the check tracked a depth error that swung between 12 and 31 mm to within 3 mm over 0.5 to 2.5 m, and a distance table at 0.25 m steps left 3 mm of it."
related: ["opencv-camera-calibration", "charuco-vs-checkerboard-vs-aprilgrid", "calibration-target-size", "reprojection-error", "thermal-camera-geometric-calibration", "lidar-camera-calibration", "in-cabin-850-940nm-camera-calibration"]
products: ["depth-camera-target", "nir-calibration-target", "charuco-composite"]
sampleFiles: []
faq:
  - q: "Which image do I calibrate a ToF camera on?"
    a: "The amplitude (or IR) image. It is an ordinary grayscale image formed through the same lens as the depth map, so the intrinsics and distortion you get from it apply to every depth pixel. Stretch the 16-bit frame to 8 bits and run the usual ChArUco detection; in our test 20 views gave the focal length within 0.1 %."
  - q: "Why is the depth of a checkerboard not flat?"
    a: "Two reasons. Pixels on the black-white edges mix two returns and read somewhere in between, and many ToF cameras report dark surfaces a few millimeters further than bright ones at the same distance. Use the pattern for geometry and the white squares, or the plain back of the board, for the depth check."
  - q: "How big does the ChArUco board need to be for a ToF camera?"
    a: "Size it by the markers, not the squares. With a 4 × 4 dictionary the detector needed about 3 px per marker bit, 18 px per marker, in our 640 × 480 simulation. 60 mm markers on a 460 px lens were found to 1.5 m and lost at 2 m; for checks to 2.5 m we used 120 mm markers on a 1120 × 800 mm board."
  - q: "Is the depth my camera reports a radial distance or a Z value?"
    a: "It depends on the SDK and the output mode, and it matters: treating a radial distance as Z turned a flat board at 1 m into a 205 mm bowl in our test. Point the camera square at a wall and compare the center pixel with a corner pixel. Equal values mean Z; a corner that reads further means radial."
  - q: "Can a flat-board check find a multipath error?"
    a: "Only if you reproduce the geometry. Multipath comes from light that bounces off another surface before it returns, so a board alone in open space shows none. Put the board into the corner or next to the floor it will work beside, repeat the check there, and compare: in a two-return model 10 % of indirect light at 20 MHz moved the range by 9 to 119 mm, depending on the extra path."
---

A time-of-flight camera returns two things per pixel: an amplitude value, which is an ordinary image of the scene under its own infrared light, and a distance. The amplitude image calibrates like any camera. The distance has errors of its own, and the usual calibration does nothing about them.

This guide does both in OpenCV 4.x: intrinsics from the amplitude image, then a check of the depth channel against a flat ChArUco board whose position is known from those intrinsics.

Every number comes from a synthetic 640 × 480 ToF camera we rendered pixel by pixel; the method section at the end says how.

## What goes wrong, and in which channel

Image geometry: the lens has a focal length and distortion like any other, and the point cloud is only as straight as those numbers. Our wide ToF lens, with a k1 of −0.26, bent a flat board into a 30 mm bowl when the distortion was ignored.

Depth: a constant offset from the delay in the electronics, a scale term, a periodic "wiggling" error with distance that comes from the modulation waveform, a shift with the brightness of the surface, and multipath from light that arrives twice.

The first three are the camera's and can be tabulated. The last two are the scene's.

Both channels share the lens, so the amplitude image tells you where the board is in space. That is the trick the whole check rests on: the board's pose comes from the pattern and the intrinsics, not from the depth values, and the depth values can then be judged against it.

## The test

A 640 × 480 sensor behind a 460 px lens (about 70° horizontal field of view) with barrel distortion (k1 −0.26, k2 0.085, k3 −0.012). The amplitude of a white surface at 1 m is about 8000 counts of a 16-bit range, falling with the square of the distance and towards the image edge, with shot noise.

The depth channel reports radial distance with a +15 mm offset, a 0.3 % scale error and an 8 mm wiggling error with a 1.875 m period, plus noise of 3 mm on a white surface at 1 m that grows as the amplitude falls. The pose check does not know any of this.

The board is a 7 × 5 ChArUco board with 80 mm squares and 60 mm markers from the 4 × 4 dictionary, 560 × 400 mm with a 30 mm white border. For the range sweep to 2.5 m we doubled it: 160 mm squares, 120 mm markers, 1120 × 800 mm.

## 1. Get the right data out of the camera

Switch off everything the SDK does to the depth before it reaches you: spatial and temporal filters, flying-pixel removal, the vendor's own offset table if it can be disabled, and any amplitude threshold that blanks dark pixels. You want raw distance and raw amplitude from the same exposure.

Find out whether the distance is radial (along the ray) or Z (along the optical axis). SDKs differ, and the point cloud conversion in step 5 depends on it. A quick test is a wall square to the camera: if a corner pixel reads further than the center pixel, the value is radial.

Let the camera reach its working temperature. The offset of a ToF core drifts while it warms up; a depth table taken on a cold camera is a table for a cold camera. Most SDKs report the core temperature, so wait until it stops moving.

Keep the integration time fixed for the whole session, since a change of exposure can shift the offset too.

Save the amplitude as 16-bit, not as the 8-bit preview. The preview has been stretched by the SDK frame by frame, which moves the gray levels around every edge.

## 2. Intrinsics from the amplitude image

The amplitude frame has a wide dynamic range: a board at 0.5 m is 16 times brighter than the same board at 2 m. Convert it to 8 bits with a percentile stretch and run the ChArUco detector.

How you convert turned out to matter less than for a thermal camera, because the marker detector thresholds adaptively:

| 16-bit to 8-bit conversion | Boards found (of 160) | Corner error | RMS | Focal length error |
|---|---|---|---|---|
| Keep the top 8 bits | 157 | 0.10 px | 0.118 px | −0.03 % |
| Linear min–max scaling | 160 | 0.10 px | 0.126 px | −0.06 % |
| 1–99 % percentile stretch | 158 | 0.11 px | 0.129 px | −0.06 % |
| Percentile stretch, then cornerSubPix on the 16-bit frame | 160 | 0.15 px | 0.192 px | +0.03 % |
| Percentile stretch, a quarter of the illumination | 158 | 0.12 px | 0.143 px | −0.10 % |
| Percentile stretch, lens blur 2 px instead of 1 | 41 | 0.14 px | — | — |

Twenty views at 0.5 to 1.3 m, tilted up to 35°, eight runs each. The corner error is the mean distance from the true projection; the focal length error is the median over runs.

Two things to take from it. Any sensible conversion gives the focal length within 0.1 %; the stretch is there so you can see the board, not for accuracy.

And a second `cornerSubPix` pass on the raw frame made things worse: the ChArUco corner refinement already interpolates, and a 5 × 5 window on a 28 px square has little to add.

The blur row is the one to respect. Doubling the lens blur to 2 px lost three quarters of the boards, because the marker bits were then 3 to 4 px wide under a 2 px blur. Most ToF lenses are fixed-focus; if the board is outside the focus range, move it, do not open the detector's tolerances.

```python
import glob
import cv2
import numpy as np

SQUARES, SQUARE_MM, MARKER_MM = (7, 5), 80.0, 60.0
board = cv2.aruco.CharucoBoard(SQUARES, SQUARE_MM, MARKER_MM,
                               cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50))
params = cv2.aruco.DetectorParameters()
params.cornerRefinementMethod = cv2.aruco.CORNER_REFINE_SUBPIX
detector = cv2.aruco.CharucoDetector(board, cv2.aruco.CharucoParameters(), params)
obj_all = board.getChessboardCorners()           # (24, 3) corner positions in mm

def to8(amp16, lo=1, hi=99):
    """Map the lo..hi percentile range of a 16-bit amplitude frame to 0..255."""
    a, b = np.percentile(amp16, [lo, hi])
    return np.clip((amp16.astype(np.float32) - a) * 255 / max(b - a, 1), 0, 255).astype(np.uint8)

obj_points, img_points, size = [], [], None
for path in sorted(glob.glob("views/amp_*.png")):
    amp16 = cv2.imread(path, cv2.IMREAD_UNCHANGED)   # uint16 amplitude frame
    size = amp16.shape[::-1]
    corners, ids, _, _ = detector.detectBoard(to8(amp16))
    if ids is None or len(ids) < 8:
        continue
    obj_points.append(obj_all[ids.ravel()])
    img_points.append(corners)

rms, K, dist, _, _ = cv2.calibrateCamera(obj_points, img_points, size, None, None)
print(f"{len(obj_points)} views  RMS {rms:.3f} px  fx {K[0, 0]:.1f}  fy {K[1, 1]:.1f}"
      f"  cx {K[0, 2]:.1f}  cy {K[1, 2]:.1f}")
np.savez("tof_intrinsics.npz", K=K, dist=dist)
```

Size the board by its markers. The detector needed about 3 px per marker bit; a 4 × 4 marker with its border is 6 bits wide, so 18 px per marker is the floor and 25 px is comfortable:

| Board distance | Marker width | Width per bit | Boards found (of 12) | Markers per view (of 17) | Corner error |
|---|---|---|---|---|---|
| 0.5 m | 55 px | 9.2 px | 12 | 16.8 | 0.06 px |
| 0.75 m | 37 px | 6.1 px | 12 | 17.0 | 0.07 px |
| 1.0 m | 28 px | 4.6 px | 12 | 17.0 | 0.09 px |
| 1.25 m | 22 px | 3.7 px | 12 | 15.8 | 0.10 px |
| 1.5 m | 18 px | 3.1 px | 11 | 12.0 | 0.12 px |
| 2.0 m | 14 px | 2.3 px | 0 | 2.1 | — |
| 2.5 m | 11 px | 1.8 px | 0 | 0 | — |

At 1.5 m a wider adaptive-threshold range (`adaptiveThreshWinSizeMax = 53`, `perspectiveRemovePixelPerCell = 8`) brought all 12 boards and 16.7 markers back; at 2 m nothing did. The [ChArUco generator](/tools/generator/charuco/) prints the marker size for any square and ratio you set.

## 3. Check the depth against the board

Hold the board flat to the camera, detect the pattern in the amplitude frame, and solve its pose with `solvePnP` and the intrinsics from step 2. Every pixel inside the board outline now has an expected radial distance: the point where its ray meets the board plane.

The difference between the camera's depth and that expectation is the depth error of the pixel.

Use the white squares only. Pixels on the black-white edges mix the two returns, and dark squares read further on many cameras.

In our model we gave black squares an extra 10 mm; the median over the whole board moved by 6 mm of it and the spread doubled, while the white squares alone kept 2.4 mm of it with the original spread.

```python
import cv2
import numpy as np

amp16 = cv2.imread("amp16.png", cv2.IMREAD_UNCHANGED)
depth = np.load("depth_mm.npy")        # radial distance per pixel in mm, same exposure as amp16
cal = np.load("tof_intrinsics.npz")
K, dist = cal["K"], cal["dist"]
h, w = depth.shape

# detector, obj_all and to8 as in step 2
corners, ids, _, _ = detector.detectBoard(to8(amp16))
ok, rvec, tvec = cv2.solvePnP(obj_all[ids.ravel()], corners, K, dist)
R = cv2.Rodrigues(rvec)[0]
n = R[:, 2]                                               # board normal in camera coordinates

# unit ray of every pixel through the calibrated model
uv = np.indices((h, w))[::-1].reshape(2, -1).T.astype(np.float64).reshape(-1, 1, 2)
rays = cv2.undistortPoints(uv, K, dist).reshape(-1, 2)
rays = np.hstack([rays, np.ones((rays.shape[0], 1))])
rays /= np.linalg.norm(rays, axis=1, keepdims=True)
expected = ((n @ tvec.ravel()) / (rays @ n)).reshape(h, w)   # radial distance to the board plane

# board outline (pattern plus 30 mm white border) projected with the pose, shrunk by 6 px
B, BW, BH = 30.0, SQUARES[0] * SQUARE_MM, SQUARES[1] * SQUARE_MM
outline = np.array([[-B, -B, 0], [BW + B, -B, 0], [BW + B, BH + B, 0], [-B, BH + B, 0]])
proj, _ = cv2.projectPoints(outline, rvec, tvec, K, dist)
mask = np.zeros((h, w), np.uint8)
cv2.fillConvexPoly(mask, cv2.convexHull(proj.astype(np.float32)).astype(np.int32), 1)
mask = cv2.erode(mask, np.ones((13, 13), np.uint8)).astype(bool)
white = mask & (amp16 > np.percentile(amp16[mask], 60))

err = depth - expected
med = np.median(err[white])
mad = 1.4826 * np.median(np.abs(err[white] - med))
print(f"board at {np.median(expected[white]):.0f} mm: depth error {med:+.1f} mm,"
      f" noise {mad:.1f} mm (1 sigma), {white.sum()} px")
```

Repeat at a series of distances over the camera's working range. With the large board, frontal, the sweep came out as:

| Distance | Pose error | Measured depth error | Error in the model | Noise (1 σ) |
|---|---|---|---|---|
| 0.5 m | 0.3 mm | +21.8 mm | +21.0 mm | 2.7 mm |
| 0.75 m | 0.8 mm | +15.8 mm | +15.0 mm | 4.1 mm |
| 1.0 m | 2.5 mm | +12.1 mm | +11.0 mm | 4.6 mm |
| 1.25 m | 1.6 mm | +13.0 mm | +11.4 mm | 5.6 mm |
| 1.5 m | 3.0 mm | +18.8 mm | +16.5 mm | 6.1 mm |
| 1.75 m | 3.2 mm | +26.4 mm | +23.6 mm | 7.7 mm |
| 2.0 m | 1.3 mm | +30.7 mm | +28.7 mm | 7.9 mm |
| 2.5 m | 2.6 mm | +27.1 mm | +24.7 mm | 10.1 mm |
| 3.0 m | 3.4 mm | +21.9 mm | +16.2 mm | 11.2 mm |

The pose error is the distance between the solved and the true board position; the noise is the 1 σ spread over the white squares.

The check recovered the wiggling curve: the error is not a constant, it swings from 12 to 31 mm across the range, which is what the 8 mm sinusoid on top of offset and scale looks like.

The measured error runs a little above the model, and the gap grows with distance: 0.8 mm at 0.5 m, 2.4 mm at 2.5 m. That is the −0.11 % focal length error of our intrinsics leaking into the range.

A board that the pose puts 0.11 % too close makes the depth look 0.11 % too long. The scale term of a board check is only as good as the focal length.

The 3 m row is the one to distrust. The 120 mm markers were 18 px there, at the detection floor, and the gap to the model jumped to 6 mm. Size the board so the markers stay above 25 px at the farthest distance you check.

## 4. Offset, scale and a distance table

Fit a line through the per-distance medians and you get the camera's offset and scale. Ours came back as +13.6 mm and 1.0044 against the true +15 mm and 1.003; the scale carries the focal length error from above, which is why it is 0.14 % high.

What a line cannot fit is the wiggling, and that left 8 mm of residual at its worst.

A lookup table at 0.25 m steps does better. We built one from ten frontal captures at 0.5 to 2.75 m and tested it on nine captures in between the table points, with the board tilted up to 10°:

| Correction | Largest remaining error | RMS over the nine distances |
|---|---|---|
| None | 32.8 mm | 23.4 mm |
| Offset and scale | 8.4 mm | 5.8 mm |
| Table at 0.25 m steps, linear interpolation | 2.7 mm | 1.5 mm |

Apply the table to each pixel by its own measured distance, not to the frame by its mean distance:

```python
import numpy as np

# one row per capture from step 3: median expected distance and median depth error, in mm
table = np.array([[500, 21.8], [750, 15.8], [1000, 12.1], [1250, 13.0],
                  [1500, 18.8], [1750, 26.4], [2000, 30.7], [2500, 27.1]])
corrected = depth - np.interp(depth, table[:, 0], table[:, 1])
```

Outside the table's range `np.interp` holds the end values; do not use the corrected depth there.

Step the table at a quarter of the wiggling period or finer. The period is typically a quarter of the unambiguous range, so about 1.9 m at 20 MHz and 0.6 m at 60 MHz; a first coarse sweep shows you the real one.

The table is a function of distance and, on most cameras, also of integration time and temperature. Take it at the exposure you will use, after warm-up, and repeat it on a warm camera every few months.

## 5. From depth to a point cloud

The point cloud is the depth value placed along the pixel's ray, and the ray comes from the calibrated model. This is where the intrinsics of step 2 pay off a second time.

For a flat board at 1 m, the bow of the resulting point cloud, measured as the spread of the medians of 40 × 40 px bins after a plane fit over the white squares:

| Conversion | Bow of a flat board at 1 m |
|---|---|
| Calibrated focal length and distortion | 3.3 mm |
| Calibrated focal length, distortion ignored | 30.1 mm |
| Datasheet focal length (480 px instead of 460), distortion ignored | 41.4 mm |
| Calibrated model, radial distance treated as Z | 205 mm |

```python
import numpy as np

# rays: unit vectors from step 3, one per pixel; corrected: depth from step 4
xyz = (rays * corrected.reshape(-1, 1)).reshape(h, w, 3)   # radial distance along the ray

# if the SDK reports Z instead of radial distance:
# xyz = (rays / rays[:, 2:3] * corrected.reshape(-1, 1)).reshape(h, w, 3)
```

The 3.3 mm that remains with the calibrated model is the per-bin noise and the edge rows of the board. Many SDKs do this conversion for you with their own factory intrinsics; the board check in step 3 tells you whether those are good enough.

## 6. Multipath and reflectance

A continuous-wave ToF camera measures the phase of the returned modulation. If a second copy of the light arrives after bouncing off a floor, a wall or the inside of a box, the two returns add as phasors and the phase moves. In a two-return model with the direct return at 1 m:

| Indirect fraction | Extra path 0.2 m | 0.5 m | 1 m | 2 m | 4 m |
|---|---|---|---|---|---|
| 2 % | +2 mm | +5 mm | +10 mm | +18 mm | +24 mm |
| 5 % | +5 mm | +12 mm | +23 mm | +43 mm | +60 mm |
| 10 % | +9 mm | +23 mm | +44 mm | +83 mm | +119 mm |
| 20 % | +17 mm | +41 mm | +82 mm | +156 mm | +239 mm |

That is for a 20 MHz modulation; at 100 MHz the same 10 % of indirect light moves the range by at most 24 mm, because the error scales with the modulation wavelength. The sign depends on the extra path and can be negative.

```python
import numpy as np

def multipath_error_mm(d_m, indirect_fraction, extra_path_m, f_mod_hz):
    """Range error of a CW ToF pixel with one indirect return (two-return phasor model)."""
    unamb = 299792458.0 / (2 * f_mod_hz)            # unambiguous range in m
    k = 2 * np.pi / unamb
    phasor = np.exp(1j * k * d_m) + indirect_fraction * np.exp(1j * k * (d_m + extra_path_m / 2))
    return ((np.angle(phasor) / k) % unamb - d_m) * 1000

print(f"{multipath_error_mm(1.0, 0.10, 1.0, 20e6):+.0f} mm")
```

The practical rules follow from the table. Do the board check in open space, with nothing bright within a meter beside or behind the board, and the camera not looking into a corner.

Then put the board where the camera will actually work, a bin, a corner, next to a conveyor, and run the same check: the difference is the multipath of that scene, and no table from the lab removes it.

Reflectance works the other way round. A dark surface returns less light, so its pixels are noisier (12 mm against 4.6 mm at 1 m on our black and white squares), and on many cameras the lower amplitude also shifts the measured distance.

The board that checks depth should be white, matte and uniform where you measure; the pattern is for the pose. A board with an [NIR-uniform finish](/targets/nir-calibration-target/) keeps the pattern readable at 850 and 940 nm without turning the black squares into shiny ones.

## Checks

Before you trust a depth table:

- Intrinsics: RMS under 0.15 px at 640 × 480, fy/fx within 0.002 of 1, principal point within a few pixels of the center. The focal length error becomes a range scale error one to one, so a 0.5 % focal length error is 5 mm at 1 m.

- Pose: the board's solved distance against a tape measure at one position. A 1 % disagreement is the intrinsics, not the tape.

- Markers at the far end: 25 px or more. Print the marker width in pixels from the detections of the farthest capture.

- Depth noise: the 1 σ figure from step 3 on the white squares should match the camera's datasheet at that distance and amplitude. Twice the datasheet value usually means a filter you forgot to disable or an exposure too short for the range.

- Flatness: a frontal board after conversion to XYZ bows by less than the per-pixel noise. A bowl that grows towards the image corners is the distortion model; one that flips sign when you swap radial and Z is the wrong depth convention.

- Repeatability: two tables, taken an hour apart on a warm camera, agree within the noise of a single capture. If they do not, the offset is drifting with temperature.

## Common problems

| What you see | Likely cause | Fix |
|---|---|---|
| Board not detected beyond a certain distance | Marker bits under 3 px | Larger markers, or a second board for the far range |
| Board found near, not far, even with large markers | Lens blur at that distance | Fixed-focus lens outside its range; check with a resolution target |
| Depth error of the board changes with its tilt | Pose from the depth channel, or black squares in the mask | Pose from the amplitude image only; white squares only |
| Flat board is a bowl in the point cloud | Distortion ignored or datasheet focal length | Calibrated intrinsics in the conversion |
| Bowl of 100 mm or more | Radial distance converted as Z, or the reverse | Check the convention with a wall square to the camera |
| Error grows with distance even after the offset | Scale error, or a focal length error leaking in | Check fx against a tape-measured pose; fit a scale term |
| Error swings up and down with distance | Wiggling | Table at a quarter of the period or finer |
| Table does not reproduce the next day | Temperature or exposure changed | Warm-up, fixed integration time, note the core temperature |
| Depth right in the lab, wrong in the cell | Multipath from the cell's surfaces | Repeat the board check in place and subtract the difference |
| Noisy pixels on the pattern's black squares | Low amplitude | Expected; measure depth on the white squares |

## Next steps

- [Camera calibration with OpenCV](/calibacademy/opencv-camera-calibration/) — the full intrinsics pipeline that step 2 condenses.

- [ChArUco, checkerboard or AprilGrid?](/calibacademy/charuco-vs-checkerboard-vs-aprilgrid/) — why a ChArUco board survives a partial view at 0.5 m and a checkerboard does not.

- [How big should your target be?](/calibacademy/calibration-target-size/) — square and marker size for a given sensor, lens and distance.

- [Thermal camera geometric calibration](/calibacademy/thermal-camera-geometric-calibration/) — the same stereoCalibrate step aligns a ToF camera with a color camera: detect the board in both, fix the intrinsics, solve R and T.

- Our [depth camera targets](/targets/depth-camera-target/) pair a ChArUco board with an NIR-uniform finish and a step block with known heights; tell us the sensor, lens and working range and we size the markers for the far end.

## Method

Amplitude and depth were rendered per pixel through the true camera model (five-parameter Brown distortion inverted per pixel), supersampled 2 × 2, with Lambertian shading, 1/d² falloff, a cos³ illumination profile, a 1 px lens blur, shot and read noise, and a gray wall 0.8 m behind the board.

Depth was the true radial distance per pixel with the error model of the test section. Detection and calibration used OpenCV 4.14 with the default distortion model. Write to hello@calib.tools for the scripts.
