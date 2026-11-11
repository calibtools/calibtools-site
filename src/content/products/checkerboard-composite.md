---
seoTitle: "Checkerboard calibration target, aluminum"
seoDescription: "A rigid checkerboard calibration target every toolchain reads. When the whole board fits in your frame, it gives you the most accurate corners. 200–800 mm."
summary: "The classic checkerboard — your sharpest corners when the whole board is in view"
decideSpecs:
  - "Feature position tolerance"
  - "Substrate"
  - "Flatness"
chips:
  - "±0.3 mm + 0.2 mm/m"
  - "6 mm"
  - "200–800 mm"
story: "If you can keep the whole board in view, a checkerboard gives you the most precise corners of any planar pattern. Every calibration toolchain reads it, with nothing to configure.\n\nPick Fine when you want more corners in each image. Pick Coarse when your camera is low-resolution or far from the board. Not sure which? The free selection wizard sizes it for your camera and lens."
skus:
  - partNumber: "CT-CHT-P-200X150-F"
    title: "Checkerboard 7 × 10, 18 mm squares, 200 × 150 mm, 54 inner corners"
  - partNumber: "CT-CHT-P-200X150-C"
    title: "Checkerboard 5 × 7, 25 mm squares, 200 × 150 mm, 24 inner corners"
  - partNumber: "CT-CHT-P-300X200-F"
    title: "Checkerboard 9 × 14, 20 mm squares, 300 × 200 mm, 104 inner corners"
  - partNumber: "CT-CHT-P-300X200-C"
    title: "Checkerboard 7 × 10, 25 mm squares, 300 × 200 mm, 54 inner corners"
  - partNumber: "CT-CHT-P-400X300-F"
    title: "Checkerboard 11 × 15, 25 mm squares, 400 × 300 mm, 140 inner corners"
  - partNumber: "CT-CHT-P-400X300-C"
    title: "Checkerboard 8 × 11, 35 mm squares, 400 × 300 mm, 70 inner corners"
  - partNumber: "CT-CHT-P-600X400-F"
    title: "Checkerboard 12 × 18, 30 mm squares, 600 × 400 mm, 187 inner corners"
  - partNumber: "CT-CHT-P-600X400-C"
    title: "Checkerboard 9 × 14, 40 mm squares, 600 × 400 mm, 104 inner corners"
  - partNumber: "CT-CHT-P-800X600-F"
    title: "Checkerboard 13 × 18, 42 mm squares, 800 × 600 mm, 204 inner corners"
  - partNumber: "CT-CHT-P-800X600-C"
    title: "Checkerboard 11 × 15, 50 mm squares, 800 × 600 mm, 140 inner corners"
relatedTargets:
  - { label: "ChArUco, aluminum", href: "/targets/charuco-composite/", note: "Every corner has an ID, so partial views still count." }
  - { label: "AprilGrid, aluminum", href: "/targets/aprilgrid-composite/", note: "The board Kalibr expects for camera-IMU calibration." }
  - { label: "Circle grid, aluminum", href: "/targets/circlegrid-composite/", note: "Dot centers that hold up in soft or dim images." }
  - { label: "ChArUco, ceramic", href: "/targets/charuco-ceramic/", note: "Lithographed pattern for small fields of view." }
  - { label: "¼″ mounting fixture", href: "/targets/mounting-fixture/", note: "Clamps any board onto a tripod or lab post." }
relatedGuides:
  - { label: "ChArUco vs checkerboard vs AprilGrid", href: "/guides/charuco-vs-checkerboard-vs-aprilgrid/", note: "Which pattern for which job." }
  - { label: "How big should your target be?", href: "/guides/calibration-target-size/", note: "The 60 % fill rule and pixels per square." }
  - { label: "OpenCV camera calibration", href: "/guides/opencv-camera-calibration/", note: "From images to a camera matrix, step by step." }
  - { label: "Why your board is not detected", href: "/guides/corner-detection-troubleshooting/", note: "Measured limits for blur, tilt and resolution." }
---

## When a checkerboard is the right pattern

A checkerboard corner is the crossing of two long black-and-white edges. A detector can place it to a small fraction of a pixel, and it keeps finding it under blur and at steep angles where marker bits can no longer be read.

The price is that the detector needs the whole grid. If one row leaves the image or a gripper covers a corner, the view is lost. So the pattern suits a single camera, or a stereo pair with a shared field, where you can keep the board fully in frame.

If you need points at the very edge of the image, or the board will be partly hidden, use a [ChArUco board](/targets/charuco-composite/) instead. The [pattern comparison guide](/guides/charuco-vs-checkerboard-vs-aprilgrid/) sets the three common patterns side by side.

Every calibration toolchain reads a checkerboard: OpenCV `findChessboardCornersSB`, MATLAB, ROS `camera_calibration`, Kalibr and HALCON as a point-based object. There is no dictionary and nothing to configure beyond the corner count and the square size.

## Fine or coarse

Each size comes with two grids. **Fine** has smaller squares and more corners per image, which constrains the distortion model better. **Coarse** has larger squares, which stay detectable from further away or on a low-resolution sensor.

The rule from the [target size guide](/guides/calibration-target-size/): fill about 60 % of the image with the board and keep every square at least 25 px across.

Work out your image scale with the [FOV calculator](/tools/fov/), then take Fine if its squares still reach 25 px and Coarse if they do not.

## Sizes

The field widths below assume the board fills 60 % of the image. The image scale is the coarsest that still gives 25 px per square.

**200 × 150 mm**, for a field about 330 mm wide, about 0.2 kg. [Fine](#CT-CHT-P-200X150-F): 7 × 10 squares of 18 mm, 54 inner corners, 0.72 mm per pixel or finer. [Coarse](#CT-CHT-P-200X150-C): 5 × 7 squares of 25 mm, 24 inner corners, 1 mm per pixel or finer.

**300 × 200 mm**, for a field about 500 mm wide, about 0.4 kg. [Fine](#CT-CHT-P-300X200-F): 9 × 14 squares of 20 mm, 104 inner corners, 0.8 mm per pixel or finer. [Coarse](#CT-CHT-P-300X200-C): 7 × 10 squares of 25 mm, 54 inner corners, 1 mm per pixel or finer.

**400 × 300 mm**, for a field about 670 mm wide, about 0.8 kg. [Fine](#CT-CHT-P-400X300-F): 11 × 15 squares of 25 mm, 140 inner corners, 1 mm per pixel or finer. [Coarse](#CT-CHT-P-400X300-C): 8 × 11 squares of 35 mm, 70 inner corners, 1.4 mm per pixel or finer.

**600 × 400 mm**, for a field about 1 m wide, about 1.6 kg. [Fine](#CT-CHT-P-600X400-F): 12 × 18 squares of 30 mm, 187 inner corners, 1.2 mm per pixel or finer. [Coarse](#CT-CHT-P-600X400-C): 9 × 14 squares of 40 mm, 104 inner corners, 1.6 mm per pixel or finer.

**800 × 600 mm**, for a field about 1.3 m wide, about 3.2 kg. [Fine](#CT-CHT-P-800X600-F): 13 × 18 squares of 42 mm, 204 inner corners, 1.68 mm per pixel or finer. [Coarse](#CT-CHT-P-800X600-C): 11 × 15 squares of 50 mm, 140 inner corners, 2 mm per pixel or finer.

Boards up to 400 × 300 mm are easy to move by hand through many poses. From 600 × 400 mm up, put the board on a stand and move the camera, or mount the board on a robot flange.

## Orientation in stereo and multi-camera rigs

A checkerboard has no IDs, so two cameras must agree on which corner is the first one. That works when the pattern looks different after a half turn, which is the case when one square count is odd and the other is even.

These grids are odd × even: 200 × 150 Fine, 300 × 200 Fine and Coarse, 400 × 300 Coarse, 600 × 400 Coarse and 800 × 600 Fine. Choose one of them for a stereo pair or a multi-camera rig.

The other grids look the same after a half turn. They are fine for a single camera, where the calibration does not depend on which end is which. For rigs with little shared view, a coded pattern is the safer choice: see the [multi-camera target](/targets/multi-camera-target/).

## What is printed on the board

The pattern is centered on the board. An edge strip carries the part number, the serial number and a 100 mm scale bar, so the board can be identified and its scale checked with a ruler years later.

## Mounting

Boards from 300 × 200 mm up have four M4 threaded inserts on the rear. The [¼″ mounting fixture](/targets/mounting-fixture/) (CT-ACC-M-FIX14) clamps any size, including the 200 × 150 mm board, onto a tripod or a lab post.

Flatness is specified with the board resting on three points. Tighten mounting screws only until the board sits firmly; pulling it against an uneven surface can bend it.

## Material and print

The substrate is a 6 mm aluminum / LDPE / aluminum composite, flat to 0.5 mm per meter on three-point support. The pattern is UV-printed directly onto it, matte black on white, with an optical density of at least 1.6.

Corner positions are held to ±0.3 mm + 0.2 mm per meter of the nominal grid at 20 °C, with the mean square pitch within ±0.05 mm. Every board is measured before it ships: dimensions, flatness and a visual check.

Aluminum expands about 24 µm per meter per °C. Over the 800 mm board a 10 °C change is about 0.19 mm, so let the board reach room temperature before a careful run. The [substrate guide](/guides/composite-ceramic-or-glass/) explains when that matters.

## Files and software

Each board comes with `.opencv.json`, `.kalibr.yaml`, `.ros2.yaml`, a HALCON point tuple (`.halcon.txt`) and a `.dxf` of the pattern. The [OpenCV calibration guide](/guides/opencv-camera-calibration/) goes from images to a camera matrix.

Remember that OpenCV counts inner corners, not squares: a 9 × 14 board is `(13, 8)` to `findChessboardCornersSB`. The inner-corner count of every grid is in the table above.

To try a grid before you order, print it with the [checkerboard generator](/tools/generator/checkerboard/). A paper print is good for testing detection; the [printed target guide](/guides/printed-target-costs-half-a-pixel/) shows what it costs in accuracy.

If detection fails, the [detection check](/tools/check/) shows what the detector sees, and the [troubleshooting guide](/guides/corner-detection-troubleshooting/) lists the usual causes with measured limits.

## Care and storage

Clean with water or isopropyl alcohol up to 70 % and a soft cloth. Store the board dry, flat or standing on its long edge. The board works from −50 to +80 °C, and the print is UV-stable for up to three years outdoors.
