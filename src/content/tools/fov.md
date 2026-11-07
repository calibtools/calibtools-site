---
seoTitle: "FOV calculator — field of view, focal length"
seoDescription: "Camera field of view calculator: FOV angles, coverage and GSD from sensor, lens and distance. Find the focal length you need and size a calibration board."
h1: "Field of view calculator"
faq:
  - q: "What is GSD?"
    a: "Ground sample distance is the real-world size of one pixel at the working distance. Lower GSD means higher spatial resolution."
  - q: "How do I find my sensor dimensions?"
    a: "Check the camera datasheet for sensor width and height in mm, or select a preset from the dropdown."
  - q: "What fill factor should I use for calibration?"
    a: "A fill factor of 0.6–0.8 is typical. The board should be large enough to cover most of the frame but leave some margin at the edges."
  - q: "How do I calculate the focal length I need?"
    a: "Focal length = sensor width × working distance ÷ field width. Enter the field you need in the lens finder; the calculator also checks height and returns the shorter focal length so both fit."
  - q: "What size calibration board do I need?"
    a: "Pick a board that fills roughly half to two thirds of the frame at your working distance, with at least 3 pixels per marker bit. The calculator recommends a stock ChArUco size."
  - q: "Does this work for fisheye lenses?"
    a: "The calculator uses a pinhole model. For fisheye lenses (FOV > 120°) the values are approximate. The target size recommendation is still useful."
---

## What it does

The FOV calculator takes your camera sensor, lens focal length and working distance and computes the horizontal and vertical field of view in degrees, the coverage area in millimeters, and the ground sample distance (mm per pixel).

It works the other way too: enter the field you need to see and it returns the focal length. It then recommends a stock ChArUco board for that field and shows how many pixels land on each square and marker bit.

## How to use it

**Sensor preset** — choose your camera from the dropdown. Common machine vision sensors (IMX174, IMX264, IMX252 and others) are included with the correct sensor dimensions and resolution. Select "Custom" to enter values manually.

**Sensor width / height** — physical sensor dimensions in millimeters. These come from the camera datasheet, not the pixel count.

**Resolution** — image width and height in pixels. Used to calculate ground sample distance.

**Focal length** — lens focal length in millimeters. For zoom lenses, enter the focal length at the working zoom position.

**Working distance** — distance from the lens to the target in millimeters. This is the primary variable: moving the camera further increases coverage but reduces resolution.

**Lens finder** — enter the width (and optionally height) you need to see at the working distance. The calculator returns the focal length; pick the nearest stock lens at or below it.

**Target fill** — enter the board size you are considering. The calculator shows the recommended minimum distance to fill the given fraction of the frame.

## Worked example

2/3" sensor (IMX174, 1920 × 1200), 12 mm lens, 500 mm working distance: the field is about 365 × 275 mm and the GSD about 0.23 mm/px (the coarser of the two axes). The calculator recommends the 200 × 150 mm board at about 55 % fill, with roughly 109 pixels per square.

## Formulas

All results use the pinhole (rectilinear) model, which holds for standard machine-vision lenses at working distances well beyond the focal length.

- Field of view: FOV = 2 × atan(sensor size ÷ (2 × focal length))

- Coverage: coverage = sensor size × working distance ÷ focal length

- Focal length: f = sensor size × working distance ÷ coverage

- GSD: GSD = coverage ÷ resolution (mm per pixel)

## Choosing a calibration board

A board that fills about 60 % of the frame is a good start: large enough for sharp corners, small enough to tilt and move into the corners of the image. Each marker bit should cover at least 3 pixels so the ArUco IDs decode.

The [target size guide](/guides/calibration-target-size/) shows the test data behind these numbers.

The recommendation uses the stock [ChArUco composite board](/targets/charuco-composite/) sizes, and the [ceramic target](/targets/charuco-ceramic/) sizes when the field is too small for any composite board. The same layout can be printed free from the [pattern generator](/tools/generator/charuco/).

## Beyond visible light

If you are calibrating thermal, near-infrared or LiDAR sensors, the standard patterns still apply for geometry — but the board material matters.

See the [heated thermal target](/targets/thermal-calibration-target/) and [NIR target](/targets/nir-calibration-target/) for infrared cameras, [reflectance panels](/targets/reflectance-panel/) for LiDAR intensity, and [resolution charts](/targets/resolution-chart/) for MTF evaluation.

## Related guides

- [How big should your calibration target be?](/guides/calibration-target-size/) — the 60 % rule with test data
- [ChArUco vs checkerboard vs AprilGrid](/guides/charuco-vs-checkerboard-vs-aprilgrid/) — pattern selection after sizing
