---
seoTitle: "Circle grid calibration target, aluminum"
seoDescription: "Symmetric or asymmetric circle grids for OpenCV findCirclesGrid and Kalibr. Your dot centers stay accurate under defocus and low light. 200–800 mm."
summary: "Circle grids for OpenCV and Kalibr — robust when your images are soft or dim"
decideSpecs:
  - "Feature position tolerance"
  - "Substrate"
  - "Grid layout"
chips:
  - "±0.3 mm + 0.2 mm/m"
  - "6 mm"
  - "200–800 mm"
story: "Corner detectors struggle when your image is slightly out of focus, blurred or dim. Circle grids don't depend on sharp corners: the center of each dot comes from an ellipse fit, so it holds up in exactly those conditions.\n\nChoose a symmetric or an asymmetric layout. Both work natively with OpenCV findCirclesGrid, for mono, stereo and structured-light setups; in HALCON you use the circle centers as a point-based calibration object."
skus:
  - partNumber: "CT-CIR-P-200X150-SYM"
    title: "Symmetric 7 × 10, ⌀ 12 mm at 20 mm pitch, 200 × 150 mm, 70 circles"
  - partNumber: "CT-CIR-P-300X200-SYM"
    title: "Symmetric 9 × 14, ⌀ 14 mm at 22 mm pitch, 300 × 200 mm, 126 circles"
  - partNumber: "CT-CIR-P-400X300-SYM"
    title: "Symmetric 11 × 16, ⌀ 17 mm at 25 mm pitch, 400 × 300 mm, 176 circles"
  - partNumber: "CT-CIR-P-600X400-SYM"
    title: "Symmetric 13 × 20, ⌀ 20 mm at 30 mm pitch, 600 × 400 mm, 260 circles"
  - partNumber: "CT-CIR-P-800X600-SYM"
    title: "Symmetric 16 × 24, ⌀ 22 mm at 33 mm pitch, 800 × 600 mm, 384 circles"
  - partNumber: "CT-CIR-P-200X150-ASY"
    title: "Asymmetric 7 × 5, ⌀ 12 mm at 20 mm pitch, 200 × 150 mm, 35 circles"
  - partNumber: "CT-CIR-P-300X200-ASY"
    title: "Asymmetric 9 × 7, ⌀ 14 mm at 22 mm pitch, 300 × 200 mm, 63 circles"
  - partNumber: "CT-CIR-P-400X300-ASY"
    title: "Asymmetric 11 × 8, ⌀ 17 mm at 25 mm pitch, 400 × 300 mm, 88 circles"
  - partNumber: "CT-CIR-P-600X400-ASY"
    title: "Asymmetric 13 × 10, ⌀ 20 mm at 30 mm pitch, 600 × 400 mm, 130 circles"
  - partNumber: "CT-CIR-P-800X600-ASY"
    title: "Asymmetric 16 × 12, ⌀ 22 mm at 33 mm pitch, 800 × 600 mm, 192 circles"
relatedTargets:
  - { label: "Checkerboard, aluminum", href: "/targets/checkerboard-composite/", note: "Sharper features when the image is in focus." }
  - { label: "ChArUco, aluminum", href: "/targets/charuco-composite/", note: "Every corner has an ID, so partial views still count." }
  - { label: "AprilGrid, aluminum", href: "/targets/aprilgrid-composite/", note: "The board Kalibr expects for camera-IMU calibration." }
  - { label: "Depth and ToF camera targets", href: "/targets/depth-camera-target/", note: "For structured-light and time-of-flight cameras." }
  - { label: "¼″ mounting fixture", href: "/targets/mounting-fixture/", note: "Clamps any board onto a tripod or lab post." }
relatedGuides:
  - { label: "Why your board is not detected", href: "/guides/corner-detection-troubleshooting/", note: "Image problems and board-definition problems." }
  - { label: "How big should your target be?", href: "/guides/calibration-target-size/", note: "The 60 % fill rule." }
  - { label: "OpenCV camera calibration", href: "/guides/opencv-camera-calibration/", note: "From images to a camera matrix, step by step." }
  - { label: "What reprojection error tells you", href: "/guides/reprojection-error/", note: "And what a low value can hide." }
---

## Why circles instead of corners

A corner detector looks for the crossing of two sharp edges. When the image is slightly out of focus, dim or noisy, those edges soften and the corner position starts to wander.

A circle grid uses the center of each dot instead. The center comes from the whole outline of the dot, so blur that is the same on all sides moves it very little.

That is why circle grids are common with structured-light scanners, long lenses with a shallow depth of field and cameras working in low light.

There is one thing to know. A circle seen at an angle is an ellipse, and the center of the ellipse is not exactly the image of the circle's center.

The offset grows with tilt and with the size of the circle in the image. For the last tenth of a pixel in a sharp image, a [checkerboard](/targets/checkerboard-composite/) is the better target.

## Symmetric or asymmetric

**Symmetric** grids have dots on a square lattice. They look the same after a half turn, so they suit a single camera, or software that knows the board's orientation some other way.

**Asymmetric** grids offset every other row by half a pitch. The pattern looks different after a half turn, so two cameras always agree on which dot is the first one. Use an asymmetric grid for stereo pairs and multi-camera rigs.

In OpenCV both go through `cv2.findCirclesGrid`, with `CALIB_CB_SYMMETRIC_GRID` or `CALIB_CB_ASYMMETRIC_GRID`. Take the pattern size from the board's `.opencv.json`, since the convention for asymmetric grids is easy to get backwards.

## How big the circles should be in the image

`findCirclesGrid` finds the dots with OpenCV's blob detector, and the detector's default settings only accept blobs between 25 and 5000 px² in area. That is a circle between about 6 and 80 px across.

We tested the stock layout at different scales with the default settings. Both layouts were found with circles from 10 px to 75 px across and missed at 80 px and above; below 8 px the symmetric grid was missed, and the asymmetric grid already at 8 px.

So with default settings, aim for circles between 10 and 75 px across. If your circles are larger, the board is not at fault: pass your own blob detector with a higher `maxArea`:

```python
import cv2

params = cv2.SimpleBlobDetector_Params()
params.maxArea = 50000          # default is 5000 px²
detector = cv2.SimpleBlobDetector_create(params)

found, centers = cv2.findCirclesGrid(
    gray, pattern_size, flags=cv2.CALIB_CB_ASYMMETRIC_GRID, blobDetector=detector)
```

## Sizes

The field widths below assume the board fills about 60 % of the image, as in the [target size guide](/guides/calibration-target-size/). The image scales are the range that keeps the circles between 10 and 75 px with default settings; the [FOV calculator](/tools/fov/) gives yours.

**200 × 150 mm**, circles of 12 mm at a 20 mm pitch, about 0.2 kg, for a field about 330 mm wide. [Symmetric](#CT-CIR-P-200X150-SYM): 7 × 10, 70 circles. [Asymmetric](#CT-CIR-P-200X150-ASY): 7 × 5, 35 circles. Keep the image scale between 0.16 and 1.2 mm per pixel.

**300 × 200 mm**, circles of 14 mm at a 22 mm pitch, about 0.4 kg, for a field about 500 mm wide. [Symmetric](#CT-CIR-P-300X200-SYM): 9 × 14, 126 circles. [Asymmetric](#CT-CIR-P-300X200-ASY): 9 × 7, 63 circles. Keep the image scale between 0.19 and 1.4 mm per pixel.

**400 × 300 mm**, circles of 17 mm at a 25 mm pitch, about 0.8 kg, for a field about 670 mm wide. [Symmetric](#CT-CIR-P-400X300-SYM): 11 × 16, 176 circles. [Asymmetric](#CT-CIR-P-400X300-ASY): 11 × 8, 88 circles. Keep the image scale between 0.23 and 1.7 mm per pixel.

**600 × 400 mm**, circles of 20 mm at a 30 mm pitch, about 1.6 kg, for a field about 1 m wide. [Symmetric](#CT-CIR-P-600X400-SYM): 13 × 20, 260 circles. [Asymmetric](#CT-CIR-P-600X400-ASY): 13 × 10, 130 circles. Keep the image scale between 0.27 and 2 mm per pixel.

**800 × 600 mm**, circles of 22 mm at a 33 mm pitch, about 3.2 kg, for a field about 1.3 m wide. [Symmetric](#CT-CIR-P-800X600-SYM): 16 × 24, 384 circles. [Asymmetric](#CT-CIR-P-800X600-ASY): 16 × 12, 192 circles. Keep the image scale between 0.29 and 2.2 mm per pixel.

Other grids and circle sizes are a custom order; [ask for a quote](/quote/).

## What is printed on the board

The grid is centered with a white quiet zone of at least one circle pitch on every side. Outside it, an edge strip carries the part number, the serial number and a 100 mm scale bar.

## Mounting

Boards from 300 × 200 mm up have four M4 threaded inserts on the rear. The [¼″ mounting fixture](/targets/mounting-fixture/) (CT-ACC-M-FIX14) clamps any size onto a tripod or a lab post.

## Material and print

The substrate is a 6 mm aluminum / LDPE / aluminum composite, flat to 0.5 mm per meter with the board on three points. The pattern is UV-printed, matte black on white, with an optical density of at least 1.6.

Circle centers are held to ±0.3 mm + 0.2 mm per meter of the nominal grid at 20 °C, with the mean pitch within ±0.05 mm and the outline of each circle within 0.05 mm of round. Every board is measured before it ships: dimensions, flatness and a visual check.

## Files and software

Each board comes with `.opencv.json` and a `.dxf` of the pattern; symmetric boards also come with `.kalibr.yaml`. In HALCON, use the circle centers as a point-based calibration object.

To try a layout before you order, print it with the [circle grid generator](/tools/generator/circles/). If the grid is not found, the [troubleshooting guide](/guides/corner-detection-troubleshooting/) separates image problems from board-definition problems.

After calibrating, read the result with the [reprojection error guide](/guides/reprojection-error/): a low number alone does not show that the model is right at the image edges.

## Care and storage

Clean with water or isopropyl alcohol up to 70 % and a soft cloth. Store the board dry between −20 and +60 °C, flat or standing on its long edge. It works from −50 to +80 °C.
