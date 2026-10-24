---
code: CT-UM-GEN
title: Calibration targets — User manual
type: manual
rev: A
date: 2026-10-24
status: draft
---

This manual covers all Calib.Tools planar calibration targets (composite, ceramic and glass). Product-specific values are in each target's datasheet (CT-DS-…).

## 1. What is in the box

- The calibration target, in a rigid carton with corner protection (wooden crate for boards over 600 mm)
- Inspection report (CT-IR-…) for this serial number, printed and as PDF via the QR code on the report
- Quick-start card
- Pattern files are not printed: download them from the product page or `calib.tools/targets/<handle>/` → Downloads (OpenCV JSON, Kalibr YAML, ROS 2 YAML, HALCON description, DXF outline)

Check the board on arrival: no dents on edges, no delamination, print intact. Report transport damage within 7 days with photos of the carton and board.

## 2. Identification

Every target carries an edge strip with: brand · full part number (e.g. `CT-CHA-P-300200-6X6`) · pattern summary (rows × columns · square / marker size · dictionary · start ID) · serial number (`YYWW-NNNNN`) · datasheet revision · a 100 mm scale bar.

The serial number links the board to its inspection report. Quote it in any support request.

## 3. Handling

- Hold boards by the edges. Avoid touching the pattern with bare fingers; skin oils dull the matte surface over time.
- Composite boards are rigid but can be dented by point loads: do not lean heavy objects against them or stand them on a corner.
- Ceramic and glass targets are brittle: carry flat, two hands, never by one corner. Do not drop from any height.
- Do not drill, cut or sand any target. Mounting holes and inserts are specified in the datasheet; custom mounting is available as a custom order.

## 4. Mounting

Accuracy depends on the board staying flat during capture.

- **Tripod / stand**: use the ¼″ mounting fixture (ACC-A-FIX-14) or an M4 insert plate where available. Clamp across the full edge, not at a point.
- **Wall / fixture**: mount on at least three points in one plane; do not bolt a board flat to a surface that is itself not flat.
- **Robot**: use the ISO 9409-1-50 flange adapter (ACC-A-FLG-ISO50). Keep cable strain off the board.
- **Hand-held**: acceptable for boards up to 400 × 300 mm. Hold at two opposite edges; keep the board still during exposure.

Allow a board that has come from a cold vehicle to reach room temperature before use (30–60 min). Thermal expansion coefficients are in the datasheet.

## 5. Capturing calibration images

The target gives you accurate geometry; the images decide how much of it reaches your calibration.

- **Fill the field of view.** The board should cover 50–80 % of the frame in at least some images and reach into every corner of the image across the set.
- **Tilt.** Include views at ±30–45° around both axes; pure frontal views do not constrain focal length well.
- **Distance.** Vary distance by at least 2×. Keep the board in focus; a slightly smaller board in sharp focus beats a large blurred one.
- **Count.** 15–25 images for a single camera; 30–40 for stereo or multi-camera rigs. Our Capture Assistant tool (`calib.tools/tools/capture/`) guides 15 poses.
- **Exposure.** Avoid saturation on white squares and motion blur. Matte finish tolerates most lighting; avoid a specular light source directly behind the camera on glossy ceramic/glass.
- **Check detection before you leave the setup.** Upload a photo to `calib.tools/tools/check/` to see what the detector finds (runs in your browser; nothing is uploaded to us).

Target-specific notes (which pattern, which dictionary, partial views) are in each quick-start guide.

## 6. Using the pattern files

Each target ships with files that describe its exact geometry:

| File | Use |
|---|---|
| `*.opencv.json` | Board definition for `cv.aruco.CharucoBoard` / `cv.findChessboardCorners` parameters (rows, cols, square size, marker size, dictionary, start ID) |
| `*.kalibr.yaml` | Kalibr target file (`target_type`, `tagCols`, `tagRows`, `tagSize`, `tagSpacing` or checkerboard equivalents) |
| `*.ros2.yaml` | Parameters for `camera_calibration` (ROS 2) |
| `*.halcon.descr` | HALCON calibration plate description |
| `*.dxf` | Board outline and mounting features for fixture design |

Units are millimetres unless stated. The files encode the as-designed geometry; the inspection report states the as-measured deviation. For most camera calibrations the as-designed values are correct to use; for metrology-grade work on ceramic/glass targets, use the per-feature coordinates supplied with the certificate.

## 7. Cleaning

- Composite (UV print): soft dry microfibre cloth; for marks, a cloth lightly dampened with water or isopropyl alcohol (≤ 70 %). No acetone, no abrasive pads, no solvents on the print.
- Ceramic / glass (chrome on substrate): lens tissue or microfibre with isopropyl alcohol. Do not scrub; the chrome layer is thin.
- Never pressure-wash or immerse.

## 8. Storage

Store flat, pattern up, in the original carton or a hard case (ACC-A-CSE-…), away from direct sunlight and heat sources. Composite: −20 to +60 °C storage. Ceramic / glass: any indoor environment; protect from impact. Do not stack boards pattern-to-pattern without interleaving.

## 9. Re-inspection and calibration certificates

Each board ships with an inspection report from our Munich inspection. Re-inspection (SVC-X-RECAL) is recommended every 24 months for composite boards in regular use or after any suspected impact; ceramic and glass targets are dimensionally stable and need re-inspection only if damaged. An ILAC-MRA certificate issued by an accredited third-party laboratory is available as an add-on (SVC-X-CERT-ILAC); see its service description.

## 10. Warranty and returns

Composite boards: 2 years against delamination, indoor print fading and warping within the stated operating conditions. Ceramic and glass targets: 2 years against coating defects. Excluded: mechanical damage after delivery, outdoor use beyond the stated lifetime, modification. Return conditions are at `calib.tools/returns/`.

## 11. Support

hello@calib.tools · we reply within one business day. Include the serial number and, for detection problems, one full-resolution sample image.

## 12. Disposal

Composite boards: aluminium/polyethylene composite, recycle as mixed metal/plastic per local rules. Ceramic and glass: inert waste. Packaging: cardboard, recyclable.
