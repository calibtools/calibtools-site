---
title: "Machine vision inspection and 2D measurement"
seoTitle: "Machine vision calibration targets"
seoDescription: "Calibration targets for machine vision inspection and 2D measurement: HALCON plates, circle grids, ceramic ChArUco and line-scan strips for mm-per-pixel work."
code: "MV"
order: 6
audience: "For vision-system builders, HALCON and OpenCV users and inspection-line integrators."
summary: "Inspection systems turn pixels into millimeters. The target sets the scale, so its geometry has to be known and stable."
products:
  - "halcon-composite"
  - "circlegrid-composite"
  - "charuco-ceramic"
  - "checkerboard-composite"
  - "line-scan-target"
  - "resolution-chart"
links:
  - { label: "FOV calculator", href: "/tools/fov/" }
  - { label: "Format converter", href: "/tools/convert/" }
  - { label: "Pattern generator", href: "/tools/generator/" }
  - { label: "USAF 1951 lp/mm table", href: "/guides/usaf-1951-lp-mm-table/" }
selection:
  - { scenario: "HALCON measurement setup", pattern: "HALCON calibration plate", size: "Sized to the field", material: "Composite" }
  - { scenario: "Small field, high accuracy", pattern: "ChArUco or circle grid", size: "110 × 85 to 230 × 140 mm", material: "Alumina ceramic" }
  - { scenario: "Telecentric lens", pattern: "Circle grid or checkerboard", size: "Sized to the field", material: "Ceramic" }
  - { scenario: "Line-scan camera", pattern: "Line or dot strip", size: "300 to 800 mm long", material: "Chrome on glass" }
faq:
  - { q: "Circles or checkerboard?", a: "Both work. Circle centers are robust under defocus; checkerboard corners are less affected by perspective. Pick what your software expects and what your lens and lighting favour." }
  - { q: "How do I calibrate a telecentric lens?", a: "The standard pinhole model does not fit a telecentric lens. Use your software’s telecentric model (HALCON has one) or a scale-and-distortion fit, with a flat target on the object plane." }
  - { q: "How do I get mm per pixel?", a: "Image a target with known feature pitch in the measurement plane and fit scale and distortion. A ruler or printed grid is rarely accurate enough." }
---

## What you calibrate

- **Scale (mm per pixel)** and **lens distortion** in the measurement plane.

- **Telecentric and line-scan** setups that do not follow the standard pinhole model.

- **Camera pose** relative to a conveyor or fixture.

## Common problems

Many measurement errors come from the reference itself: a printed grid, a ruler or a board that has moved. For measurement you need a target whose feature positions are known, on a substrate that stays flat.

Circle grid versus checkerboard is a recurring debate with no single answer; it depends on optics and lighting. Line-scan and telecentric systems need their own approach, and we make long glass strips for line-scan cameras.
