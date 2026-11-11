---
seoTitle: "NIR calibration target, 850 / 940 nm"
seoDescription: "ChArUco and checkerboard targets that keep their contrast at 850 and 940 nm, for in-cabin DMS/OMS, ToF and industrial NIR cameras. Ask for a quote."
summary: "Calibration targets that keep their contrast under your 850 or 940 nm lighting"
decideSpecs:
  - "Wavelength"
  - "Pattern"
  - "Size"
chips:
  - "850 / 940 nm"
  - "ChArUco or checkerboard"
  - "300 × 200 to 600 × 400 mm"
story: "Many inks that look black to your eye are almost transparent in the near infrared. Under 850 or 940 nm illumination a normal board can fade until the detector loses corners. These targets use a pattern that stays dark in the NIR, so in-cabin driver and occupant monitoring cameras, ToF cameras and industrial NIR cameras see the same sharp pattern a visible camera does.\n\nWe confirm the contrast at your wavelength before production. The specifications shown are target values — tell us your wavelength, camera and working distance and we will confirm what we can deliver, and when."
compat:
  - { tool: "OpenCV", note: "≥ 4.6 · cv.aruco.CharucoBoard / findChessboardCornersSB" }
  - { tool: "ROS 2", note: "camera_calibration" }
  - { tool: "MATLAB", note: "Camera Calibrator app; detectCharucoBoardPoints (R2024a or later)" }
relatedTargets:
  - { label: "ChArUco, aluminum", href: "/targets/charuco-composite/", note: "The standard board for visible light." }
  - { label: "Checkerboard, aluminum", href: "/targets/checkerboard-composite/", note: "The simplest pattern." }
  - { label: "Depth and ToF targets", href: "/targets/depth-camera-target/", note: "Boards and step blocks for depth cameras." }
  - { label: "Thermal calibration target", href: "/targets/thermal-calibration-target/", note: "For long-wave infrared cameras." }
  - { label: "¼″ mounting fixture", href: "/targets/mounting-fixture/", note: "Holds a board on a tripod or lab post." }
relatedGuides:
  - { label: "Why your board is not detected", href: "/guides/corner-detection-troubleshooting/", note: "Contrast, blur and resolution limits." }
  - { label: "ChArUco vs checkerboard vs AprilGrid", href: "/guides/charuco-vs-checkerboard-vs-aprilgrid/", note: "Which pattern for which job." }
  - { label: "How big should your target be?", href: "/guides/calibration-target-size/", note: "The 60 % fill rule." }
---

## Why a normal board fades in the near infrared

What looks black to the eye is not always black at 850 or 940 nm. Many black inks get their color from dyes that absorb visible light and let near-infrared light through.

Under an infrared illuminator such a print turns pale. The light passes through the ink, reflects off the white board underneath and comes back. Contrast drops, and the detector starts to lose corners or markers.

Whether a given board fades depends on its ink, so one board may work and the next one from another printer may not. You only see it in the infrared image.

## How this target is different

The dark areas use a pigment that absorbs across the near infrared as well as the visible. The white areas stay bright at the same wavelengths. The pattern your infrared camera sees has the same contrast a visible camera would see.

We check the contrast at your wavelength before production, because 850 and 940 nm are not the same and neither is every sensor.

## Glare from your own illuminator

Infrared cameras usually carry their light source next to the lens. A glossy board sends that light straight back as a bright patch, and inside the patch the pattern is gone.

The surface is matte for that reason. Even so, tilt the board a little away from square-on in some of your captures; it helps the calibration and moves any remaining glare.

## Pattern and size

The planned range is ChArUco or checkerboard, from 300 × 200 to 600 × 400 mm. The choice between them is the same as in visible light: a ChArUco board still works when part of it is outside the image, a [checkerboard](/targets/checkerboard-composite/) needs to be fully in view.

Cameras for driver and occupant monitoring have wide lenses and short working distances. A board that fills a good part of the image at that distance is smaller than you might expect; the [FOV calculator](/tools/fov/) gives the field for your lens.

## Using it

Detection and calibration are the same as for any board: `CharucoDetector` or `findChessboardCornersSB` in OpenCV, the camera calibrator in ROS 2 or MATLAB. Nothing in the software knows about the wavelength.

Calibrate under the illumination you will use in operation. Focus shifts between visible and infrared light, so intrinsics measured in room light may not hold under 940 nm.

These are target values. The target is made to order, and we confirm what we can build, and when, before you order.

## What to tell us

- Wavelength of your illumination and whether the camera has a band-pass filter.
- Camera resolution, lens and working distance.
- Pattern and the size you have room for.

[Ask for a quote](/quote/?product=NIR%20calibration%20target) with these and we answer with a layout, a price and a delivery time.
