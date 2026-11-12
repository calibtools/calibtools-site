---
seoTitle: "AprilTag generator — free tag36h11 PDF, SVG"
seoDescription: "Free online AprilTag generator: tag36h11, tag25h9 and tag16h5. One tag or a sheet of IDs as a print-exact PDF, SVG or PNG. No sign-up, runs in your browser."
h1: "AprilTag generator"
faq:
  - q: "Which AprilTag family should I use?"
    a: "tag36h11 is the standard choice: 587 IDs and very few false detections. tag25h9 and tag16h5 have larger bits, so they detect at longer range, but they have fewer IDs and more false positives."
  - q: "What does 36h11 mean?"
    a: "36 is the number of data bits, a 6 by 6 grid. h11 is the minimum Hamming distance: any two tags in the family differ in at least 11 bits, which is why tag36h11 gives very few false detections. The family has 587 tags, IDs 0 to 586."
  - q: "How large should I print an AprilTag?"
    a: "Large enough that each cell covers at least 5 to 10 pixels in your image. A tag36h11 tag is 8 cells across with its black border, so a 100 mm tag has 12.5 mm cells. The tag's width in pixels is the focal length in pixels times the tag size divided by the distance."
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

Generate AprilTag fiducial markers for robot localization, drone landing pads and camera pose estimation. Print one tag or a sheet of consecutive IDs, at exact size in millimeters, as PDF, SVG or PNG.

## How to use it


1. **Tag family**: tag36h11 unless your code expects another family.

2. **Border bits**: 1 for the apriltag library, ROS and OpenCV. Use 2 only if your detector is configured for it.

3. **Start ID or ID list**: one ID, or a list such as `0-9,15,20-24`.

4. **Rows and columns**: 1 × 1 for a single tag, more for a sheet.

5. **Marker size**: the black square edge in millimeters, the value you pass to the detector as the tag size.

6. **Download** the PDF and print at 100 % (no "fit to page"). Check the 100 mm scale bar with a ruler.

## Ready-made sheets

Each link opens the generator with the sheet filled in. All of them fit on one A4 or Letter page at 100 %.

- [One tag36h11 tag, ID 0, 100 mm](/tools/generator/apriltag/?rows=1&cols=1&marker=100&startId=0)
- [Six tag36h11 tags, IDs 0 to 5, 60 mm](/tools/generator/apriltag/?rows=3&cols=2&marker=60&startId=0)
- [Twelve tag36h11 tags, IDs 0 to 11, 40 mm](/tools/generator/apriltag/?rows=4&cols=3&marker=40&startId=0)
- [Twenty-four tag36h11 tags, IDs 0 to 23, 30 mm](/tools/generator/apriltag/?rows=6&cols=4&marker=30&startId=0)

Change the start ID to continue a set: a second sheet of six starts at ID 6.

## tag36h11 in numbers

- **36 data bits** in a 6 × 6 grid, inside a black border one cell wide: 8 cells across.
- **587 tags**, IDs 0 to 586.
- **Minimum Hamming distance 11**: any two tags differ in at least 11 bits.
- In OpenCV the same family is `cv2.aruco.DICT_APRILTAG_36h11`.

To see whether a tag is large enough, work out how many pixels it covers: focal length in pixels × tag size ÷ distance. A 100 mm tag seen from 2 m by a camera with a 1,400 px focal length is 70 px wide, a little under 9 px per cell. Aim for 5 to 10 px per cell or more.

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

Tags from this generator are free to use for any purpose: internal, educational or commercial, including products and client work. No sign-up and no attribution needed.

## Paper or a rigid board?

Printed tags are fine for localization and quick tests. For camera calibration, where the tag positions have to be known to a fraction of a millimeter, use a rigid board: the [AprilGrid composite board](/targets/aprilgrid-composite/) carries tag36h11 tags in the Kalibr layout.

## Related

- Calibrating a camera and IMU with Kalibr? Use the [AprilGrid generator](/tools/generator/aprilgrid/).
- Using ArUco instead? See the [ArUco marker generator](/tools/generator/aruco/).
- [ChArUco vs checkerboard vs AprilGrid](/guides/charuco-vs-checkerboard-vs-aprilgrid/)
