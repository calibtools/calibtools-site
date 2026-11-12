---
seoTitle: "ArUco marker generator — free PDF, SVG"
seoDescription: "Generate ArUco markers for OpenCV: DICT_4X4_50 to DICT_7X7_1000 and ARUCO_ORIGINAL. One marker or a full sheet, print-exact PDF, SVG and PNG. Free, no sign-up."
h1: "ArUco marker generator"
faq:
  - q: "Which dictionary should I use?"
    a: "DICT_4X4_50 is the easiest to detect at long range or low resolution because each bit is large. DICT_6X6_250 is the common default in OpenCV examples and gives more IDs with fewer false detections. Use the same dictionary in your detector."
  - q: "How big should I print the marker?"
    a: "Each bit should cover at least 5 to 10 pixels in your image. For a 6x6 marker (8 cells across with the border), a 100 mm marker gives 12.5 mm cells, which is enough for most webcams at 1 to 2 m."
  - q: "Do I need a white border around the marker?"
    a: "Yes. Leave a white quiet zone of at least one cell width around each marker. The generator keeps a 20% gap between markers on a sheet; when you cut markers out, keep that margin."
  - q: "Can I use the markers commercially?"
    a: "Yes. Markers you generate here are free to use for any purpose, including commercial products and client work. No sign-up and no attribution needed."
  - q: "Will these markers work with OpenCV 4.7 and later?"
    a: "Yes. The bit patterns match OpenCV's predefined dictionaries and are drawn with the standard one-cell black border, so cv2.aruco.ArucoDetector finds them with default parameters. We check this by detecting generated sheets with OpenCV."
  - q: "Does the generator upload anything?"
    a: "No. Markers are drawn in your browser. Nothing is sent to a server."
---

## What it does

Generate ArUco fiducial markers for OpenCV pose estimation, robot localization and AR. Print one large marker or a sheet of consecutive IDs, at exact size in millimeters, as PDF, SVG or PNG.

## How to use it


1. **Dictionary**: pick the ArUco dictionary your code uses, for example `DICT_6X6_250`.

2. **Start ID or ID list**: enter one ID, or a list such as `0-9,15,20-24`.

3. **Rows and columns**: 1 × 1 for a single marker, more for a sheet.

4. **Marker size**: the black square edge in millimeters. This is the marker length you use for pose estimation with `solvePnP`.

5. **Download** the PDF and print at 100 % (no "fit to page"). Check the 100 mm scale bar with a ruler.

## Ready-made sheets

Each link opens the generator with the sheet filled in. All of them fit on one A4 or Letter page at 100 %.

- [One DICT_6X6_250 marker, ID 0, 100 mm](/tools/generator/aruco/?rows=1&cols=1&marker=100&dict=DICT_6X6_250&startId=0)
- [Six DICT_4X4_50 markers, IDs 0 to 5, 60 mm](/tools/generator/aruco/?rows=3&cols=2&marker=60&dict=DICT_4X4_50&startId=0)
- [Twelve DICT_5X5_100 markers, IDs 0 to 11, 40 mm](/tools/generator/aruco/?rows=4&cols=3&marker=40&dict=DICT_5X5_100&startId=0)
- [Twenty-four DICT_6X6_250 markers, IDs 0 to 23, 30 mm](/tools/generator/aruco/?rows=6&cols=4&marker=30&dict=DICT_6X6_250&startId=0)

Change the start ID to continue a set: a second sheet of six starts at ID 6.

## Supported dictionaries

| Dictionary | Bits | Markers | Good for |
|---|---|---|---|
| DICT_4X4_50 | 4 × 4 | 50 | Long range, low resolution |
| DICT_5X5_100 | 5 × 5 | 100 | General use |
| DICT_6X6_250 | 6 × 6 | 250 | OpenCV default, fewer false positives |
| DICT_7X7_1000 | 7 × 7 | 1000 | Many unique IDs, close range |
| DICT_ARUCO_ORIGINAL | 5 × 5 | 1024 | Legacy ArUco projects |
| DICT_ARUCO_MIP_36h12 | 6 × 6 | 250 | High inter-marker distance |

Each marker has a one-cell black border around the data bits, as `cv2.aruco.generateImageMarker` draws it.

## Detect the markers in OpenCV

```python
import cv2
dictionary = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_6X6_250)
detector = cv2.aruco.ArucoDetector(dictionary, cv2.aruco.DetectorParameters())
corners, ids, rejected = detector.detectMarkers(gray)
```

For pose, use the printed marker size in meters or millimeters consistently in `solvePnP`.

## Free for commercial use

Markers from this generator are free to use for any purpose: internal, educational or commercial, including products and client work. No sign-up and no attribution needed.

## Paper or a rigid board?

Printed markers are fine for pose estimation and quick tests. For camera calibration, where the marker positions have to be known to a fraction of a millimeter, use a rigid board: the [ChArUco composite board](/targets/charuco-composite/) combines ArUco markers with chessboard corners.

## Related

- Need a calibration board rather than single markers? Use the [ChArUco generator](/tools/generator/charuco/).
- Using AprilTag instead? See the [AprilTag generator](/tools/generator/apriltag/).
- [ChArUco vs checkerboard vs AprilGrid](/guides/charuco-vs-checkerboard-vs-aprilgrid/)
