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

**Accuracy** — choose high (< 0.1 px), medium (< 0.5 px) or low (< 1 px). High accuracy steers toward a rigid aluminum composite board instead of paper.

**Camera** — mono, stereo, fisheye or multi-camera. Stereo and multi-camera setups favour ChArUco or AprilGrid because partial views are common.

**Environment** — indoor, outdoor or both. Outdoor use requires materials rated for temperature and UV exposure.

**Toolchain** — OpenCV, ROS, Kalibr, HALCON, MATLAB or other. This affects the recommended pattern type (e.g., AprilGrid for Kalibr, a checkerboard for MATLAB and printed HALCON setups).

**Camera setup (optional)** — pick your sensor and enter the focal length and working distance. The wizard then sizes the squares so the board covers about half the field of view. Skip it to get default sizes.

## Worked example

A stereo rig for industrial inspection at medium accuracy, indoors, using OpenCV: the wizard recommends a 7 × 10 ChArUco board with DICT_6X6_250 markers on A3. Add the camera setup to size the squares for your distance, then click "Generate this pattern" to open it in the generator.

## Related guides

- [Camera calibration with OpenCV](/guides/opencv-camera-calibration/) — the full procedure, step by step

- [FOV calculator](/tools/fov/) — field of view, focal length and board size for your camera

- [Ceramic datasheet](/files/datasheets/CT-DS-CHA-C.pdf) — feature tolerance and flatness for ceramic targets
