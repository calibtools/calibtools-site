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
story: "To align a camera and a LiDAR you need features both sensors can find on the same object. On this target the camera sees ArUco markers, and the LiDAR sees circular holes cut through the panel as sharp depth edges. Because the holes sit at known positions in the marker frame, one view gives you correspondences for both sensors.\n\nThe panel is a light, stiff aluminium honeycomb so it stays flat at large sizes. We set the hole pattern, marker dictionary, size and mount to your sensors and range. The specifications shown are target values — tell us about your LiDAR, camera and working distance and we will confirm what we can build, and when."
compat:
  - { tool: "OpenCV", note: "ArUco marker detection for the camera pose" }
  - { tool: "ROS / ROS 2", note: "Point-cloud and image topics from your own extrinsic pipeline" }
  - { tool: "Autoware / MATLAB", note: "Use the hole and marker positions from the datasheet as target geometry" }
---
