---
seoTitle: "ChArUco board for OpenCV, aluminum"
seoDescription: "A rigid ChArUco calibration board you can push half out of frame and still detect: every corner carries a marker ID. For OpenCV stereo and multi-camera rigs."
summary: "See every corner, even at the frame edge — for your OpenCV stereo and multi-camera rigs"
decideSpecs:
  - "Feature position tolerance"
  - "Substrate"
  - "Flatness"
chips:
  - "±0.3 mm + 0.2 mm/m"
  - "6 mm"
  - "200–800 mm"
story: "Your lens distorts most at the edges of the frame, and that is exactly where a plain checkerboard stops being detected. On this board every white square carries an ArUco marker, so OpenCV identifies each corner on its own. Push the board into the corners of your image and you still get usable points.\n\nWe print the grid size, square size and ID range on the board itself, so nobody on your team has to guess the parameters six months from now. It works natively in OpenCV, and with MATLAB and most multi-camera toolchains."
skus:
  - partNumber: "CT-CHA-P-200X150"
    title: "ChArUco 5 × 7, 25 mm squares, 200 × 150 mm, 24 corners"
  - partNumber: "CT-CHA-P-300X200"
    title: "ChArUco 7 × 10, 25 mm squares, 300 × 200 mm, 54 corners"
  - partNumber: "CT-CHA-P-400X300"
    title: "ChArUco 9 × 12, 30 mm squares, 400 × 300 mm, 88 corners"
  - partNumber: "CT-CHA-P-600X400"
    title: "ChArUco 9 × 14, 40 mm squares, 600 × 400 mm, 104 corners"
  - partNumber: "CT-CHA-P-800X600"
    title: "ChArUco 11 × 15, 50 mm squares, 800 × 600 mm, 140 corners"
relatedTargets:
  - { label: "Checkerboard, aluminum", href: "/targets/checkerboard-composite/", note: "The simplest pattern, when the whole board stays in view." }
  - { label: "AprilGrid, aluminum", href: "/targets/aprilgrid-composite/", note: "The board Kalibr expects for camera-IMU calibration." }
  - { label: "Circle grid, aluminum", href: "/targets/circlegrid-composite/", note: "Symmetric and asymmetric circle patterns." }
  - { label: "HALCON plate, aluminum", href: "/targets/halcon-composite/", note: "For HALCON camera calibration." }
  - { label: "ChArUco, ceramic", href: "/targets/charuco-ceramic/", note: "The same pattern with a tighter tolerance." }
  - { label: "Multi-camera target", href: "/targets/multi-camera-target/", note: "Several boards with separate ID ranges." }
relatedGuides:
  - { label: "How big should your target be?", href: "/guides/calibration-target-size/", note: "The 60 % fill rule and pixels per square." }
  - { label: "OpenCV camera calibration", href: "/guides/opencv-camera-calibration/", note: "Load the board file and run the calibration." }
  - { label: "Hand-eye calibration with OpenCV", href: "/guides/hand-eye-calibration-opencv/", note: "Camera on a robot arm, step by step." }
  - { label: "Multi-board marker IDs", href: "/guides/multi-board-marker-ids/", note: "Several boards in one scene." }
---

## How a ChArUco board works

A ChArUco board is a checkerboard with an ArUco marker printed in every white square. The detector decodes the markers first, then finds the checkerboard corners between them, so every corner comes back with its own ID.

Because each corner is identified on its own, the board still gives you points when part of it is outside the image or hidden behind a gripper. A plain [checkerboard](/targets/checkerboard-composite/) needs the whole grid in view to be detected at all.

That difference matters most at the edges and corners of the frame, where lens distortion is strongest. Those are the views that pin down the distortion model, and they are the views where a checkerboard is most often lost.

OpenCV reads the board natively through `cv2.aruco.CharucoBoard`, and MATLAB and most multi-camera toolchains support it too. For a side-by-side of the common patterns, see [ChArUco vs checkerboard vs AprilGrid](/guides/charuco-vs-checkerboard-vs-aprilgrid/).

## Choosing a size

Pick the board that fills about 60 % of the image at your working distance, with some views pushed into the corners. Each square should be at least 25 px across and each marker bit at least 3 px. The [target size guide](/guides/calibration-target-size/) explains where these numbers come from.

The [FOV calculator](/tools/fov/) turns your sensor, lens and distance into a field of view and mm per pixel. The figures below assume the default DICT_6X6_250 dictionary, where a marker is 8 bits wide including its border.

**[CT-CHA-P-200X150](#CT-CHA-P-200X150)**, 5 × 7 squares of 25 mm with 18 mm markers, 24 corners. At 60 % fill it suits a field about 330 mm wide. Keep the image scale at 0.75 mm per pixel or finer. It weighs about 0.2 kg and has no rear inserts; mount it with the clamp fixture.

**[CT-CHA-P-300X200](#CT-CHA-P-300X200)**, 7 × 10 squares of 25 mm with 18 mm markers, 54 corners. It suits a field about 500 mm wide at the same 0.75 mm per pixel. At about 0.4 kg it is easy to wave by hand, and it is the smallest size with four M4 inserts on the rear.

**[CT-CHA-P-400X300](#CT-CHA-P-400X300)**, 9 × 12 squares of 30 mm with 22 mm markers, 88 corners. It suits a field about 670 mm wide at 0.92 mm per pixel or finer. At about 0.8 kg it is the usual choice for a robot cell or a stereo pair at bench distance.

**[CT-CHA-P-600X400](#CT-CHA-P-600X400)**, 9 × 14 squares of 40 mm with 30 mm markers, 104 corners. It suits a field about 1 m wide at 1.25 mm per pixel or finer, and weighs about 1.6 kg. Mount it on a stand or a robot flange rather than holding it.

**[CT-CHA-P-800X600](#CT-CHA-P-800X600)**, 11 × 15 squares of 50 mm with 37 mm markers, 140 corners. It suits a field about 1.3 m wide at 1.54 mm per pixel or finer. At about 3.2 kg it belongs on a fixture, for wide rigs and longer working distances.

If two sizes both fit, the larger squares are easier to detect at steep angles and the smaller board is easier to move through many poses. Larger boards and other grids are a custom order; [ask for a quote](/quote/).

## Choosing a dictionary

The dictionary is the last part of the part number. **D6** (DICT_6X6_250) is the default and the most robust against false detections. **D5** (DICT_5X5_100) and **D4** (DICT_4X4_50) have fewer bits, so the markers decode at lower resolution, with fewer unique IDs.

**T36** places AprilTag 36h11 markers in the white squares instead of ArUco. All boards start at ID 0, run row-major over the white squares and follow the OpenCV 4.6 and later placement (`legacy_pattern: false`).

If several boards share one scene, give each one its own ID range so the detector never confuses them. The [multi-board marker ID guide](/guides/multi-board-marker-ids/) shows how, and the [multi-camera target](/targets/multi-camera-target/) is built for that layout.

## What is printed on the board

The pattern is centered with a white quiet zone of at least one square on every side. Outside that zone, an edge strip carries the part number, the serial number and a 100 mm scale bar.

Grid size, square size and ID range are printed with it, so anyone picking the board up later can rebuild the configuration without searching for the order.

## Mounting

Boards from 300 × 200 mm up have four M4 threaded inserts on the rear. The [¼″ mounting fixture](/targets/mounting-fixture/) (CT-ACC-M-FIX14) clamps any size, including the 200 × 150 mm board, onto a tripod or lab post with a ¼″-20 screw.

Flatness is specified with the board resting on three points. A mount that pulls the board hard against an uneven surface can bend it beyond that, so tighten screws only until the board sits firmly.

For a camera on a robot arm, the [hand-eye calibration kit](/targets/hand-eye-calibration-kit/) pairs a ChArUco board with an ISO 50 flange adapter, and the [hand-eye calibration guide](/guides/hand-eye-calibration-opencv/) walks through the OpenCV side.

## Material and print

The substrate is a 6 mm aluminum / LDPE / aluminum composite: light, stiff and flat to 0.5 mm per meter. The pattern is UV-printed directly onto it, matte black on white, with an optical density of at least 1.6.

The matte finish keeps glare off the corners under bench lights. The board works from −50 to +80 °C, and the UV-stable print lasts up to three years outdoors.

Aluminum expands about 24 µm per meter per °C. On the 800 × 600 mm board, a 10 °C change moves the outer corners by about 0.19 mm, so let the board settle to room temperature before a precise run.

If you need a tighter tolerance or near-zero expansion for close-range work, the [ceramic ChArUco target](/targets/charuco-ceramic/) uses the same pattern on a ceramic substrate.

## Measured before it ships

Every board is measured before it ships: dimensions, flatness and a visual check. Corner positions are held to ±0.3 mm + 0.2 mm per meter of the nominal grid at 20 °C, with mean square pitch within ±0.05 mm.

## Files and software

Each board comes with `.opencv.json`, `.ros2.yaml`, a HALCON point tuple (`.halcon.txt`) and a `.dxf` of the pattern. The [OpenCV calibration guide](/guides/opencv-camera-calibration/) shows how to load the board file and run the calibration.

Before you order, print a paper copy with the [pattern generator](/tools/generator/) to test detection. Once the board arrives, the [capture assistant](/tools/capture/) guides you through the poses.

The [detection check](/tools/check/) shows what the detector finds in a photo, and the [quality analyzer](/tools/quality/) scores coverage and reprojection error. Need the result in another format? Use the [format converter](/tools/convert/).

## Care and storage

Clean with water or isopropyl alcohol up to 70 % and a soft cloth. Store the board dry between −20 and +60 °C, flat or standing on its long edge.
