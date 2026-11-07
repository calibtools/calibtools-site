---
title: "Thermal and infrared camera calibration"
seoTitle: "Thermal and infrared camera calibration"
seoDescription: "Calibration targets for thermal and infrared cameras: heated LWIR targets for intrinsics and thermal–visible extrinsics, and NIR targets for 850 and 940 nm."
code: "IR"
order: 10
audience: "For thermal-camera makers, infrared camera users and multispectral teams."
summary: "Infrared cameras do not see the ink contrast a normal board relies on. They need targets that create contrast in their own band."
products:
  - "thermal-calibration-target"
  - "nir-calibration-target"
  - "depth-camera-target"
  - "backlit-target"
links:
  - { label: "Camera calibration with OpenCV", href: "/guides/opencv-camera-calibration/" }
  - { label: "FOV calculator", href: "/tools/fov/" }
  - { label: "Pattern generator", href: "/tools/generator/" }
selection:
  - { scenario: "LWIR thermal intrinsics", pattern: "Heated checkerboard or circles", size: "Built to size", material: "Heated panel" }
  - { scenario: "Thermal–visible extrinsics", pattern: "Heated pattern also visible in RGB", size: "Built to size", material: "Heated panel" }
  - { scenario: "850 / 940 nm camera", pattern: "ChArUco, NIR-dark pattern", size: "300 × 200 to 600 × 400 mm", material: "Composite" }
  - { scenario: "ToF camera", pattern: "ChArUco, NIR-uniform", size: "300 × 200 to 600 × 400 mm", material: "Composite" }
faq:
  - { q: "Why can’t my thermal camera see the checkerboard?", a: "Printed ink has almost the same emissivity as the paper, so in LWIR the board looks uniform. A heated target with emissivity contrast shows the pattern clearly." }
  - { q: "Does a heated target calibrate temperature?", a: "No. It is for geometry: intrinsics and extrinsics. Temperature calibration needs a blackbody." }
  - { q: "My NIR camera loses the corners. Why?", a: "Many black inks are transparent in the near infrared. Use a pattern that stays dark at your wavelength." }
---

## What you calibrate

- **Thermal camera intrinsics** in the LWIR band.

- **Thermal–visible extrinsics** for fusion.

- **NIR cameras** at 850 or 940 nm, including in-cabin and ToF cameras.

## Common problems

This field has the most do-it-yourself workarounds: hair dryers, foil, sunlight and heated wires. They work for a few minutes and then the contrast fades. A heated target holds a stable contrast for a whole capture session.

In the near infrared the problem is different: many inks that look black are transparent at 850 or 940 nm. Our NIR targets use a pattern that stays dark at your wavelength, and we confirm the contrast before production.
