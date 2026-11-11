---
seoTitle: "Multi-camera calibration target"
seoDescription: "A multi-face ChArUco target with its own marker IDs on each face, so every camera in a rig sees a shared, identified reference. Ask for a quote."
summary: "Multi-face ChArUco target that gives every camera in your rig a shared reference"
decideSpecs:
  - "Faces"
  - "Size"
  - "Marker IDs"
chips:
  - "3 or 5 faces"
  - "300 mm faces"
  - "Distinct ID range per face"
story: "When cameras face each other or sit around an object, no single flat board is visible to all of them at once. A multi-face target puts a ChArUco pattern on several faces at known angles. Each face uses its own range of marker IDs, so every camera knows exactly which face and which corner it sees.\n\nThat gives you a shared reference for extrinsics across the whole rig in fewer captures. We set the number of faces, face size and ID ranges for your rig. The specifications shown are target values — tell us how your cameras are arranged and we will confirm what we can build, and when."
compat:
  - { tool: "OpenCV", note: "One CharucoBoard per face with its own ID range" }
  - { tool: "Kalibr / multi-camera tools", note: "Use the face poses from the datasheet as target geometry" }
relatedTargets:
  - { label: "ChArUco, aluminum", href: "/targets/charuco-composite/", note: "Single boards; several can share one scene." }
  - { label: "AprilGrid, aluminum", href: "/targets/aprilgrid-composite/", note: "The board Kalibr expects for multi-camera rigs." }
  - { label: "Hand-eye calibration kit", href: "/targets/hand-eye-calibration-kit/", note: "When one of the cameras rides on a robot." }
  - { label: "LiDAR-camera target", href: "/targets/lidar-camera-target/", note: "When the rig also carries a LiDAR." }
  - { label: "¼″ mounting fixture", href: "/targets/mounting-fixture/", note: "Holds single boards on tripods around the rig." }
relatedGuides:
  - { label: "Multi-board marker IDs", href: "/guides/multi-board-marker-ids/", note: "How to give each board its own ID range." }
  - { label: "ChArUco vs checkerboard vs AprilGrid", href: "/guides/charuco-vs-checkerboard-vs-aprilgrid/", note: "Which pattern for which job." }
  - { label: "OpenCV camera calibration", href: "/guides/opencv-camera-calibration/", note: "Intrinsics first, then extrinsics." }
---

## The problem with one flat board

To find where the cameras of a rig sit relative to each other, two cameras have to see the same target at the same moment. With cameras side by side that is easy: hold one board where their views overlap.

It stops working when the cameras face each other, or stand in a ring around an object. A flat board shows its face to one side only. A camera behind it sees the back, and a camera at a steep angle cannot read the markers.

The usual workaround is to chain pairs: camera 1 with 2, then 2 with 3, and so on round the ring. Every link adds its own error, and the last camera ends up a long way from the first.

## What a multi-face target does

A multi-face target carries a ChArUco pattern on several faces set at known angles to each other. Each camera looks at the face that is turned toward it.

Every face uses its own range of marker IDs. One decoded marker tells the software which face it is on and where on that face, so a camera does not need to see the whole target.

Because the faces are fixed to each other, all cameras measure one rigid body. Each capture ties every camera that sees any face to the same reference, with no chain.

## Faces, size and IDs

The standard builds have 3 or 5 faces, each 300 mm across. Three faces suit cameras on one side of the scene; five faces suit cameras that stand all the way round it.

The ID ranges follow the rule in the [multi-board guide](/guides/multi-board-marker-ids/): each face starts where the previous one ends, so no ID appears twice anywhere on the target.

These are target values. The target is made to order; we set the number of faces, their size and their angles for your rig and confirm them with you before production.

## What you receive with it

- The target.
- One board file per face, for OpenCV, with its ID range.
- The pose of every face relative to the first one, as a table of rotations and translations.

The face poses are what turns separate boards into one target. If you only need intrinsics, you can ignore them and treat each face as a board of its own.

## Using it

In OpenCV, create one `CharucoBoard` per face and set its IDs. Detect all faces in each image, convert the corners of each face into the target frame with the face poses, and solve for the camera pose from all visible corners together.

Tools that calibrate several cameras from a known 3D target can take the same data: the corner coordinates in the target frame are the object points.

Calibrate the intrinsics of each camera first. A single [ChArUco board](/targets/charuco-composite/) moved close to each camera does that better than a target in the middle of the rig.

## When several flat boards are enough

If your cameras all look roughly the same way, you do not need this. Print or order a set of flat boards with consecutive ID ranges and place them through the shared volume. The [pattern generator](/tools/generator/) exports such a set with a manifest of the IDs.

The multi-face target is for rigs where no flat board can be seen by all cameras: turntable scanners, capture domes, inward-facing inspection cells.

## What to tell us

- How many cameras, and a sketch or a few words on how they are arranged.
- The distance from the cameras to the center of the rig.
- Resolution and lens of the cameras.
- Whether the target should stand on a tripod, a turntable or a robot.

[Ask for a quote](/quote/?product=multi-camera-target) with these and we answer with a face layout, a price and a delivery time.
