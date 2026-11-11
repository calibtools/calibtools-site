---
seoTitle: "Ceramic ChArUco calibration target"
seoDescription: "Chrome lithographed on 3 mm alumina ceramic, ±2 µm target feature accuracy. For your calibrations where a printed board is too coarse. Matte, front-lit."
summary: "Lithographed ceramic ChArUco — for when your target can't be the error budget"
decideSpecs:
  - "Feature position accuracy"
  - "Substrate"
  - "Flatness"
chips:
  - "±2 µm (target)"
  - "3 mm alumina"
  - "110–230 mm"
story: "When you calibrate high-magnification optics or run measurement-grade vision, a printed board becomes the largest error in your chain. Here we lithograph the pattern in chrome on white alumina ceramic, with a ±2 µm target for feature position at 20 °C. We will publish the measurement method with the first production boards.\n\nAlumina expands about a third as much as aluminum composite, doesn't take up moisture and is inert to common solvents. Your target stays the same size from one session to the next."
skus:
  - partNumber: "CT-CHA-C-110X85"
    title: "ChArUco 7 × 10, 10 mm squares, 110 × 85 mm, 54 corners"
  - partNumber: "CT-CHA-C-150X100"
    title: "ChArUco 7 × 11, 12.5 mm squares, 150 × 100 mm, 60 corners"
  - partNumber: "CT-CHA-C-185X110"
    title: "ChArUco 7 × 12, 14 mm squares, 185 × 110 mm, 66 corners"
  - partNumber: "CT-CHA-C-230X140"
    title: "ChArUco 8 × 14, 15 mm squares, 230 × 140 mm, 91 corners"
relatedTargets:
  - { label: "ChArUco, aluminum", href: "/targets/charuco-composite/", note: "The same pattern for fields from 0.3 to 1.3 m." }
  - { label: "Glass resolution and scale targets", href: "/targets/resolution-targets-glass/", note: "Chrome on glass for microscopes and lens benches." }
  - { label: "Grid distortion target", href: "/targets/grid-distortion-target/", note: "Chrome-on-glass dot grid for distortion mapping." }
  - { label: "¼″ mounting fixture", href: "/targets/mounting-fixture/", note: "Soft jaws that hold a ceramic plate by its edges." }
  - { label: "Hand-eye calibration kit", href: "/targets/hand-eye-calibration-kit/", note: "Board and flange adapter for a camera on a robot." }
relatedGuides:
  - { label: "Composite, ceramic or glass", href: "/guides/composite-ceramic-or-glass/", note: "Compare the tolerance with one pixel on the board." }
  - { label: "How big should your target be?", href: "/guides/calibration-target-size/", note: "The 60 % fill rule and pixels per marker bit." }
  - { label: "What reprojection error tells you", href: "/guides/reprojection-error/", note: "And what a low value can hide." }
  - { label: "OpenCV camera calibration", href: "/guides/opencv-camera-calibration/", note: "Load the board file and run the calibration." }
---

## When the board becomes the limit

A printed board is held to a few tenths of a millimeter. That is well under a pixel when a pixel covers half a millimeter on the board, and several pixels when it covers 40 µm.

Work out how much of the board one pixel covers: the width of your field of view divided by the image width in pixels. When that is below about 0.1 mm, a composite board's tolerance spans more than one pixel, and the target is part of your error.

On this plate the pattern is lithographed in chrome on alumina ceramic, with a ±2 µm target for the position of any feature at 20 °C. This is a target value; we will publish the measurement method with the first production plates.

The [substrate guide](/guides/composite-ceramic-or-glass/) works through the comparison with numbers. For fields wider than about 400 mm, the [composite ChArUco board](/targets/charuco-composite/) carries the same pattern at a size that fills the image.

## Choosing a size

Fill about 60 % of the image with the plate and keep each marker bit at least 3 px across. With the default DICT_6X6_250 dictionary a marker is 8 cells wide including its border, so the marker should be at least 24 px across. The [FOV calculator](/tools/fov/) gives your image scale.

**[CT-CHA-C-110X85](#CT-CHA-C-110X85)**, 7 × 10 squares of 10 mm with 7.5 mm markers, 54 corners and 35 markers, about 0.1 kg. It fits a field about 180 mm wide at 0.31 mm per pixel or finer.

**[CT-CHA-C-150X100](#CT-CHA-C-150X100)**, 7 × 11 squares of 12.5 mm with 9.5 mm markers, 60 corners and 38 markers, about 0.17 kg. It fits a field about 250 mm wide at 0.4 mm per pixel or finer.

**[CT-CHA-C-185X110](#CT-CHA-C-185X110)**, 7 × 12 squares of 14 mm with 10.5 mm markers, 66 corners and 42 markers, about 0.22 kg. It fits a field about 310 mm wide at 0.44 mm per pixel or finer.

**[CT-CHA-C-230X140](#CT-CHA-C-230X140)**, 8 × 14 squares of 15 mm with 11 mm markers, 91 corners and 56 markers, about 0.35 kg. It fits a field about 380 mm wide at 0.46 mm per pixel or finer.

Larger ceramic plates, up to 400 × 400 mm, and other grids are made to order with a one-time setup charge; [ask for a quote](/quote/).

## Dictionaries

The plate is offered with **D6** (DICT_6X6_250, the default) and **D5** (DICT_5X5_100). D5 markers have fewer and larger bits, so they decode at a slightly coarser image scale. IDs start at 0, run row by row over the white squares and follow the OpenCV 4.6 and later placement.

## Temperature

Alumina expands about 7.2 µm per meter per °C, less than a third of aluminum composite. It takes up no moisture, so the plate does not change size with humidity.

At this level temperature still counts. Over the 230 mm plate, 1 °C is about 1.7 µm, close to the target tolerance itself. Let the plate settle in the room before a careful run, and note the temperature with your calibration.

The plate works from −50 to +200 °C. Avoid sudden temperature steps of more than 100 °C.

## Surface and lighting

The pattern is blue-black chrome on a lapped white ceramic surface, low in gloss and meant for front lighting. The plate is opaque, so it cannot be backlit; for transmitted light use a [glass target](/targets/resolution-targets-glass/).

With a ring light or a flash close to the lens, tilt the plate a few degrees so the direct reflection misses the camera.

## Handling and mounting

The plate is 3 mm thick with ground edges and a 0.5 mm chamfer, and it has no holes. It is supplied in a padded case. Hold it by the edges; ceramic is hard but can chip if it falls on a hard floor.

Mount it without bending it: in the soft jaws of the [¼″ mounting fixture](/targets/mounting-fixture/) (CT-ACC-M-FIX14), on three support points, or on a vacuum chuck. Flatness is 20 µm or better over the pattern area, and a clamp that forces the plate against an uneven surface gives that away.

## Measured before it ships

Every plate is measured before it ships: features, flatness and a visual check.

## Files and software

Each plate comes with `.opencv.json`, `.ros2.yaml`, a HALCON point tuple (`.halcon.txt`) and a `.dxf` of the pattern. The [OpenCV calibration guide](/guides/opencv-camera-calibration/) shows how to load the board file.

A plate this accurate deserves a careful reading of the result. The [reprojection error guide](/guides/reprojection-error/) shows the two checks that tell you whether the model holds at the image edges.

## Care and storage

Clean with lens tissue and isopropyl alcohol. Do not use abrasives. The ceramic is inert to water, alcohols and common solvents. Keep the plate in its case when it is not in use.
