---
seoTitle: "AprilTag generator — 36h11 PDF, SVG"
seoDescription: "Generate AprilTag markers: tag36h11, tag25h9 and tag16h5. One tag or a sheet of IDs, print-exact PDF, SVG and PNG for apriltag, OpenCV and ROS. Free."
h1: "AprilTag generator"
faq:
  - q: "Which AprilTag family should I use?"
    a: "tag36h11 is the standard choice: 587 IDs and very few false detections. tag25h9 and tag16h5 have larger bits, so they detect at longer range, but they have fewer IDs and more false positives."
  - q: "One or two border bits?"
    a: "Use 1 for single tags. The apriltag library, ROS apriltag_ros and OpenCV's DICT_APRILTAG_36h11 all expect a one-cell black border. Kalibr AprilGrid boards use 2; for those, use the AprilGrid generator."
  - q: "What tag size do I enter in my detector?"
    a: "Enter the edge length of the black square, not including the white margin. That is the Marker size value in the generator."
  - q: "Can I use the tags commercially?"
    a: "Yes. Tags you generate here are free to use for any purpose, including commercial products and client work. No sign-up and no attribution needed."
  - q: "Does the generator upload anything?"
    a: "No. Tags are drawn in your browser. Nothing is sent to a server."
---

## What it does

Generate AprilTag fiducial markers for robot localisation, drone landing pads and camera pose estimation. Print one tag or a sheet of consecutive IDs, at exact size in millimetres, as PDF, SVG or PNG.

## How to use it


1. **Tag family**: tag36h11 unless your code expects another family.

2. **Border bits**: 1 for the apriltag library, ROS and OpenCV. Use 2 only if your detector is configured for it.

3. **Start ID or ID list**: one ID, or a list such as `0-9,15,20-24`.

4. **Rows and columns**: 1 × 1 for a single tag, more for a sheet.

5. **Marker size**: the black square edge in millimetres, the value you pass to the detector as the tag size.

6. **Download** the PDF and print at 100 % (no "fit to page"). Check the 100 mm scale bar with a ruler.

## Supported families

| Family | Data bits | Tags | Good for |
|---|---|---|---|
| tag36h11 | 6 × 6 | 587 | Default for apriltag, ROS and Kalibr |
| tag25h9 | 5 × 5 | 35 | Longer range, few IDs |
| tag16h5 | 4 × 4 | 30 | Longest range, most false positives |

## Detect the tags

With the apriltag Python bindings:

```python
from pupil_apriltags import Detector
detector = Detector(families="tag36h11")
tags = detector.detect(gray, estimate_tag_pose=True,
                       camera_params=(fx, fy, cx, cy), tag_size=0.10)
```

With OpenCV, use `cv2.aruco.DICT_APRILTAG_36h11` and the default one-bit border.

## Free for commercial use

Tags from this generator are free to use for any purpose, including commercial work. That is different from some other online generators: calib.io's pattern generator page (checked November 2026) limits its output to internal development or educational use.

## Related

- Calibrating a camera and IMU with Kalibr? Use the [AprilGrid generator](/tools/generator/aprilgrid/).
- Using ArUco instead? See the [ArUco marker generator](/tools/generator/aruco/).
- [ChArUco vs checkerboard vs AprilGrid](/guides/charuco-vs-checkerboard-vs-aprilgrid/)
