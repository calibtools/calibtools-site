---
title: "ADAS and autonomous driving sensor calibration"
seoTitle: "ADAS sensor calibration targets for R&D"
seoDescription: "Calibration targets for ADAS and autonomous-driving R&D: wide-angle camera intrinsics, camera–LiDAR and radar–camera extrinsics, in-cabin NIR cameras."
code: "ADAS-RD"
order: 1
audience: "For autonomous-driving perception teams, Tier 1 sensor groups and test tracks."
summary: "Perception stacks combine wide-angle cameras, LiDAR, radar and in-cabin NIR cameras. Each pair needs a target both sensors can see."
products:
  - "charuco-composite"
  - "lidar-camera-target"
  - "radar-camera-target"
  - "nir-calibration-target"
  - "multi-camera-target"
  - "reflectance-panel"
links:
  - { label: "LiDAR–camera extrinsic calibration", href: "/guides/lidar-camera-calibration/" }
  - { label: "Camera calibration with OpenCV", href: "/guides/opencv-camera-calibration/" }
  - { label: "ChArUco vs checkerboard vs AprilGrid", href: "/guides/charuco-vs-checkerboard-vs-aprilgrid/" }
  - { label: "FOV calculator", href: "/tools/fov/" }
  - { label: "ChArUco generator", href: "/tools/generator/charuco/" }
selection:
  - { scenario: "Wide-angle or fisheye camera intrinsics", pattern: "ChArUco (partial views)", size: "600 × 400 to 800 × 600 mm", material: "Aluminium composite" }
  - { scenario: "Camera–LiDAR extrinsics", pattern: "Markers + cut-out holes", size: "600 × 400 mm and up", material: "Aluminium honeycomb" }
  - { scenario: "Radar–camera extrinsics", pattern: "Trihedral reflector in a marker frame", size: "100–150 mm reflector", material: "Metal + composite" }
  - { scenario: "In-cabin DMS / OMS camera", pattern: "ChArUco, NIR-dark pattern", size: "300 × 200 to 600 × 400 mm", material: "Composite, NIR print" }
faq:
  - { q: "What size board do I need for a 120° camera?", a: "Large enough to fill a good part of the frame at your working distance, and coded so that views near the image edge still count. The FOV calculator gives you the field and a starting board size for your lens and distance." }
  - { q: "Does my LiDAR-camera tool need a borderless board?", a: "Some tools do, and some need an even/odd square count. Tell us which tool you use; we set the border, square count and hole pattern to match it." }
  - { q: "What reflector size should I use for 77 GHz radar?", a: "It depends on the range and the radar cross section your tool needs. Tell us your radar, range and mounting and we will propose a reflector size." }
---

## What you calibrate

- **Camera intrinsics** for front, surround-view and fisheye cameras, often above 120° field of view.

- **Camera–LiDAR extrinsics**, so points and pixels line up.

- **Radar–camera extrinsics** for fusion, using corner reflectors the radar sees as point returns.

- **In-cabin cameras** at 850 or 940 nm for driver and occupant monitoring.

## Common problems

Wide lenses push corners to the image edge, where a plain checkerboard is often cut off and no longer detected. A ChArUco board keeps every visible corner identified, so those edge views still count.

For camera–LiDAR work the tool sets the target: some extrinsic tools want a borderless board, others an even and odd square count, and many need features the LiDAR can see as depth edges. Printed boards also bend at these sizes, which shows up as extrinsic error you cannot calibrate away.

Radar and LiDAR teams often build corner reflectors and targets themselves. A target made to known geometry, with that geometry in the datasheet, removes one unknown from the fusion chain.
