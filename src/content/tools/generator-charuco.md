---
seoTitle: "ChArUco generator — PDF with OpenCV config"
seoDescription: "Generate ChArUco calibration patterns with ArUco markers for OpenCV. Print-exact PDF, SVG, PNG and config files for partial-view detection. Free, in-browser."
h1: "ChArUco pattern generator"
faq:
  - q: "What is a ChArUco board?"
    a: "A ChArUco board combines a checkerboard with ArUco markers in the white squares. It allows sub-pixel corner detection even when the board is partially occluded."
  - q: "Why use ChArUco instead of a plain checkerboard?"
    a: "ChArUco boards work with partial views — if some corners are outside the frame, the markers identify which corners are visible. This makes them ideal for stereo, multi-camera and wide-angle setups."
  - q: "Which dictionary should I use?"
    a: "DICT_6X6_250 is the most common. It has 250 unique markers with 6×6 bit patterns, which is enough for any standard board and provides good detection robustness."
---

## What it does

Generate ChArUco calibration patterns — checkerboard grids with embedded ArUco markers for partial-view detection. ChArUco is the recommended pattern for OpenCV-based stereo and multi-camera calibration because markers allow corner identification even when the board edges are outside the frame.

## How to use it

Set the pattern type to **ChArUco**, configure your grid dimensions (7 × 10 is a good default), square and marker sizes in millimetres, and select your ArUco dictionary. Download the PDF, print at 1:1 scale, and use the matching `opencv.json` config file with `cv2.aruco.CharucoBoard`.

## Related guides

- [ChArUco vs checkerboard vs AprilGrid](/guides/charuco-vs-checkerboard-vs-aprilgrid/) — when to use each pattern
