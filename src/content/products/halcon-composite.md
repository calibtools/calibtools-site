---
seoTitle: "HALCON calibration plate, aluminum"
seoDescription: "HALCON calibration plate in the gen_caltab layout: equal marks, black frame, corner triangle. Made to your .descr or mark count. Composite, 200–800 mm."
summary: "HALCON plate in the gen_caltab layout, made to your .descr file or mark count"
decideSpecs:
  - "Feature position tolerance"
  - "Substrate"
  - "Flatness"
chips:
  - "±0.3 mm + 0.2 mm/m"
  - "6 mm"
  - "200–800 mm"
story: "If your line runs HALCON, the plate has to be one that find_caltab can locate: equal black marks in a regular grid, inside a black frame with a triangle in one corner. That is the layout gen_caltab describes, and it is how we make this plate.\n\nSend us your .descr file, or the number of marks and the mark distance, and we print the plate to it. You get a .descr file in the same format back with the plate. It is made to order; we confirm the layout with you before printing."
relatedTargets:
  - { label: "Circle grid, aluminum", href: "/targets/circlegrid-composite/", note: "Plain dot grids for OpenCV findCirclesGrid." }
  - { label: "Checkerboard, aluminum", href: "/targets/checkerboard-composite/", note: "Usable in HALCON as a point-based object." }
  - { label: "ChArUco, aluminum", href: "/targets/charuco-composite/", note: "When the board is often partly hidden." }
  - { label: "Hand-eye calibration kit", href: "/targets/hand-eye-calibration-kit/", note: "For calibrate_hand_eye on a robot." }
  - { label: "¼″ mounting fixture", href: "/targets/mounting-fixture/", note: "Clamps any board onto a tripod or lab post." }
relatedGuides:
  - { label: "How big should your target be?", href: "/guides/calibration-target-size/", note: "The 60 % fill rule." }
  - { label: "Composite, ceramic or glass", href: "/guides/composite-ceramic-or-glass/", note: "Compare the tolerance with one pixel on the board." }
  - { label: "What reprojection error tells you", href: "/guides/reprojection-error/", note: "And what a low value can hide." }
---

## What makes a plate a HALCON plate

HALCON finds its own calibration plates automatically, but only plates laid out the way its operators expect. For plates with rectangularly arranged marks, that layout is the one `gen_caltab` describes.

- Black circular marks, all the same size, in a regular grid on a white field.
- A black frame around the grid. `find_caltab` looks for the bright field inside this frame.
- A black triangle in one corner of the frame. It tells HALCON which way round the plate is.

A plain dot grid without the frame and the triangle is not found. If you only need dots for OpenCV, the [circle grid](/targets/circlegrid-composite/) is the plate for that.

## Your layout, or ours

Plates in use differ in the number of marks and their spacing, and your HALCON program is written for one of them. So this plate is made to your layout.

**You already have a description file.** Send us the `.descr` file your program loads. We print the plate exactly as the file describes it: mark positions, mark size, frame and triangle.

**You are starting fresh.** Tell us the board size and how many marks you want. We set the mark distance so the plate fills the board and send you the drawing to confirm.

Either way you get a `.descr` file with the plate, in the format `gen_caltab` writes.

## Sizes

Five board sizes, with a layout that fits each as an example. The mark diameter is half the mark distance, the usual ratio.

**[200 × 150 mm](#CT-HAL-P-200X150-STD)**: for example 7 × 5 marks, 18 mm apart, 9 mm in diameter.

**[300 × 200 mm](#CT-HAL-P-300X200-STD)**: for example 9 × 6 marks, 22 mm apart, 11 mm in diameter.

**[400 × 300 mm](#CT-HAL-P-400X300-STD)**: for example 9 × 7 marks, 30 mm apart, 15 mm in diameter.

**[600 × 400 mm](#CT-HAL-P-600X400-STD)**: for example 11 × 7 marks, 45 mm apart, 22.5 mm in diameter.

**[800 × 600 mm](#CT-HAL-P-800X600-STD)**: for example 11 × 8 marks, 60 mm apart, 30 mm in diameter.

Pick the board so that it fills a good part of the image at your working distance; the [target size guide](/guides/calibration-target-size/) and the [FOV calculator](/tools/fov/) help with that.

More marks give more points per image, as long as each mark is still large enough in the image to be measured well.

## Using it in HALCON

Load the description file into a calibration data model with `set_calib_data_calib_object`, then call `find_calib_object` for every image. That one operator finds the plate, extracts the marks and stores them.

`calibrate_cameras` then solves for the camera parameters, lens distortion included. For a camera on a robot, the same observations feed `calibrate_hand_eye`.

In older programs the three steps are separate: `find_caltab`, `find_marks_and_pose`, then the calibration. The plate and the file work with both.

## Printed size and the description file

HALCON takes the mark positions from the description file, so the file has to match the plate you hold. On aluminum composite the marks are within ±0.3 mm + 0.2 mm/m of the nominal grid at 20 °C.

Every plate is measured before it ships. If your field of view is so small that a few tenths of a millimeter cover more than a pixel, a printed composite plate is the wrong tool; the [substrate guide](/guides/composite-ceramic-or-glass/) shows where that point is.

## Material and mounting

The board is 6 mm aluminum composite with a matte direct UV print, black on white. Matte matters here: a glossy reflection inside the frame breaks the bright field HALCON looks for.

Boards of 300 × 200 mm and larger have four M4 threaded inserts on the back. Any size can be clamped by the edge with the [mounting fixture](/targets/mounting-fixture/).

## What we cannot offer yet

Plates with hexagonally arranged marks, the newer HALCON layout with a `.cpd` file, are a custom order. Tell us which one you use when you [ask for a quote](/quote/?product=HALCON%20calibration%20plate).
