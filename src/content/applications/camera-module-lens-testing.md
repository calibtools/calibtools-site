---
title: "Camera module and lens testing"
seoTitle: "Camera module and lens test targets"
seoDescription: "Targets for camera module and lens testing: ISO 12233 resolution charts for MTF and SFR, plus geometric calibration boards for distortion and alignment checks."
code: "CAM"
order: 9
audience: "For camera-module makers, lens makers and ISP tuning teams."
summary: "Module and lens testing measures sharpness, distortion and alignment. Charts have to be sized to the field and printed finely enough."
products:
  - "resolution-chart"
  - "charuco-composite"
  - "checkerboard-composite"
  - "charuco-ceramic"
  - "color-chart"
  - "grayscale-oecf-chart"
  - "focus-siemens-star-chart"
  - "resolution-targets-glass"
links:
  - { label: "USAF 1951 lp/mm table", href: "/guides/usaf-1951-lp-mm-table/" }
  - { label: "FOV calculator", href: "/tools/fov/" }
  - { label: "Quality analyzer", href: "/tools/quality/" }
selection:
  - { scenario: "MTF / SFR", pattern: "ISO 12233 slanted-edge chart", size: "A3 to A1", material: "Printed chart" }
  - { scenario: "Small field of view", pattern: "Resolution chart sized to the field", size: "On request", material: "Film or glass" }
  - { scenario: "Distortion and intrinsics", pattern: "ChArUco or checkerboard", size: "Sized to the field", material: "Ceramic or composite" }
  - { scenario: "Limiting resolution", pattern: "USAF 1951", size: "Sized to the field", material: "Glass or film" }
faq:
  - { q: "How small can an MTF chart be?", a: "Edges should still span many pixels in the image. For small fields of view the chart has to be made at a finer scale, often on film or glass, rather than printed smaller." }
  - { q: "Why does my MTF result just follow the print contrast?", a: "A chart with low print contrast or soft edges limits the measurement. The chart’s own resolution has to be well above what you are testing." }
  - { q: "Can I use the same chart for distortion?", a: "Distortion is better measured with a geometric target such as a checkerboard or ChArUco board with known feature positions." }
---

## What you test

- **Sharpness** (MTF, SFR) across the field.

- **Distortion** and intrinsics.

- **Alignment** of lens and sensor.

## Common problems

Chart size relative to the field of view is the recurring worry: shrink a chart too far and its own edges become the limit. For small fields the chart has to be made at a finer scale, not just printed smaller.

For distortion and lens–sensor alignment a geometric target gives better data than a resolution chart; our ChArUco and checkerboard boards cover that side.
