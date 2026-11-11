---
seoTitle: "Hand-eye calibration kit, ChArUco"
seoDescription: "A ChArUco target with a robot flange adapter for eye-in-hand and eye-to-hand calibration. Detects with partial views, so poses near the image edge still count."
summary: "ChArUco target and flange adapter for your robot hand-eye calibration"
decideSpecs:
  - "Target"
  - "Mount"
  - "Use"
chips:
  - "ChArUco, ceramic"
  - "ISO 9409-1-50 flange"
  - "Eye-in-hand / eye-to-hand"
story: "Hand-eye calibration works best with many robot poses at steep angles, and with those poses the board is often partly out of view. A ChArUco target still gives you identified corners when only part of it is visible, so every pose can count.\n\nThe kit pairs a ChArUco target with an adapter for an ISO 50 robot flange, so you can mount the target on the robot (eye-to-hand) or use it as a fixed reference while the camera rides on the arm (eye-in-hand). We confirm the target size and flange pattern for your robot. The specifications shown are target values — tell us your robot and camera and we will confirm what we can deliver, and when."
compat:
  - { tool: "OpenCV", note: "cv.calibrateHandEye with CharucoDetector poses" }
  - { tool: "ROS / MoveIt", note: "MoveIt hand-eye calibration with a ChArUco target" }
  - { tool: "HALCON", note: "Corner point tuple with calibrate_hand_eye" }
relatedTargets:
  - { label: "ChArUco, ceramic", href: "/targets/charuco-ceramic/", note: "The plate used in the kit, on its own." }
  - { label: "ChArUco, aluminum", href: "/targets/charuco-composite/", note: "Larger boards for cameras that sit further away." }
  - { label: "AprilGrid, aluminum", href: "/targets/aprilgrid-composite/", note: "If your stack already detects AprilTag." }
  - { label: "Multi-camera target", href: "/targets/multi-camera-target/", note: "Several faces for cameras around a cell." }
  - { label: "¼″ mounting fixture", href: "/targets/mounting-fixture/", note: "Holds the plate on a tripod or post for eye-in-hand." }
relatedGuides:
  - { label: "Hand-eye calibration with OpenCV", href: "/guides/hand-eye-calibration-opencv/", note: "Poses, code and how to check the result." }
  - { label: "How big should your target be?", href: "/guides/calibration-target-size/", note: "The 60 % fill rule and pixels per marker bit." }
  - { label: "What reprojection error tells you", href: "/guides/reprojection-error/", note: "And what a low value can hide." }
---

## What hand-eye calibration needs from a target

Hand-eye calibration finds where the camera sits relative to the robot. You move the robot through a set of poses, the camera measures the pose of a target in each one, and a solver works out the fixed transform that makes both sets of poses agree.

The solver only learns from rotation. The [hand-eye guide](/guides/hand-eye-calibration-opencv/) recommends 15 to 25 poses with 30° to 45° of rotation between them, about all three axes.

At those angles a board is often cut off by the image edge or by the gripper. A ChArUco board still returns identified corners when only part of it is visible, so those poses count. With a [checkerboard](/targets/checkerboard-composite/) they would be lost.

The target also has to be rigid and stay exactly where it is. Any shift between poses goes straight into the result.

## Two ways to use the kit

**Eye-in-hand**: the camera rides on the arm and the target stands still. Clamp the plate to the table or put it on a post with the [mounting fixture](/targets/mounting-fixture/), then move the camera around it.

**Eye-to-hand**: the camera is fixed in the cell and the target rides on the arm. Bolt the plate to the robot flange with the adapter, then move the target in front of the camera.

The same kit covers both. The guide shows which poses to pass to `cv2.calibrateHandEye` in each case; for eye-to-hand the robot poses have to be inverted first.

## What is in the kit

- A ChArUco target on alumina ceramic, the same plate as our [ceramic ChArUco target](/targets/charuco-ceramic/).
- An adapter plate for a robot flange to ISO 9409-1-50: four M6 screws on a 50 mm circle. Many collaborative arms use this pattern.
- The board files for the target: OpenCV JSON and a marker ID list.

The plate is held by its edges, because ceramic has no mounting holes.

These are target values. This kit is made to order, and we confirm the plate size, the flange pattern and the delivery time for your robot before you order.

## Choosing the target size

Use the same rule as for any ChArUco board: fill about 60 % of the image at your working distance and keep each marker bit at least 3 px across. The [FOV calculator](/tools/fov/) gives the field of view for your sensor, lens and distance.

A camera on a robot wrist usually works at 0.2 to 0.6 m, where a ceramic plate of 110 to 230 mm fits the field. For a camera that watches the whole cell from further away, tell us the distance; a larger [composite board](/targets/charuco-composite/) on the same adapter may be the better choice.

## Software

OpenCV: detect the board with `CharucoDetector`, get its pose with `solvePnP`, and pass the poses to `cv2.calibrateHandEye`. The guide has code for both arrangements.

ROS: the MoveIt hand-eye calibration plugin accepts a ChArUco target; enter the square and marker sizes from the board file.

HALCON: pass the corner points and their board coordinates to `calibrate_hand_eye`.

Calibrate the camera intrinsics first, with the same plate, and keep them fixed during the hand-eye step.

## What to tell us

- Robot model and flange pattern, if it is not ISO 9409-1-50.
- Camera resolution, lens and working distance.
- Eye-in-hand or eye-to-hand.
- How much room there is around the flange, so the plate does not collide with the gripper.

[Ask for a quote](/quote/?product=hand-eye-calibration-kit) with those four points and we answer with a size, a price and a delivery time.
