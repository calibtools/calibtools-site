---
seoTitle: "Checkerboard pattern generator — free calibration PDF"
seoDescription: "Generate checkerboard calibration patterns as print-exact PDF. Standard pattern for OpenCV cv::findChessboardCorners. Free, runs in your browser."
h1: "Checkerboard pattern generator"
faq:
  - q: "What are inner corners?"
    a: "Inner corners are the intersections inside the pattern grid. A 7×10 board has 6×9 = 54 inner corners. OpenCV's findChessboardCorners detects these points."
  - q: "When should I use a checkerboard instead of ChArUco?"
    a: "When the entire board is always visible in every image. Checkerboard corner detection is slightly more accurate than ChArUco because there are no marker artifacts."
  - q: "What square size should I use?"
    a: "Larger squares are easier to detect from further away. 25–30 mm works for desktop setups; 40–50 mm for robot cells. Match the square size to your working distance."
---

## What it does

Generate classic black-and-white checkerboard calibration patterns for use with OpenCV's `cv::findChessboardCorners`. The checkerboard is the simplest and most widely supported calibration pattern, offering the highest sub-pixel corner accuracy when the full board is visible.

## How to use it

Set pattern to **Checkerboard**, configure rows, columns and square size. Download the PDF and print at 1:1 scale. The config files provide the grid parameters for OpenCV, Kalibr, ROS 2 and HALCON.

## Related guides

- [ChArUco vs checkerboard vs AprilGrid](/guides/charuco-vs-checkerboard-vs-aprilgrid/) — choosing the right pattern
