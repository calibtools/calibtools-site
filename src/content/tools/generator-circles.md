---
seoTitle: "Asymmetric circle grid generator — free PDF"
seoDescription: "Generate symmetric and asymmetric circle grid patterns as print-exact PDF for OpenCV findCirclesGrid and HALCON. Set rows, spacing and layout. Free, in-browser."
h1: "Circle grid pattern generator"
faq:
  - q: "What is the difference between symmetric and asymmetric circles?"
    a: "Symmetric grids have circles on every grid position. Asymmetric grids offset every other row, which removes the 180° rotation ambiguity and makes the pattern orientation unambiguous."
  - q: "When should I use circles instead of checkerboards?"
    a: "Circle grids can be more robust for defocused or low-contrast images because the circle centroids are less sensitive to blur than checkerboard corners. They are also common in HALCON workflows."
  - q: "Does OpenCV support circle grid detection?"
    a: "Yes, via cv::findCirclesGrid with CALIB_CB_SYMMETRIC_GRID or CALIB_CB_ASYMMETRIC_GRID flags."
  - q: "Which size do I pass to findCirclesGrid for an asymmetric grid?"
    a: "Circles per row first, then rows. In an asymmetric grid every row holds half as many circles as the lattice has columns, so the classic pattern of 11 rows is (4, 11). The opencv.json file from the generator contains this pair."
  - q: "Can I use the pattern commercially?"
    a: "Yes. Patterns you generate here are free to use for any purpose, including commercial products and client work. No sign-up and no attribution needed."
---

## What it does

Generate symmetric and asymmetric circle grid calibration patterns. Circle grids use filled dot centroids for detection, which can be more robust than corner-based patterns in certain conditions (defocus, low contrast, industrial lighting). The generator also supports HALCON-style dot patterns.

## How to use it

1. **Pattern**: Asymmetric circles, Symmetric circles or HALCON-style dots. The page opens with the classic asymmetric grid of 4 × 11 circles at 18 mm spacing, which fits one A4 or Letter page.

2. **Rows, columns and spacing**: for an asymmetric grid the column count is that of the full lattice, twice the circles in a row.

3. **Download** the PDF and print at 100 % (no "fit to page"). Check the 100 mm scale bar with a ruler.

## Ready-made grids

Each link opens the generator with the grid filled in.

- [Asymmetric, 4 × 11 circles, 18 mm spacing: one A4 or Letter page](/tools/generator/circles/?type=Asymmetric+circles&rows=11&cols=8&square=18)
- [Asymmetric, 4 × 11 circles, 25 mm spacing: one A3 or Tabloid page](/tools/generator/circles/?type=Asymmetric+circles&rows=11&cols=8&square=25&paper=A3)
- [Symmetric, 10 × 7 circles, 20 mm spacing: one A4 or Letter page](/tools/generator/circles/?type=Symmetric+circles&rows=7&cols=10&square=20)

## Detect it with OpenCV

For the asymmetric 4 × 11 grid:

```python
import cv2

gray = cv2.imread("view.png", cv2.IMREAD_GRAYSCALE)
found, centers = cv2.findCirclesGrid(gray, (4, 11), flags=cv2.CALIB_CB_ASYMMETRIC_GRID)
```

For the symmetric 10 × 7 grid, pass `(10, 7)` and `cv2.CALIB_CB_SYMMETRIC_GRID`.

## Free for commercial use

Patterns from this generator are free to use for any purpose: internal, educational or commercial. No sign-up and no attribution needed.

## Paper or a rigid board?

A paper print is fine for learning and quick checks. For results you rely on, the [circle grid on aluminum composite](/targets/circlegrid-composite/) stays flat and is measured before it ships.

## Related guides

- [ChArUco vs checkerboard vs AprilGrid](/guides/charuco-vs-checkerboard-vs-aprilgrid/) — comparing pattern types
