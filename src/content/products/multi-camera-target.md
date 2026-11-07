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
---
