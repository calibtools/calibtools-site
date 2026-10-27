---
seoTitle: "Pattern generator — free calibration PDF"
seoDescription: "Generate print-exact calibration patterns as PDF, SVG, PNG, DXF with OpenCV, Kalibr and ROS config. Checkerboard, ChArUco, AprilGrid, circles. Free."
h1: "Pattern generator"
faq:
  - q: "Is the PDF output dimensionally accurate?"
    a: "Yes. The PDF is rendered in millimetre units at 1:1 scale. Print without fit-to-page scaling and verify with the 100 mm scale bar."
  - q: "Which ArUco dictionaries are supported?"
    a: "DICT_6X6_250, DICT_5X5_100, DICT_4X4_50, DICT_APRILTAG_36h11 and DICT_ARUCO_ORIGINAL. These match the constants in cv::aruco."
  - q: "Can I use the generated pattern commercially?"
    a: "Yes. The generated files are yours. There is no licence restriction on the output."
  - q: "Does the generator upload my data?"
    a: "No. Everything runs in your browser. No images, files or parameters leave your machine."
  - q: "What is the Start ID field?"
    a: "Start ID sets the first ArUco marker ID on the board. Use it when you need multiple boards with non-overlapping IDs in the same scene."
  - q: "Ordering several boards for one rig?"
    a: "Use the \"Board set\" option on the product page to select how many boards you need. Each board gets consecutive marker IDs so they work together in multi-board calibration. You can also override start IDs for each board."
---

## What it does

The pattern generator creates calibration targets and exports them with matching config files. Supported pattern types:

- Checkerboard, ChArUco, AprilGrid (Kalibr format)
- Asymmetric circles, symmetric circles, ArUco grid, HALCON-style dots

Export formats include 1:1 PDF for printing, 300 dpi PNG for documentation, raw SVG, and DXF for CNC or laser cutting. Config files are generated for OpenCV JSON, Kalibr YAML, ROS 2 YAML and HALCON .descr format.

## How to use it

**Pattern** — select the target type. ChArUco is the most common choice for OpenCV workflows; use AprilGrid for Kalibr camera–IMU calibration.

**Rows and Columns** — set the internal grid dimensions. A 7 × 10 board means 7 rows and 10 columns of squares.

**Square size and Marker size** — enter the dimensions in millimetres. Marker size must be smaller than square size for ChArUco boards. These values go directly into your calibration config.

**Dictionary** — choose the ArUco dictionary. DICT_6X6_250 is the default and works for most setups. Use DICT_APRILTAG_36h11 for AprilGrid boards.

**Page / board** — select the output page size (A4, A3 or Letter). The generator warns you if the board does not fit.

**Start ID** — offset the first marker ID. Useful for multi-board setups where each board needs unique IDs.

## Worked example

A common stereo rig setup: select ChArUco, 7 × 10, 25 mm squares, 18 mm markers, DICT_6X6_250, A3 page. Click PDF (1:1), print on A3 without scaling, and verify the 100 mm scale bar with a ruler. Download the `opencv.json` config and pass it to `cv2.aruco.CharucoBoard`.

## Related guides

- [ChArUco vs checkerboard vs AprilGrid](/guides/charuco-vs-checkerboard-vs-aprilgrid/) — which pattern for which job
- [A printed target costs half a pixel](/guides/printed-target-costs-half-a-pixel/) — why paper targets limit accuracy
