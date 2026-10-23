---
seoTitle: "Calibration quality analyzer — reprojection error, coverage, diagnostics"
seoDescription: "Paste your OpenCV calibration results and get a quality report: reprojection error analysis, parameter correlation, coverage assessment and actionable findings."
h1: "Calibration quality analyzer"
faq:
  - q: "What input format does it accept?"
    a: "OpenCV-style JSON with camera_matrix, dist_coeffs, per_view_errors and image dimensions. The format matches the output of cv::calibrateCamera."
  - q: "What is a good reprojection error?"
    a: "Below 0.3 px is excellent for composite boards. Below 0.1 px is achievable with ceramic targets. Above 1 px usually indicates a problem."
  - q: "What do the findings mean?"
    a: "Each finding has a severity (info, warning, error) and a plain-language explanation. Warnings suggest improvements; errors indicate problems that should be fixed before using the calibration."
  - q: "Does it recalibrate my camera?"
    a: "No. It analyses existing calibration results. To recalibrate, use OpenCV, Kalibr or your preferred toolchain."
---

## What it does

The quality analyzer parses your calibration output (camera matrix, distortion coefficients, per-view reprojection errors) and produces a report with an overall grade (excellent, good, fair, poor), per-view error analysis, distortion coefficient review, and actionable findings. It flags issues like insufficient image count, high per-view error outliers, unusual distortion values and poor coverage.

## How to use it

**Input** — paste the JSON output of your calibration. The expected fields are `camera_matrix` (3 × 3), `dist_coeffs` (5 or more coefficients), `per_view_errors` (array of RMS errors per image), `rms_error`, `image_width`, `image_height` and `image_count`. Click "Load example" for a sample.

**Report** — the output panel shows the overall grade, a per-view error chart, and a list of findings sorted by severity.

## Worked example

After calibrating with 15 images of a ChArUco board, paste your OpenCV JSON result. The analyzer reports RMS 0.155 px (excellent), flags that 15 images is adequate but 20+ would improve corner coverage, and notes that k3 is near zero (suggesting a simpler distortion model would suffice).

## Related guides

- [A printed target costs half a pixel](/guides/printed-target-costs-half-a-pixel/) — why substrate quality affects reprojection error
