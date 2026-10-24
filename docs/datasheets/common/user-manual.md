---
code: CT-UM-001
title: Calibration target user manual
type: manual
rev: A
date: 2026-10-24
status: draft
---

## Getting started

Thank you for choosing a Calib.Tools calibration target. This guide covers setup, usage, and care for all target types.

## Unpacking

- Remove the target from its protective packaging
- Inspect for shipping damage; contact hello@calib.tools if damaged
- Locate the included inspection report and configuration files (USB or download link)

## Mounting

### Tripod mounting

All composite and ceramic targets include M4 threaded inserts on the rear panel. Use the supplied M4 screws or the optional mounting fixture (ACC-A-MNT-01) with a standard 1/4-20 UNC tripod head.

### Wall mounting

For permanent installations, use the M4 inserts with appropriate wall anchors. Ensure the target surface is accessible for cleaning and verification.

### Robot flange mounting

Contact hello@calib.tools for custom robot flange adaptor dimensions.

## Camera calibration workflow

1. Mount the target so it fills 50-80% of the camera field of view
2. Capture 15-25 images from different angles and distances
3. Ensure the target is fully visible in each image (for ChArUco, partial visibility is acceptable)
4. Run calibration using your preferred software (OpenCV, MATLAB, Kalibr, HALCON)
5. Review the reprojection error; values below 0.5 px indicate a good calibration

## Configuration files

Each target ships with framework-specific configuration files:

| File | Framework | Contents |
|------|-----------|----------|
| .opencv.json | OpenCV | Pattern type, grid size, square/marker dimensions |
| .kalibr.yaml | Kalibr | Target configuration for kalibr_calibrate_cameras |
| .ros2.yaml | ROS 2 | Camera calibration node parameters |
| .halcon.descr | HALCON | Calibration plate description |

Download fresh copies from calib.tools or generate custom configurations with the free pattern generator at calib.tools/tools/generator/.

## Care and maintenance

- Store targets flat, away from direct sunlight
- Clean composite targets with a soft, dry cloth
- Clean ceramic targets with isopropanol and lint-free cloth
- Do not stack heavy items on targets
- Avoid exposure to temperatures outside the rated range

## Warranty

All Calib.Tools targets are covered by a 2-year warranty against manufacturing defects. See calib.tools/returns/ for full terms.

## Contact

- Email: hello@calib.tools
- Website: calib.tools
- GitHub: github.com/calibtools
