---
seoTitle: "Kalibr AprilGrid target, aluminum"
seoDescription: "The AprilGrid your Kalibr camera–IMU calibration expects: an AprilTag 36h11 in every cell, made to the stated tag size. Kalibr YAML from our free generator."
summary: "AprilGrid for your Kalibr camera–IMU and multi-sensor calibration"
decideSpecs:
  - "Feature position tolerance"
  - "Substrate"
  - "Flatness"
chips:
  - "±0.3 mm + 0.2 mm/m"
  - "6 mm"
  - "200–800 mm"
story: "If you calibrate with Kalibr, this is the board it is built around. Every cell holds an AprilTag 36h11 marker, so each grid point has its own ID. Move fast, tilt hard, cover part of the board with your hand — Kalibr still finds it. That is what your camera–IMU sequences need.\n\nWe supply the Kalibr YAML for your exact board. Load it and start recording, instead of measuring tags with a ruler."
skus:
  - partNumber: "CT-APR-P-200X150-T36"
    title: "AprilGrid 4 × 6, 25 mm tags, 7.5 mm gap, 200 × 150 mm, 24 tags"
  - partNumber: "CT-APR-P-300X200-T36"
    title: "AprilGrid 5 × 7, 30 mm tags, 9 mm gap, 300 × 200 mm, 35 tags"
  - partNumber: "CT-APR-P-400X300-T36"
    title: "AprilGrid 6 × 8, 35 mm tags, 10.5 mm gap, 400 × 300 mm, 48 tags"
  - partNumber: "CT-APR-P-600X400-T36"
    title: "AprilGrid 7 × 10, 45 mm tags, 13.5 mm gap, 600 × 400 mm, 70 tags"
  - partNumber: "CT-APR-P-800X600-T36"
    title: "AprilGrid 9 × 12, 50 mm tags, 15 mm gap, 800 × 600 mm, 108 tags"
relatedTargets:
  - { label: "ChArUco, aluminum", href: "/targets/charuco-composite/", note: "The coded board for OpenCV stereo and hand-eye work." }
  - { label: "Checkerboard, aluminum", href: "/targets/checkerboard-composite/", note: "The simplest pattern, when the whole board stays in view." }
  - { label: "Multi-camera target", href: "/targets/multi-camera-target/", note: "Several boards with separate ID ranges." }
  - { label: "Hand-eye calibration kit", href: "/targets/hand-eye-calibration-kit/", note: "Board and flange adapter for a camera on a robot." }
  - { label: "¼″ mounting fixture", href: "/targets/mounting-fixture/", note: "Clamps any board onto a tripod or lab post." }
relatedGuides:
  - { label: "Camera-IMU calibration with Kalibr", href: "/guides/kalibr-camera-imu-calibration/", note: "Target file, recording, running, reading the result." }
  - { label: "ChArUco vs checkerboard vs AprilGrid", href: "/guides/charuco-vs-checkerboard-vs-aprilgrid/", note: "Which pattern for which job." }
  - { label: "How big should your target be?", href: "/guides/calibration-target-size/", note: "The 60 % fill rule and pixels per marker bit." }
  - { label: "Multi-board marker IDs", href: "/guides/multi-board-marker-ids/", note: "Several boards in one scene." }
---

## What an AprilGrid is

An AprilGrid is a grid of AprilTag 36h11 markers with a small black square at every crossing of the gaps between them. The detector decodes each tag, so every tag corner comes back with a known position on the board.

Because each tag has its own ID, the board can be partly out of frame, partly covered by a hand, or seen for only a few frames, and the pose is still unambiguous. A [checkerboard](/targets/checkerboard-composite/) or a circle grid cannot do that.

This is why [Kalibr](/guides/kalibr-camera-imu-calibration/) is built around it. Camera-IMU calibration needs fast motion on all axes, and during fast motion the board keeps leaving the image.

The same board works outside Kalibr: OpenCV reads the tags with `cv2.aruco.DICT_APRILTAG_36h11`, and robotics stacks that already use AprilTag can detect it with their own detector.

## Choosing a size

Fill about 60 % of the image with the board at your working distance, and keep each marker bit at least 3 px across. A tag on this board is 10 cells wide, counting the two-cell black border Kalibr uses, so the tag should be at least 30 px across.

The [FOV calculator](/tools/fov/) gives the field of view and the image scale for your sensor, lens and distance.

**[CT-APR-P-200X150-T36](#CT-APR-P-200X150-T36)**, 4 × 6 tags of 25 mm with a 7.5 mm gap, 24 tags, about 0.2 kg. It fits a field about 330 mm wide at 0.83 mm per pixel or finer. It suits a small rig at close range, such as a camera module on a bench.

**[CT-APR-P-300X200-T36](#CT-APR-P-300X200-T36)**, 5 × 7 tags of 30 mm with a 9 mm gap, 35 tags, about 0.4 kg. It fits a field about 500 mm wide at 1 mm per pixel or finer. At about 0.4 kg it is easy to hold still in front of a handheld sensor rig.

**[CT-APR-P-400X300-T36](#CT-APR-P-400X300-T36)**, 6 × 8 tags of 35 mm with a 10.5 mm gap, 48 tags, about 0.8 kg. It fits a field about 670 mm wide at 1.17 mm per pixel or finer. The usual size for a drone or handheld camera-IMU unit at arm's length.

**[CT-APR-P-600X400-T36](#CT-APR-P-600X400-T36)**, 7 × 10 tags of 45 mm with a 13.5 mm gap, 70 tags, about 1.6 kg. It fits a field about 1 m wide at 1.5 mm per pixel or finer. For wider lenses or longer distances; mount it on a wall or a stand.

**[CT-APR-P-800X600-T36](#CT-APR-P-800X600-T36)**, 9 × 12 tags of 50 mm with a 15 mm gap, 108 tags, about 3.2 kg. It fits a field about 1.3 m wide at 1.67 mm per pixel or finer. For vehicle-mounted rigs and wide baselines; fix it to a wall.

In a camera-IMU sequence the board stands still and the sensor rig moves. Choose the size by the distance at which you can move the rig freely and still keep the tags readable, not by the closest distance you can reach.

Other grids, tag sizes and spacing ratios are a custom order; [ask for a quote](/quote/).

## The Kalibr target file

Kalibr reads the board from a YAML file. `tagSize` is the outer edge of the black square of one tag, in meters, and `tagSpacing` is the gap divided by the tag size. For the 400 × 300 mm board:

```yaml
target_type: 'aprilgrid'
tagCols: 8
tagRows: 6
tagSize: 0.035
tagSpacing: 0.3
```

Every board comes with this file filled in for its own grid. All sizes use a spacing ratio of 0.3, and IDs start at 0 at the bottom-left tag and run left to right, then upward, the way Kalibr numbers them.

`tagSize` is the number that matters most. An error of 1 % in it is an error of 1 % in every distance Kalibr estimates. That is the reason to use a board made to a stated tag size instead of a print you measure with a ruler.

## What is printed on the board

The tag grid is centered with a white quiet zone of at least one tag pitch on every side. Outside it, an edge strip carries the part number, the serial number and a 100 mm scale bar.

## Mounting

For camera-IMU work the board must not move at all during the recording. Fix it to a wall or a heavy stand; a board that sways on a light tripod shows up as noise in the result.

Boards from 300 × 200 mm up have four M4 threaded inserts on the rear. The [¼″ mounting fixture](/targets/mounting-fixture/) (CT-ACC-M-FIX14) clamps any size onto a tripod or a lab post.

## Material and print

The substrate is a 6 mm aluminum / LDPE / aluminum composite, flat to 0.5 mm per meter with the board on three points. The pattern is UV-printed, matte black on white, with an optical density of at least 1.6.

Tag centers are held to ±0.3 mm + 0.2 mm per meter of the nominal grid at 20 °C, with the mean tag pitch within ±0.05 mm. Every board is measured before it ships: dimensions, flatness and a visual check.

The matte print matters here more than elsewhere: a sensor rig moving in front of the board sees it from every angle, and a glossy surface would throw a reflection into some of the frames.

## Files and software

Each board comes with `.kalibr.yaml`, `.opencv.json` and a `.dxf` of the pattern. The [Kalibr guide](/guides/kalibr-camera-imu-calibration/) covers the IMU noise file, the recording and how to read the result.

To rehearse the motion before the board arrives, print the same grid with the [AprilGrid generator](/tools/generator/aprilgrid/). If the same rig also needs a stereo or hand-eye calibration in OpenCV, the [ChArUco board](/targets/charuco-composite/) is the better fit for that step.

If several boards share one scene, give each its own ID range; the [multi-board guide](/guides/multi-board-marker-ids/) explains how.

## Care and storage

Clean with water or isopropyl alcohol up to 70 % and a soft cloth. Store the board dry between −20 and +60 °C, flat or standing on its long edge. It works from −50 to +80 °C.
