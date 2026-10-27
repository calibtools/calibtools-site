---
seoTitle: "Target selection wizard — find your board"
seoDescription: "Answer five questions about your application, accuracy, camera, environment and toolchain to get a calibration target recommendation. Free, no signup."
h1: "Target selection wizard"
faq:
  - q: "How many questions does the wizard ask?"
    a: "Five: application type, accuracy requirement, camera type, environment and calibration toolchain. It takes about 30 seconds."
  - q: "Can I go back and change an answer?"
    a: "Yes. Use the back button to revisit any step. Your previous answers are preserved."
  - q: "What accuracy levels are available?"
    a: "High (< 0.1 px reprojection error, for metrology), medium (< 0.5 px, most industrial and robotics), and low (< 1 px, prototyping)."
  - q: "Does the wizard recommend a specific product?"
    a: "Yes. The result includes a pattern type, size, material and a direct link to order. Recommendations are based on the combination of all five answers."
---

## What it does

The selection wizard guides you through five questions — application, accuracy need, camera type, environment and calibration toolchain — and produces a recommendation: pattern type, board size, material and a matching product link.

It handles edge cases like fisheye lenses (which favour ChArUco for partial views) and outdoor environments (which need weather-resistant materials).

## How to use it

**Application** — select your domain: robotics, industrial inspection, automotive/ADAS, drone/aerial, medical imaging, research or other. This narrows the pattern and material options.

**Accuracy** — choose high (< 0.1 px), medium (< 0.5 px) or low (< 1 px). High accuracy steers toward ceramic or glass substrates with tighter feature tolerances.

**Camera** — mono, stereo, fisheye or multi-camera. Stereo and multi-camera setups favour ChArUco or AprilGrid because partial views are common.

**Environment** — indoor, outdoor or both. Outdoor use requires materials rated for temperature and UV exposure.

**Toolchain** — OpenCV, ROS, Kalibr, HALCON, MATLAB or other. This affects the recommended pattern type (e.g., AprilGrid for Kalibr, HALCON dots for HALCON).

## Worked example

A stereo rig for industrial inspection at medium accuracy, indoors, using OpenCV: the wizard recommends a ChArUco board, 300 × 200 mm, aluminium composite, DICT_6X6_250. Click "Order this board" to go directly to the product page with the right variant preselected.

## Related guides

- [Composite, ceramic or glass?](/guides/composite-ceramic-or-glass/) — materials compared
