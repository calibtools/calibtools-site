---
seoTitle: "FOV calculator — field of view and GSD"
seoDescription: "Calculate field of view, ground sample distance and target size for any camera and lens. Presets for common machine vision cameras. Free, in your browser."
h1: "FOV & resolution calculator"
faq:
  - q: "What is GSD?"
    a: "Ground sample distance is the real-world size of one pixel at the working distance. Lower GSD means higher spatial resolution."
  - q: "How do I find my sensor dimensions?"
    a: "Check the camera datasheet for sensor width and height in mm, or select a preset from the dropdown."
  - q: "What fill factor should I use for calibration?"
    a: "A fill factor of 0.6–0.8 is typical. The board should be large enough to cover most of the frame but leave some margin at the edges."
  - q: "Does this work for fisheye lenses?"
    a: "The calculator uses a pinhole model. For fisheye lenses (FOV > 120°) the values are approximate. The target size recommendation is still useful."
---

## What it does

The FOV calculator takes your camera sensor, lens focal length and working distance and computes the horizontal and vertical field of view in degrees, the coverage area in millimetres, and the ground sample distance (mm per pixel).

It also recommends a minimum working distance for a given target size and fill factor, so you can size your calibration board before ordering.

## How to use it

**Sensor preset** — choose your camera from the dropdown. Common machine vision sensors (IMX174, IMX264, IMX252 and others) are included with the correct sensor dimensions and resolution. Select "Custom" to enter values manually.

**Sensor width / height** — physical sensor dimensions in millimetres. These come from the camera datasheet, not the pixel count.

**Resolution** — image width and height in pixels. Used to calculate ground sample distance.

**Focal length** — lens focal length in millimetres. For zoom lenses, enter the focal length at the working zoom position.

**Working distance** — distance from the lens to the target in millimetres. This is the primary variable: moving the camera further increases coverage but reduces resolution.

**Target fill** — enter the board size you are considering. The calculator shows the recommended minimum distance to fill the given fraction of the frame.

## Worked example

2/3" sensor (IMX174, 1920 × 1200), 12 mm lens, 500 mm working distance: the FOV is approximately 365 × 275 mm with a GSD of 0.19 mm/px. A 250 × 175 mm board fills about 68 % of the horizontal frame — a reasonable fill for calibration.

## Related guides

- [ChArUco vs checkerboard vs AprilGrid](/guides/charuco-vs-checkerboard-vs-aprilgrid/) — pattern selection after sizing
