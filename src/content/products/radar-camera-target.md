---
seoTitle: "Radar-camera calibration target"
seoDescription: "Trihedral reflectors and joint targets that put a radar reflector in a camera-visible marker frame, for radar–camera extrinsic calibration. Ask for a quote."
summary: "Radar reflectors and joint targets for your radar–camera extrinsic calibration"
decideSpecs:
  - "Type"
  - "Size"
  - "Band"
chips:
  - "Trihedral reflector"
  - "100 or 150 mm"
  - "For your radar band"
story: "A radar sees a corner reflector as a strong, point-like return; a camera sees a printed pattern. A joint target puts a trihedral reflector at a known position in a camera-visible marker frame, so one setup gives you matching points for both sensors.\n\nWe offer single trihedral reflectors in 100 and 150 mm sizes, and a combined panel with the reflector built into a marker target. Tell us your radar band, for example 77 GHz, and your working distance. The specifications shown are target values — we will confirm what we can build, and when."
compat:
  - { tool: "ROS / ROS 2", note: "Radar detections and camera images from your own extrinsic pipeline" }
  - { tool: "OpenCV", note: "ArUco marker detection for the camera pose" }
relatedTargets:
  - { label: "LiDAR-camera target", href: "/targets/lidar-camera-target/", note: "Markers and holes for a LiDAR and a camera." }
  - { label: "ChArUco, aluminum", href: "/targets/charuco-composite/", note: "For the camera intrinsics, before the joint step." }
  - { label: "Multi-camera target", href: "/targets/multi-camera-target/", note: "Several faces for cameras around a rig." }
  - { label: "Thermal calibration target", href: "/targets/thermal-calibration-target/", note: "When the sensor set includes a thermal camera." }
  - { label: "¼″ mounting fixture", href: "/targets/mounting-fixture/", note: "Holds a board on a tripod." }
relatedGuides:
  - { label: "LiDAR-camera calibration", href: "/guides/lidar-camera-calibration/", note: "The same idea for another sensor pair." }
  - { label: "OpenCV camera calibration", href: "/guides/opencv-camera-calibration/", note: "Intrinsics first." }
  - { label: "Multi-board marker IDs", href: "/guides/multi-board-marker-ids/", note: "Several targets in one scene." }
---

## What a radar sees

A radar reports where strong reflections come from: distance, direction and often speed. A flat printed board is a poor radar target. Unless it faces the radar exactly, it reflects the signal away like a mirror.

A trihedral corner reflector is three metal plates meeting at right angles, like the inside corner of a box. A signal entering it bounces off the plates and leaves straight back toward the radar, over a wide range of directions. To the radar it is a bright, compact point.

## From a point to a calibration

To find where the radar sits relative to a camera, you need points that both sensors can locate. The radar locates the reflector. The camera cannot see into it precisely, but it can find printed markers.

The joint target fixes a reflector at a known position in a marker frame. The camera detects the markers and computes where the reflector's inner corner is in 3D. The radar measures the same point. Many such pairs, spread over the shared field, give the transform between the two sensors.

A single reflector on a stand also works if you can mark its position in the image another way; it is the simpler tool when you only need to check alignment.

## Choosing the reflector

The return from a corner reflector grows very quickly with its size, and it also depends on the wavelength of your radar. A larger reflector stands out further away and above more clutter.

Larger is not always better. At short range a strong reflector can saturate the radar, and a big one is harder to place precisely. Planned sizes are 100 and 150 mm; tell us your radar band and range and we choose with you.

## Setting it up

- Put the reflector on a non-metal stand, away from fences, vehicles and other metal. The radar cannot tell your reflector from a guard rail at the same distance.
- Raise it off the ground. Reflections from the floor arrive together with the direct signal and shift the measured position.
- Point the open side roughly at the radar. It does not need to be exact.
- Move it to many positions: left, right, near and far. A radar measures distance well and direction less well, so spread matters more than the number of captures.
- Calibrate the camera intrinsics first, with a [ChArUco board](/targets/charuco-composite/).

## What you receive

The reflector or the joint panel, and the position of the reflector's inner corner in the marker frame. Your own pipeline uses that with the radar detections and the marker pose from OpenCV.

These are target values. The target is made to order, and we confirm what we can build, and when, before you order.

## What to tell us

- Radar band, for example 77 GHz, and the model if you can share it.
- Camera resolution and lens.
- Working distances.
- Single reflector or joint panel.

[Ask for a quote](/quote/?product=Radar-camera%20calibration%20target) with these and we answer with a design, a price and a delivery time.
