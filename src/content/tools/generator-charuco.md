---
seoTitle: "ChArUco board generator — free PDF, OpenCV"
seoDescription: "Generate a ChArUco calibration board as a 1:1 PDF, SVG or DXF with OpenCV, ROS 2 and HALCON config files. Choose dictionary, grid and sizes. Free to use."
h1: "ChArUco board generator"
faq:
  - q: "What is a ChArUco board?"
    a: "A ChArUco board combines a checkerboard with ArUco markers in the white squares. It allows sub-pixel corner detection even when the board is partially occluded."
  - q: "Why use ChArUco instead of a plain checkerboard?"
    a: "ChArUco boards work with partial views — if some corners are outside the frame, the markers identify which corners are visible. This makes them ideal for stereo, multi-camera and wide-angle setups."
  - q: "Which dictionary should I use?"
    a: "DICT_6X6_250 is the most common. It has 250 unique markers with 6×6 bit patterns, which is enough for any standard board and provides good detection robustness."
  - q: "Can I use the board commercially?"
    a: "Yes. Boards you generate here are free to use for any purpose, including commercial products, production lines and client work. No sign-up and no attribution needed."
  - q: "Does it work with Kalibr?"
    a: "Kalibr has no ChArUco target model, so no Kalibr file is generated for ChArUco. For camera–IMU calibration with Kalibr, use the AprilGrid generator."
  - q: "My board was made with an older OpenCV version. Why are no corners found?"
    a: "OpenCV 4.6 changed the marker layout for boards with an even number of rows. Call board.setLegacyPattern(True) for boards made with the old layout, or tick the legacy layout option here when printing."
---

## What it does

Generate ChArUco calibration patterns — checkerboard grids with embedded ArUco markers for partial-view detection. ChArUco is the recommended pattern for OpenCV-based stereo and multi-camera calibration because markers allow corner identification even when the board edges are outside the frame.

The PDF prints at 1:1 with a 100 mm scale bar, so you can check the printed size with a ruler before you calibrate.

## How to use it

Set the grid in squares (7 × 10 is a good default), the square and marker sizes in millimeters, and the ArUco dictionary. The page opens with a 7 × 10 board of 20 mm squares, which fits one A4 or Letter page. A marker about 70–75 % of the square works well.

Download the PDF and print at 100 % ("actual size"). Measure the scale bar and one square, then use the measured square size in your code.

Not sure how big the board should be? The [FOV calculator](/tools/fov/) recommends a board size for your camera, lens and working distance.

## Ready-made boards

The name opens the generator with the board filled in. The PDF links download the same file, ready to print at 100 % ("actual size").

- [7 × 10 squares, 20 mm, DICT_6X6_250: one A4 or Letter page](/tools/generator/charuco/?rows=7&cols=10&square=20&marker=15&dict=DICT_6X6_250) · PDF: [A4](/files/patterns/charuco-7x10-20mm-6x6-250-a4.pdf), [Letter](/files/patterns/charuco-7x10-20mm-6x6-250-letter.pdf)
- [5 × 7 squares, 25 mm, DICT_6X6_250: one A4 or Letter page](/tools/generator/charuco/?rows=5&cols=7&square=25&marker=18&dict=DICT_6X6_250) · PDF: [A4](/files/patterns/charuco-5x7-25mm-6x6-250-a4.pdf), [Letter](/files/patterns/charuco-5x7-25mm-6x6-250-letter.pdf)
- [7 × 10 squares, 25 mm, DICT_6X6_250: one A3 page](/tools/generator/charuco/?rows=7&cols=10&square=25&marker=18&dict=DICT_6X6_250&paper=A3) · PDF: [A3](/files/patterns/charuco-7x10-25mm-6x6-250-a3.pdf)
- [7 × 10 squares, 25 mm, DICT_6X6_250: one Tabloid page](/tools/generator/charuco/?rows=7&cols=10&square=25&marker=18&dict=DICT_6X6_250&paper=Tabloid) · PDF: [Tabloid](/files/patterns/charuco-7x10-25mm-6x6-250-tabloid.pdf)

The page keeps a white margin of one square around the pattern, because the detector needs it. That is why a 7 × 10 board of 25 mm squares, 250 × 175 mm, does not fit an A4 page.

## Files you get

- **PDF, SVG, PNG and DXF** — the pattern at 1:1 in millimeters.

- **opencv.json** — rows, columns, square and marker size, dictionary and start ID for `cv2.aruco.CharucoBoard`.

- **ros2.yaml** — parameters for ROS 2 `camera_calibration` with the ChArUco pattern.

- **halcon.txt** — the inner corners as a 3D point tuple for HALCON's `set_calib_data_calib_object`.

Corner order follows OpenCV: row-major over the inner corners, origin at the top-left square corner, x right, y down.

## Detect it with OpenCV

OpenCV 4.7 and later, Python. Columns come first in the board size:

```python
import cv2
d = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_6X6_250)
# (cols, rows), square and marker size in meters
board = cv2.aruco.CharucoBoard((10, 7), 0.025, 0.018, d)
```

Then, for each image:

```python
detector = cv2.aruco.CharucoDetector(board)
corners, ids, _, _ = detector.detectBoard(gray)
obj_pts, img_pts = board.matchImagePoints(corners, ids)
```

Collect `obj_pts` and `img_pts` over 15–30 views at different tilts and positions, then pass them to `cv2.calibrateCamera`.

## Free for commercial use

Boards from this generator are free to use for any purpose: internal, educational or commercial, including products, production lines and client work. No sign-up and no attribution needed.

## Paper or a rigid board?

A printed sheet is fine for a first test. Paper stretches with humidity and does not stay flat, and office printers scale slightly.

For repeatable sub-pixel results a rigid, measured board is worth it. See the [ChArUco aluminum composite board](/targets/charuco-composite/) and the [ChArUco ceramic target](/targets/charuco-ceramic/).

## Related guides

- [ChArUco vs checkerboard vs AprilGrid](/guides/charuco-vs-checkerboard-vs-aprilgrid/) — when to use each pattern

- [Multiple boards in one rig](/guides/multi-board-marker-ids/) — keeping marker IDs distinct
