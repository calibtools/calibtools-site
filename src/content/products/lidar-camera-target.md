---
seoTitle: "LiDAR-camera calibration target"
seoDescription: "Calibration target for camera–LiDAR extrinsics: ArUco markers for the camera and cut-out holes the LiDAR sees as edges. Built to your setup — ask for a quote."
summary: "Joint target for camera–LiDAR extrinsic calibration, built to your sensor layout"
decideSpecs:
  - "Features"
  - "Size"
  - "Substrate"
chips:
  - "Markers + holes"
  - "600 × 400 mm"
  - "Honeycomb panel"
story: "To align a camera and a LiDAR you need features both sensors can find on the same object. On this target the camera sees ArUco markers, and the LiDAR sees circular holes cut through the panel as sharp depth edges. Because the holes sit at known positions in the marker frame, one view gives you correspondences for both sensors.\n\nThe panel is a light, stiff aluminum honeycomb so it stays flat at large sizes. We set the hole pattern, marker dictionary, size and mount to your sensors and range. The specifications shown are target values — tell us about your LiDAR, camera and working distance and we will confirm what we can build, and when."
compat:
  - { tool: "OpenCV", note: "ArUco marker detection for the camera pose" }
  - { tool: "ROS / ROS 2", note: "Point-cloud and image topics from your own extrinsic pipeline" }
  - { tool: "Autoware / MATLAB", note: "Use the hole and marker positions from the datasheet as target geometry" }
relatedTargets:
  - { label: "ChArUco, aluminum", href: "/targets/charuco-composite/", note: "For the camera intrinsics, before the joint step." }
  - { label: "Radar-camera target", href: "/targets/radar-camera-target/", note: "When the vehicle also carries a radar." }
  - { label: "Multi-camera target", href: "/targets/multi-camera-target/", note: "Several faces for cameras around a rig." }
  - { label: "Depth and ToF targets", href: "/targets/depth-camera-target/", note: "Step blocks to check reported distances." }
  - { label: "¼″ mounting fixture", href: "/targets/mounting-fixture/", note: "Holds smaller boards on a tripod." }
relatedGuides:
  - { label: "LiDAR-camera calibration", href: "/guides/lidar-camera-calibration/", note: "The method, step by step." }
  - { label: "OpenCV camera calibration", href: "/guides/opencv-camera-calibration/", note: "Intrinsics first." }
  - { label: "How big should your target be?", href: "/guides/calibration-target-size/", note: "Size against field of view." }
---

## Why a camera board is not enough

A camera finds a calibration board by its printed pattern. A LiDAR does not see print at all: it measures distance, and a flat board is just a flat patch of points.

To find where the LiDAR sits relative to the camera, both sensors have to locate the same physical features. So the target needs something the LiDAR can find by shape and the camera can find by pattern, at positions that are known relative to each other.

## How this target does it

The camera side is a set of ArUco markers. Detecting them gives the pose of the panel in the camera image.

The LiDAR side is a set of circular holes cut through the panel. A beam that hits the panel returns from the panel; a beam that passes through a hole returns from whatever is behind it. That jump in distance marks the hole's edge in the point cloud.

The hole centers are at known positions in the marker frame. One capture of the panel therefore gives matching 3D points for both sensors.

## Choosing the size and the holes

A LiDAR samples the scene in separate scan lines. The further away the panel is, the wider the gap between two lines on its surface.

A hole has to be crossed by several scan lines for its center to be found, so the hole diameter follows from your LiDAR's vertical resolution and the distance you will work at. Fewer channels or longer range means larger holes and a larger panel.

The panel is aluminum honeycomb because a large panel has to stay flat and still be light enough to move between captures. The planned size is 600 × 400 mm; other sizes are made to your sensor layout.

## Setting it up

- Place the panel well in front of the background, with open space behind it. A wall directly behind the holes leaves too small a jump in distance.
- Keep the whole panel inside the camera image and inside the LiDAR's field of view.
- Capture the panel at several positions and angles across the shared field, not only in the center.
- Calibrate the camera intrinsics first, with a [ChArUco board](/targets/charuco-composite/), and keep them fixed.

The [LiDAR-camera guide](/guides/lidar-camera-calibration/) goes through the method and how to check the result.

## What you receive

The panel, and the positions of the markers and hole centers in one coordinate frame as a table. Your own pipeline, or tools such as Autoware and MATLAB's LiDAR-camera calibrator, take those as the target geometry.

These are target values. The target is made to order, and we confirm what we can build, and when, before you order.

## What to tell us

- LiDAR model, or its number of channels and vertical field of view.
- Camera resolution and lens.
- The distance at which you will place the panel.
- How it will be held: tripod, stand or fixed mount.

[Ask for a quote](/quote/?product=LiDAR-camera%20calibration%20target) with these and we answer with a layout, a price and a delivery time.
