---
seoTitle: "Format converter — OpenCV, Kalibr, ROS"
seoDescription: "Convert calibration target configs between OpenCV JSON, Kalibr YAML and ROS 2 YAML, or export HALCON point tuples. Paste, convert, download. Free, in-browser."
h1: "Format converter"
faq:
  - q: "Which formats are supported?"
    a: "Input: OpenCV JSON, Kalibr YAML and ROS 2 YAML, detected automatically. Output: those three plus HALCON HDevelop code with the corner points as a tuple."
  - q: "Why can't I convert a ChArUco board to Kalibr?"
    a: "Kalibr has no ChArUco target model; it supports AprilGrid, checkerboard and circle grids. For camera–IMU calibration with Kalibr, use an AprilGrid."
  - q: "Does it convert camera intrinsics?"
    a: "No. This tool converts calibration target configuration files (pattern geometry and dimensions), not camera matrices or distortion coefficients."
  - q: "Can I batch-convert multiple files?"
    a: "Not yet. Paste one config at a time. Batch mode may be added later."
  - q: "Is the output deterministic?"
    a: "Yes. The same input always produces the same output. The converter does not add timestamps or random values."
---

## What it does

The format converter takes a calibration target config in OpenCV JSON, Kalibr YAML or ROS 2 YAML and converts it to another of these formats, or to HALCON HDevelop code.

It auto-detects the input format, parses the pattern type, grid dimensions, square and marker sizes, dictionary and start ID, then serialises the result in the target format.

## How to use it

**Input** — paste your config file content or click "Load example" to populate a sample ChArUco config.

**Target format** — select the output format from the dropdown. The converter runs instantly.

**Download** — click to save the converted file with the correct extension (.opencv.json, .kalibr.yaml, .ros2.yaml or .halcon.txt).

## Conventions

Kalibr counts checkerboard rows and columns as inner corners; OpenCV JSON counts squares. A 7 × 10 board is `targetRows: 6`, `targetCols: 9` in Kalibr. The converter handles the offset both ways.

HALCON's `.descr` files describe only MVTec circle plates. For checkerboard and ChArUco boards the converter writes the inner corners as a 3D point tuple for `set_calib_data_calib_object`.

## Worked example

You have a Kalibr checkerboard YAML from an existing setup and need the same board for OpenCV: paste the YAML, select "OpenCV JSON", and download. The square counts and square size come out exactly.

## Related guides

- [ChArUco vs checkerboard vs AprilGrid](/guides/charuco-vs-checkerboard-vs-aprilgrid/) — choosing the right pattern before converting

