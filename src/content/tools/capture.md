---
seoTitle: "Capture assistant — guided calibration image capture with 15 poses"
seoDescription: "Guided calibration image capture with 15 poses for optimal coverage. Uses your webcam, no uploads. Captures saved as PNG for OpenCV, ROS or Kalibr."
h1: "Capture assistant"
faq:
  - q: "What camera does it use?"
    a: "Your device's webcam via WebRTC. No external software needed. The browser asks for camera permission."
  - q: "How many images should I capture?"
    a: "The assistant guides you through 15 poses. This provides good coverage of the image corners, center, and tilted views for both radial and tangential distortion estimation."
  - q: "Where are the images saved?"
    a: "Images are saved as PNG files in your browser's download folder. Nothing is uploaded to any server."
  - q: "Can I use an external camera?"
    a: "If the camera appears as a webcam device (USB UVC), yes. Industrial cameras with proprietary SDKs are not supported — use their capture software instead."
---

## What it does

The capture assistant uses your webcam to guide you through 15 calibration poses that provide optimal frame coverage. Each pose instructs you where to hold the board — center, corners, close, far and tilted — following best practices for camera calibration.

Captured images are saved as PNG files for use with OpenCV, ROS, Kalibr or any calibration toolchain.

## How to use it

**Start camera** — click to grant webcam access. The live preview appears with an FPS counter.

**Follow the poses** — the assistant shows the current pose instruction (e.g., "Hold the target flat, centered in frame"). Position the board as described and click capture. The progress bar advances through all 15 poses.

**Review** — captured images appear as thumbnails below the video. Each is labeled with the pose name and timestamp.

**Download** — images are saved as PNG. Use them with your calibration toolchain's image loading pipeline.

## Worked example

Mount a ChArUco board on a flat surface. Start the camera, capture "Center" at roughly 500 mm distance, then follow the 14 remaining poses: close-up, far, four corners, four tilts, and three combined positions. Load the 15 images into `cv2.calibrateCamera` with the matching board config from the pattern generator.

## Related guides

- [ChArUco vs checkerboard vs AprilGrid](/guides/charuco-vs-checkerboard-vs-aprilgrid/) — choose your pattern before capturing
