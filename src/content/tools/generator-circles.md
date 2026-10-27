---
seoTitle: "Circle grid generator — symmetric PDF"
seoDescription: "Generate symmetric and asymmetric circle grid calibration patterns. Print-exact PDF for OpenCV cv::findCirclesGrid. Free, runs in your browser."
h1: "Circle grid pattern generator"
faq:
  - q: "What is the difference between symmetric and asymmetric circles?"
    a: "Symmetric grids have circles on every grid position. Asymmetric grids offset every other row, which removes the 180° rotation ambiguity and makes the pattern orientation unambiguous."
  - q: "When should I use circles instead of checkerboards?"
    a: "Circle grids can be more robust for defocused or low-contrast images because the circle centroids are less sensitive to blur than checkerboard corners. They are also common in HALCON workflows."
  - q: "Does OpenCV support circle grid detection?"
    a: "Yes, via cv::findCirclesGrid with CALIB_CB_SYMMETRIC_GRID or CALIB_CB_ASYMMETRIC_GRID flags."
---

## What it does

Generate symmetric and asymmetric circle grid calibration patterns. Circle grids use filled dot centroids for detection, which can be more robust than corner-based patterns in certain conditions (defocus, low contrast, industrial lighting). The generator also supports HALCON-style dot patterns.

## How to use it

Set pattern to **Symmetric circles**, **Asymmetric circles** or **HALCON-style dots**. Configure rows, columns and circle spacing. Download the PDF and print at 1:1 scale.

## Related guides

- [ChArUco vs checkerboard vs AprilGrid](/guides/charuco-vs-checkerboard-vs-aprilgrid/) — comparing pattern types
