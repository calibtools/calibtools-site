---
seoTitle: "Checkerboard generator — calibration PDF"
seoDescription: "Generate a camera calibration checkerboard as a print-exact PDF. Set square size, rows and columns for OpenCV findChessboardCorners. Free, in your browser."
h1: "Checkerboard pattern generator"
faq:
  - q: "What are inner corners?"
    a: "Inner corners are the intersections inside the pattern grid. A 7×10 board has 6×9 = 54 inner corners. OpenCV's findChessboardCorners detects these points."
  - q: "When should I use a checkerboard instead of ChArUco?"
    a: "When the entire board is always visible in every image. Checkerboard corner detection is slightly more accurate than ChArUco because there are no marker artifacts."
  - q: "What square size should I use?"
    a: "Larger squares are easier to detect from further away. 25–30 mm works for desktop setups; 40–50 mm for robot cells. Match the square size to your working distance."
  - q: "Which numbers do I pass to findChessboardCorners?"
    a: "The inner corners, columns first. A board of 10 by 7 squares has 9 by 6 inner corners, so the pattern size is (9, 6). The opencv.json file from the generator contains this pair."
  - q: "Should the board have an odd and an even side?"
    a: "Yes, if you can. A board with an even number of squares along one side and an odd number along the other, such as 10 by 7, looks different when turned by 180°, so the corner order is the same in every image."
  - q: "Can I use the checkerboard commercially?"
    a: "Yes. Patterns you generate here are free to use for any purpose, including commercial products and client work. No sign-up and no attribution needed."
---

## What it does

Generate classic black-and-white checkerboard calibration patterns for use with OpenCV's `cv::findChessboardCorners`. The checkerboard is the simplest and most widely supported calibration pattern, offering the highest sub-pixel corner accuracy when the full board is visible.

## How to use it

1. **Rows and columns**: the number of squares. The page opens with 7 × 10 squares of 20 mm, which fits one A4 or Letter page.

2. **Square size**: in millimeters.

3. **Download** the PDF and print at 100 % (no "fit to page"). Check the 100 mm scale bar with a ruler, then measure one square and use the measured size in your code.

The config files give the grid for OpenCV, Kalibr, ROS 2 and HALCON.

## Ready-made boards

The name opens the generator with the board filled in. The PDF links download the same file, ready to print at 100 % ("actual size").

- [7 × 10 squares, 20 mm: one A4 or Letter page](/tools/generator/checkerboard/?rows=7&cols=10&square=20) · PDF: [A4](/files/patterns/checkerboard-7x10-20mm-a4.pdf), [Letter](/files/patterns/checkerboard-7x10-20mm-letter.pdf)
- [6 × 9 squares, 22 mm: one A4 or Letter page](/tools/generator/checkerboard/?rows=6&cols=9&square=22) · PDF: [A4](/files/patterns/checkerboard-6x9-22mm-a4.pdf), [Letter](/files/patterns/checkerboard-6x9-22mm-letter.pdf)
- [7 × 10 squares, 25 mm: one A3 or Tabloid page](/tools/generator/checkerboard/?rows=7&cols=10&square=25&paper=A3) · PDF: [A3](/files/patterns/checkerboard-7x10-25mm-a3.pdf), [Tabloid](/files/patterns/checkerboard-7x10-25mm-tabloid.pdf)
- [7 × 10 squares, 30 mm: one A3 page](/tools/generator/checkerboard/?rows=7&cols=10&square=30&paper=A3) · PDF: [A3](/files/patterns/checkerboard-7x10-30mm-a3.pdf)

The page keeps a white margin of one square around the pattern, because the detector needs it.

## Detect it with OpenCV

OpenCV counts inner corners, not squares, and takes the columns first. For the 7 × 10 board:

```python
import cv2

gray = cv2.imread("view.png", cv2.IMREAD_GRAYSCALE)
found, corners = cv2.findChessboardCornersSB(gray, (9, 6))
```

`corners` holds the 54 inner corners row by row, starting at the top left.

## Free for commercial use

Patterns from this generator are free to use for any purpose: internal, educational or commercial. No sign-up and no attribution needed.

## Paper or a rigid board?

A paper print is fine for learning and quick checks. It bows and stretches, and that ends up in your calibration: see [why a printed target costs you 0.5 px](/guides/printed-target-costs-half-a-pixel/).

For results you rely on, the [checkerboard on aluminum composite](/targets/checkerboard-composite/) stays flat and is measured before it ships.

## Related guides

- [ChArUco vs checkerboard vs AprilGrid](/guides/charuco-vs-checkerboard-vs-aprilgrid/) — choosing the right pattern
- [Corner detection troubleshooting](/guides/corner-detection-troubleshooting/) — when findChessboardCorners returns false
- [OpenCV camera calibration](/guides/opencv-camera-calibration/) — the whole procedure
