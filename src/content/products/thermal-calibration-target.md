---
seoTitle: "Thermal camera calibration target, heated"
seoDescription: "A heated checkerboard or circle grid for thermal camera calibration: a stable contrast your LWIR camera sees sharply. Built to order — ask for a quote."
summary: "Heated target for geometric calibration of your LWIR thermal camera"
decideSpecs:
  - "Band"
  - "Pattern"
  - "Size"
chips:
  - "8–14 µm"
  - "Checkerboard or circles"
  - "Built to size"
story: "A thermal camera does not see printed ink, so a normal board looks blank. This target is heated from behind and its pattern has a different emissivity from the background, so warm and cool areas form a crisp checkerboard or circle grid in the LWIR image.\n\nIt is made for geometric work: intrinsics of the thermal camera and extrinsics between thermal and visible cameras. It is not a blackbody and does not calibrate temperature readings. We build each one to your pattern, size and power supply. The specifications shown are target values — tell us about your camera and setup and we will confirm what we can deliver, and when."
compat:
  - { tool: "OpenCV", note: "findChessboardCornersSB or findCirclesGrid on the thermal image" }
  - { tool: "Kalibr", note: "Checkerboard or circle-grid target for thermal-visible extrinsics" }
  - { tool: "MATLAB", note: "Camera Calibrator app" }
---
