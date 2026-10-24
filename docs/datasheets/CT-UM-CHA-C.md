---
code: CT-UM-CHA-C
title: ChArUco ceramic target — Quick start
type: manual
rev: A
date: 2026-10-24
status: draft
family: CHA
material: C
---

Read with CT-UM-GEN and the ChArUco composite quick start (same detection workflow).

## 1. Handle it like optics, not like a board

- Two hands, flat, by the edges. Ceramic does not bend; it chips or cracks.
- Keep it in the case when not mounted. Do not stack anything on it.
- Fingerprints on chrome: lens tissue + isopropyl, wipe once, no scrubbing.

## 2. Mounting

No holes are provided (a hole is a flatness and stress risk). Use:

- the soft-jaw ¼″ fixture ACC-A-FIX-14 clamping one long edge, or
- a three-point kinematic mount on the rear, or
- a vacuum chuck for bench setups.

Never clamp across the pattern face.

## 3. Lighting

The chrome is low-gloss but not matte. Place lights at 30–45° to the plate and off the camera axis; avoid a point source behind the camera. Diffuse ring lights work well. If you see a bright specular patch, move the light, not the camera.

## 4. Using the measured coordinates

Your inspection report includes a CSV of measured corner and marker-corner coordinates (mm, board frame, origin at the top-left outer corner, X right, Y down — OpenCV convention). For metrology-grade calibration, load these as the object points instead of the ideal grid. Then build `objectPoints` for each image from the detected corner IDs. For ordinary camera calibration the ideal grid (JSON) is sufficient.

## 5. Temperature

Thermal expansion is ≈ 7 µm per metre per °C — negligible for camera calibration, but allow the plate to equilibrate 30 min if it came from a cold room when working at the ±2 µm level.

## 6. Re-inspection

Dimensionally stable for life unless damaged. Re-inspect after any impact or if a visible chip reaches the pattern area.

Support: hello@calib.tools with the serial number.
