---
title: "What reprojection error really tells you"
description: "Reprojection error explained: how RMS is computed, what counts as good, why a low value can hide a wrong model, and the per-view and radius checks that show it."
date: 2026-11-07
updated: 2026-11-07
readingTime: "12 min"
keyRule: "RMS is measured only where the board was. Look at the error per view and per image radius, and verify the model where it will be used, not where it was fitted."
related: ["calibration-target-size", "opencv-camera-calibration", "printed-target-costs-half-a-pixel"]
products: ["charuco-composite", "charuco-ceramic"]
sampleFiles: []
faq:
  - q: "What is a good reprojection error?"
    a: "For a rigid board, a calibrated lens at its working focus and 15 or more views, 0.1 to 0.3 px RMS is typical. 0.3 to 0.5 px is usable; above that, look for a bad view, a bent board or motion blur. The number depends on resolution, so quote it with the image size."
  - q: "Can a low reprojection error still mean a bad calibration?"
    a: "Yes. The error is averaged over the corners that were detected. If no corners reached the frame edges, or if the model has more parameters than the views constrain, the fit is good where it was measured and wrong everywhere else."
  - q: "Should I use the rational or thin-prism distortion model?"
    a: "Only if your views cover the edges densely and the five-parameter model leaves a visible radial trend in the residuals. In our test the extra terms left RMS unchanged and made the error at the frame corners twenty times worse."
  - q: "How do I convert reprojection error to millimeters?"
    a: "Multiply by the pixel size at the working distance (coverage width divided by image width). 0.2 px at 0.3 mm per pixel is 0.06 mm. That is the precision of a single corner, not the accuracy of a measurement that spans the frame."
  - q: "Why is my RMS lower with fewer images?"
    a: "Fewer views are easier to fit, so RMS drops while the model gets less reliable. Judge a calibration by its stability across views and by a check against the truth, never by RMS alone."
---

Every calibration tool reports a reprojection error, and most people stop reading there. The number is useful, but it measures something narrower than "how good is my calibration". This guide explains what it measures, what it cannot see, and the two checks that fill the gap.

## What the number is

After calibration, the solver has a camera model (intrinsics and distortion) and a pose for every view. It projects the board's known 3D corners through that model into each image and compares them with the corners it detected. The reprojection error is the distance between the two, in pixels.

OpenCV's `calibrateCamera` returns the root-mean-square over every corner in every view:

```
RMS = sqrt( mean( ‖projected − detected‖² ) )
```

So it is an average over *the corners you gave it*. Where there were no corners, it says nothing.

## What counts as good

For a rigid board, a lens at its working focus, sharp images and 15 or more views:

| RMS (px) | Reading |
|---|---|
| < 0.15 | As good as corner detection gets at this resolution |
| 0.15 – 0.3 | Typical of a careful calibration |
| 0.3 – 0.5 | Usable; look for one or two weak views |
| 0.5 – 1.0 | Something is wrong: a bent or printed board, blur, a moved board, wrong square size |
| > 1.0 | Wrong pattern geometry or a detection failure in some view |

These scale with resolution: 0.3 px on a 640 × 480 image is a different fraction of the frame than 0.3 px on 4000 × 3000. Quote the image size next to the number.

The [printed target guide](/guides/printed-target-costs-half-a-pixel/) shows where paper, foam and inkjet scaling land on this table.

## What it hides

We built a synthetic camera with known intrinsics and distortion, rendered ChArUco views through it, calibrated with OpenCV and compared the result with the truth. The "true error" below is how far the fitted model is from the real one at the frame corners after undistortion.

**Coverage.** Same camera, same views, only the board's share of the frame changed:

| Board fill | RMS | True error at frame corners |
|---|---|---|
| 20 % | 0.29 px | 13 px |
| 60 % | 0.14 px | 1.4 px |

The RMS looks fine either way. The model is wrong by 13 px at the corners because no corner ever went there.

**Model complexity.** Fifteen views at 60 % fill, fitted with the standard five-parameter model and with the rational plus thin-prism model:

| Model | RMS | True error at frame corners |
|---|---|---|
| k1 k2 p1 p2 k3 | 0.144 px | 0.8 px |
| rational + thin prism | 0.143 px | 25 px |

Identical RMS. The extra parameters fit the same corners equally well and extrapolate badly to where there were none. More terms are not more accurate unless the data constrains them.

**One bad view.** Fifteen good views plus one with a rolling-shutter-style shear of up to 5 px:

| | RMS | True error at frame corners |
|---|---|---|
| all 15 views | 0.22 px | 3.6 px |
| bad view removed | 0.15 px | 0.8 px |

The overall RMS moved by 0.07 px. The per-view errors told the story: fourteen views between 0.03 and 0.25 px, one at 0.60 px.

## Check 1: error per view

`calibrateCamera` returns the pose of every view, so you can compute the error per view yourself. One view far above the rest is a frame to drop: motion blur, the board moved, a reflection, a mis-detected ID.

```python
import cv2
import numpy as np

rms, K, dist, rvecs, tvecs = cv2.calibrateCamera(obj_points, img_points, image_size, None, None)

per_view = []
for obj, img, r, t in zip(obj_points, img_points, rvecs, tvecs):
    proj, _ = cv2.projectPoints(obj, r, t, K, dist)
    e = np.linalg.norm(proj.reshape(-1, 2) - img.reshape(-1, 2), axis=1)
    per_view.append(np.sqrt((e ** 2).mean()))
per_view = np.array(per_view)

print("RMS %.3f px" % rms)
for i, e in enumerate(per_view):
    flag = "  <-- check" if e > 3 * np.median(per_view) else ""
    print("view %2d: %.3f px%s" % (i, e, flag))
```

Drop flagged views and calibrate again. If the RMS barely moves but the flagged view was clearly bad, that is the point: the average was hiding it.

`calibrateCameraExtended` returns the same per-view values directly, plus standard deviations for each intrinsic parameter; a large standard deviation on a distortion coefficient is another sign that the views do not constrain it.

## Check 2: error by image radius

Distortion models are radial. When the model is too simple, or the views did not reach the edges, the residuals grow with distance from the image center even though the average stays small. Bin the per-corner residuals by radius:

```python
pts, errs = [], []
for obj, img, r, t in zip(obj_points, img_points, rvecs, tvecs):
    proj, _ = cv2.projectPoints(obj, r, t, K, dist)
    e = np.linalg.norm(proj.reshape(-1, 2) - img.reshape(-1, 2), axis=1)
    pts.append(img.reshape(-1, 2)); errs.append(e)
pts, errs = np.vstack(pts), np.concatenate(errs)

cx, cy = K[0, 2], K[1, 2]
radius = np.hypot(pts[:, 0] - cx, pts[:, 1] - cy)
edges = np.linspace(0, radius.max(), 6)
for lo, hi in zip(edges[:-1], edges[1:]):
    m = (radius >= lo) & (radius < hi)
    if m.sum():
        print("r %4.0f–%4.0f px: mean %.3f px  (%d corners)" % (lo, hi, errs[m].mean(), m.sum()))
```

A healthy result is flat across bins. A rising trend with few corners in the outer bins means you need views at the edges before you need a richer model. In our test with k2, k3 and the tangential terms fixed, the inner bins sat at 0.2 px and the outermost at 2 px while RMS read 0.27 px.

## Check 3: verify where it will be used

Neither check above sees the parts of the image that never held a corner. For that, measure something known:

- Undistort an image of a straight edge (a ruler, a door frame) that crosses the frame corner-to-corner and fit a line; the residual in pixels is your error there.

- Place the board at a known distance and compare the `solvePnP` distance with a tape measure.

- For measurement systems, calibrate, then measure a gauge block or calibrated length standard at several places in the frame.

This is the number to report. RMS tells you the fit was consistent; the verification tells you it was right.

## Converting to millimeters

Pixel size on the object is coverage width divided by image width, which the [FOV calculator](/tools/fov/) reports. At 0.3 mm per pixel, an RMS of 0.2 px is 0.06 mm per corner.

That is single-corner precision. A measurement across the frame depends on how well the model holds at both ends, which is the frame-corner error above, not the RMS. Expect the two to differ by a factor of five or more unless the views covered the edges.

## Common problems

| Symptom | Likely cause | Fix |
|---|---|---|
| RMS fine, straight lines bend after undistortion | Board never reached the edges | More views at edges and corners; see the [target size guide](/guides/calibration-target-size/) |
| RMS fine, distances off by a constant factor | Wrong square size in the board definition | Measure the printed board; set `squareLength` in meters or millimeters consistently |
| One view at 3× the others | Motion blur, moved board, reflection, ID mis-read | Drop it and recalibrate |
| Residual grows with radius | Model too simple or no edge coverage | Edge views first; add k3 only if the trend remains |
| RMS drops when adding rational terms, verification gets worse | Over-parameterised | Return to the five-parameter model |
| RMS 0.5 px or more with every view similar | Board not flat, or printed and scaled | Rigid board; measure the print |
| Very low RMS with 5 views | Too few views to constrain anything | 15 or more views; check parameter standard deviations |

## Next steps

- [Size the board](/guides/calibration-target-size/) so corners reach the frame edges.

- [Calibrate step by step](/guides/opencv-camera-calibration/) with the per-view check built in.

- Compare the result against a [rigid board](/targets/charuco-composite/) if your numbers sit in the 0.5 px row.
