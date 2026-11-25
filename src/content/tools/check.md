---
seoTitle: "Detection check — which markers are read"
seoDescription: "Open a photo of a ChArUco, ArUco or AprilGrid board and see which markers and corners OpenCV reads. Runs in your browser; the photo is not uploaded."
h1: "Detection check"
faq:
  - q: "What does the detection check use?"
    a: "OpenCV 4.12 compiled to WebAssembly, running in your browser: cv::aruco::ArucoDetector for ArUco grids, AprilGrids and marker sheets, and cv::aruco::CharucoDetector for ChArUco boards."
  - q: "Which patterns can it check?"
    a: "Patterns with markers: ChArUco, ArUco grid, AprilGrid and marker sheets, in every dictionary and tag family the generator offers. Checkerboards and circle grids are not checked here; Plumbline, our desktop app, detects both."
  - q: "Does my image get uploaded?"
    a: "No. The photo stays in your browser. The detector is loaded from calib.tools and runs on your device."
  - q: "Why are some markers not read?"
    a: "Common causes: motion blur, uneven light or glare, a board that is small in the frame, or settings that do not match the board (rows, columns, dictionary or tag family, border bits, start ID)."
  - q: "Which image formats work?"
    a: "JPEG and PNG. A photo with a longer side above 2400 pixels is scaled down to that size for the check."
---

## What it does

The detection check looks for the markers of your pattern in a photo and tells you which ones OpenCV reads. Every marker it reads is outlined on the photo with its ID. On a ChArUco board it also places the inner corners and counts them.

The result lists the IDs that were not read, and any IDs that were read but do not belong to the pattern, which points to a wrong start ID or the wrong number of rows and columns.

It checks patterns with markers: ChArUco, ArUco grid, AprilGrid and marker sheets. Checkerboards and circle grids are not checked in the browser; [Plumbline](/plumbline/) detects both.

## How to use it

**Pattern settings** — set the pattern type, rows, columns, dictionary or tag family, border bits and start ID of your board. If the pattern came from the [generator](/tools/generator/), choose **Take settings from opencv.json** and pick the file that was downloaded with it; every setting is filled in from the file.

**Photo** — drop a JPEG or PNG on the page or choose one. The first check loads the detector (about 11 MB), which the browser keeps for later checks.

**Result** — green outlines are markers of your pattern, red outlines are markers the pattern does not have. Change a setting and choose **Check again** to run the same photo with the new settings.

## Worked example

You printed a 7 × 10 ChArUco board, 25 mm squares, 18 mm markers, DICT_6X6_250, on A3. Take a photo with your phone, set 7 × 10, 25 mm, 18 mm and DICT_6X6_250, and open the photo.

A good photo reads all 35 markers and all 54 inner corners. If some are missing, the result names their IDs: look at that part of the board for glare, blur or a fold.

## Related guides

- [Why your calibration board is not detected](/calibacademy/corner-detection-troubleshooting/) — measured limits for bit size, blur, tilt, exposure and glare, and the board-definition mistakes
- [Composite board datasheet](/files/datasheets/CT-DS-CHA-P.pdf) — feature tolerance and flatness of the board
