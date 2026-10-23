---
seoTitle: "Detection check — verify calibration pattern detection in your image"
seoDescription: "Upload a photo of your calibration board and see what OpenCV's detector finds. Overlay of detected corners and markers, in your browser, nothing uploaded."
h1: "Detection check"
faq:
  - q: "What does the detection check use?"
    a: "OpenCV.js compiled to WebAssembly, running in your browser. It uses cv::findChessboardCorners for checkerboards and cv::aruco for ChArUco and ArUco patterns."
  - q: "Does my image get uploaded?"
    a: "No. The image stays in your browser. OpenCV runs client-side via WebAssembly."
  - q: "Why are some corners not detected?"
    a: "Common causes: motion blur, uneven lighting, the board is too small in the frame, or the pattern parameters (rows, columns, dictionary) don't match the physical board."
  - q: "Which image formats work?"
    a: "JPEG and PNG. The image is loaded as an HTML Image element and drawn onto a canvas for OpenCV processing."
---

## What it does

The detection check loads OpenCV.js in your browser and runs the appropriate corner or marker detector on a photo of your calibration board. It draws an overlay of detected corners (green when all expected corners are found, yellow when partial), reports the number of corners or markers found versus expected, and gives a pass/fail status.

## How to use it

**Pattern settings** — select the same pattern type, rows, columns, square size, marker size and dictionary that match your physical board. Mismatched parameters will cause detection to fail even if the board is clearly visible.

**Upload** — drag and drop or click to select a JPEG or PNG image. The first run downloads OpenCV.js (~8 MB), which is cached for subsequent uses.

**Result** — the overlay shows detected corners with numbering. The status reports found vs expected and whether the detection passed.

## Worked example

You printed a 7 × 10 ChArUco, DICT_6X6_250 on A3. Take a photo with your phone, upload it, set 7 × 10 / 25 mm / 18 mm / DICT_6X6_250, and check that all 54 corners and 35 markers are detected. If some are missing, try improving lighting or moving the board closer.

## Related guides

- [A printed target costs half a pixel](/guides/printed-target-costs-half-a-pixel/) — detection failure often starts with print quality
