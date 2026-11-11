---
seoTitle: "Thermal camera calibration target, heated"
seoDescription: "A heated checkerboard or circle grid for thermal camera calibration: a stable contrast your LWIR camera sees sharply. Built to order — ask for a quote."
summary: "Heated target for geometric calibration of your LWIR thermal camera"
decideSpecs:
  - "Band"
  - "Pattern"
  - "Size"
chips:
  - "8–14 µm"
  - "Checkerboard or circles"
  - "Built to size"
story: "A thermal camera does not see printed ink, so a normal board looks blank. This target is heated from behind and its pattern has a different emissivity from the background, so warm and cool areas form a crisp checkerboard or circle grid in the LWIR image.\n\nIt is made for geometric work: intrinsics of the thermal camera and extrinsics between thermal and visible cameras. It is not a blackbody and does not calibrate temperature readings. We build each one to your pattern, size and power supply. The specifications shown are target values — tell us about your camera and setup and we will confirm what we can deliver, and when."
compat:
  - { tool: "OpenCV", note: "findChessboardCornersSB or findCirclesGrid on the thermal image" }
  - { tool: "Kalibr", note: "Checkerboard or circle-grid target for thermal-visible extrinsics" }
  - { tool: "MATLAB", note: "Camera Calibrator app" }
relatedTargets:
  - { label: "Checkerboard, aluminum", href: "/targets/checkerboard-composite/", note: "The same pattern for the visible camera." }
  - { label: "Circle grid, aluminum", href: "/targets/circlegrid-composite/", note: "Dot centers that hold up in soft images." }
  - { label: "NIR calibration target", href: "/targets/nir-calibration-target/", note: "For 850 and 940 nm cameras." }
  - { label: "Multi-camera target", href: "/targets/multi-camera-target/", note: "Several faces for cameras around a rig." }
  - { label: "¼″ mounting fixture", href: "/targets/mounting-fixture/", note: "Holds a board on a tripod or lab post." }
relatedGuides:
  - { label: "OpenCV camera calibration", href: "/guides/opencv-camera-calibration/", note: "From images to a camera matrix." }
  - { label: "Why your board is not detected", href: "/guides/corner-detection-troubleshooting/", note: "Blur, tilt and resolution limits." }
  - { label: "What reprojection error tells you", href: "/guides/reprojection-error/", note: "And what a low value can hide." }
---

## Why a printed board looks blank

A long-wave infrared camera images heat radiated by surfaces, in the 8 to 14 µm band. Black ink and white board at the same temperature radiate almost the same amount, so a printed checkerboard shows up as an even gray rectangle.

To make a pattern visible, neighboring areas have to radiate differently. There are two ways to get that: make them different temperatures, or give them different emissivity. This target uses both.

## How this target works

The plate is heated from behind to a steady temperature above the room. Its pattern is made of two surfaces: one that radiates well and one that radiates poorly.

The surface that radiates well looks warm in the image. The other looks cool, because it sends little of its own heat and mostly reflects the cooler room. The result is a checkerboard or circle grid with clear contrast.

## Checkerboard or circles

Heat spreads sideways in a plate, and thermal lenses are less sharp than visible ones. Edges in a thermal image are softer than you are used to.

A circle grid copes well with that: the center of a soft-edged dot is still in the right place. A checkerboard gives the detector a familiar pattern and works in every toolchain, as long as the squares are large enough in the image.

Thermal sensors have far fewer pixels than visible ones. Plan for fewer, larger features than you would on a visible-light board; the [target size guide](/guides/calibration-target-size/) applies with your thermal resolution.

## Using it

- Switch it on and wait until the image stops changing before you capture.
- Avoid warm objects, lamps and people in front of the plate: the poorly radiating areas act like a dull mirror and show them.
- Keep drafts away. Moving air cools the surface unevenly.
- If the pattern appears inverted, invert the image before detection; the geometry is the same.

For a thermal and a visible camera together, both have to see the same features. Tell us if that is your setup, and we confirm whether the pattern can be made visible to both.

## What it is not

This is a target for geometry: intrinsics of the thermal camera, and extrinsics between thermal and other cameras. It is not a blackbody source and does not calibrate temperature readings.

These are target values. The target is made to order, and we confirm what we can build, and when, before you order.

## What to tell us

- Camera resolution, lens and working distance.
- Pattern: checkerboard or circles, and whether a visible camera has to see it too.
- Size of the area you want the pattern to cover.
- Power available at the place of use.

[Ask for a quote](/quote/?product=Thermal%20camera%20calibration%20target) with these and we answer with a layout, a price and a delivery time.
