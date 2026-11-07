---
title: "3D vision: structured light, ToF and 3D scanning"
seoTitle: "3D vision and depth camera calibration"
seoDescription: "Calibration targets for 3D vision: step blocks and ToF boards for depth accuracy, ceramic ChArUco for structured light and stereo, multi-face targets for rigs."
code: "3D"
order: 7
audience: "For 3D camera makers and 3D scanning and measurement equipment builders."
summary: "A 3D sensor has to get both the image geometry and the reported depth right. You need flat references and known depth steps."
products:
  - "depth-camera-target"
  - "charuco-ceramic"
  - "charuco-composite"
  - "multi-camera-target"
  - "nir-calibration-target"
links:
  - { label: "Camera calibration with OpenCV", href: "/guides/opencv-camera-calibration/" }
  - { label: "FOV calculator", href: "/tools/fov/" }
  - { label: "ChArUco generator", href: "/tools/generator/charuco/" }
selection:
  - { scenario: "Stereo or structured-light intrinsics", pattern: "ChArUco", size: "110 × 85 to 400 × 300 mm", material: "Ceramic or composite" }
  - { scenario: "Depth accuracy check", pattern: "Step block, 3 or 5 steps", size: "100 × 100 mm", material: "Metal or ceramic" }
  - { scenario: "ToF camera", pattern: "ChArUco, NIR-uniform", size: "300 × 200 to 600 × 400 mm", material: "Composite" }
  - { scenario: "Projector–camera", pattern: "Checkerboard or ChArUco", size: "Sized to the projection", material: "Ceramic (matte)" }
faq:
  - { q: "Does a warped calibration board matter for a 3D scanner?", a: "Yes. Any bend becomes depth error the calibration cannot remove. Use a flat, rigid board, and keep plastic boards away from heat." }
  - { q: "Why does a black target read wrong in depth?", a: "Dark surfaces return little light to active depth sensors, which adds noise and bias. ToF and structured-light checks need surfaces with known, uniform reflectance." }
  - { q: "Can you make a replacement plate for my scanner?", a: "If the pattern is documented publicly we can often make a board to that geometry. Send us the model and we will tell you whether we can." }
---

## What you calibrate

- **Camera and projector intrinsics** and the stereo or projector–camera baseline.

- **Depth accuracy**, against flat surfaces at known height differences.

- **Multi-sensor 3D rigs** that need a shared reference.

## Common problems

3D users often discover that their calibration board is not flat: plastic boards warp, especially with heat, and every bend becomes depth error. Active sensors add another trap: dark or uneven surfaces bias the depth reading.

Step blocks give flat surfaces at known heights for a direct depth check, and our ToF boards use a near-infrared-uniform finish so the camera's own illumination does not bias the corners.
