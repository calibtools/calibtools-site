---
seoTitle: "Format converter — OpenCV, Kalibr, ROS"
seoDescription: "Convert calibration target configs between OpenCV JSON, Kalibr YAML, ROS 2 camera_info YAML and HALCON .descr. Paste, convert, download. Free, in your browser."
h1: "Format converter"
faq:
  - q: "Which formats are supported?"
    a: "OpenCV JSON, Kalibr YAML, ROS 2 YAML and HALCON .descr. The converter auto-detects the input format."
  - q: "Does it convert camera intrinsics?"
    a: "No. This tool converts calibration target configuration files (pattern geometry and dimensions), not camera matrices or distortion coefficients."
  - q: "Can I batch-convert multiple files?"
    a: "Not yet. Paste one config at a time. [CHECK] Batch mode may be added later."
  - q: "Is the output deterministic?"
    a: "Yes. The same input always produces the same output. The converter does not add timestamps or random values."
---

## What it does

The format converter takes a calibration target config in any supported format — OpenCV JSON, Kalibr YAML, ROS 2 YAML or HALCON .descr — and converts it to any other.

It auto-detects the input format, parses the pattern type, grid dimensions, square and marker sizes, dictionary and start ID, then serialises the result in the target format.

## How to use it

**Input** — paste your config file content or click "Load example" to populate a sample ChArUco config.

**Target format** — select the output format from the dropdown. The converter runs instantly.

**Download** — click to save the converted file with the correct extension (.opencv.json, .kalibr.yaml, .ros2.yaml or .halcon.descr).

## Worked example

You have a Kalibr YAML from an existing camera–IMU calibration and need the same board description for OpenCV: paste the YAML, select "OpenCV JSON", and download. The grid dimensions, square sizes and dictionary are preserved exactly.

## Related guides

- [ChArUco vs checkerboard vs AprilGrid](/guides/charuco-vs-checkerboard-vs-aprilgrid/) — choosing the right pattern before converting
