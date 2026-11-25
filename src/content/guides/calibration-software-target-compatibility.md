---
title: "Which software reads which calibration target?"
description: "What OpenCV, ROS, Kalibr, MATLAB, HALCON, Cognex and pylon accept: patterns, how each counts rows and columns, ID and border rules, and the files they write."
date: 2026-11-25
updated: 2026-11-25
readingTime: "14 min"
keyRule: "Describe the board the way the program counts it before you print or order: OpenCV, ROS and Kalibr count a checkerboard by its inner corners, so a 10 × 7 board is 9 × 6 to them, and a board with an even number of squares on both sides loses its orientation in every second view."
related: ["charuco-vs-checkerboard-vs-aprilgrid", "opencv-camera-calibration", "kalibr-camera-imu-calibration", "corner-detection-troubleshooting", "multi-board-marker-ids", "calibration-target-size", "hand-eye-calibration-opencv"]
products: ["checkerboard-composite", "charuco-composite", "aprilgrid-composite", "circlegrid-composite", "halcon-composite"]
sampleFiles: []
faq:
  - q: "Does a 9 × 6 checkerboard mean 9 × 6 squares or 9 × 6 corners?"
    a: "It depends on the program. OpenCV's patternSize, ROS camera_calibration's --size and Kalibr's targetRows and targetCols count inner corners, so 9 × 6 is a board of 10 × 7 squares. MATLAB and HALCON's point tuple take the square size and work out the rest. Our generator and converter label both numbers."
  - q: "Can I use a ChArUco board with Kalibr?"
    a: "No. Kalibr has three target types: aprilgrid, checkerboard and circlegrid. For camera–IMU work use an AprilGrid of tag36h11 markers with a two-bit border; a checkerboard works for cameras only. The converter refuses a ChArUco to Kalibr conversion for this reason."
  - q: "Why does OpenCV find no corners on my ChArUco board when the markers are clearly visible?"
    a: "Usually the board object does not match the print: the markers start at an ID other than 0, the dictionary is different, or the board was made with the legacy layout. In our test a legacy 10 × 8 board gave 0 corners in 20 views against the current layout and 1095 against the legacy one."
  - q: "Can HALCON use a plain checkerboard instead of its own plate?"
    a: "Yes, as a user-defined calibration object: pass the corner coordinates in meters as one tuple of X, then Y, then Z values to set_calib_data_calib_object, detect the corners yourself and hand them to set_calib_data_observ_points. find_calib_object and its contour-based accuracy work only with HALCON's own plates."
  - q: "Can I paste OpenCV distortion coefficients into HALCON or Kalibr?"
    a: "Into Kalibr yes, as radtan with the first four values (k1, k2, p1, p2); into ROS yes, as plumb_bob with all five. Not into HALCON: its division and polynomial models are defined in metric image-plane units with their own parameters, so recalibrate there or convert the model, not the numbers."
---

A calibration board is a sheet of geometry, and every program describes that geometry in its own words. One counts squares, the next counts corners; one measures the gap between tags in millimeters, the next as a fraction of the tag.

One starts its marker IDs at the top left, the next at the bottom left.

Most "the board is not detected" tickets we see are not detection problems. They are a correct board described to the software in the wrong words, or a board bought for one program and used in another.

This guide lists what eight programs accept and how each one wants a board described: OpenCV, ROS camera_calibration, Kalibr, MATLAB, HALCON, Cognex VisionPro and In-Sight, and Basler pylon vTools.

It then shows the conventions that bite when a board moves between them, with measurements where a convention can be measured.

Every number comes from synthetic boards rendered through a 1280 × 1024 camera with known distortion and run through OpenCV 4.14; the method section says how. Parameter names and rules for the other programs come from their reference documentation.

## What each program accepts

| Pattern | OpenCV | ROS camera_calibration | Kalibr | MATLAB | HALCON | VisionPro / In-Sight | pylon vTools |
|---|---|---|---|---|---|---|---|
| Checkerboard | yes | `chessboard` | `checkerboard` | yes | as a point object | yes, with or without fiducial | no |
| Symmetric circle grid | yes | `circles` | `circlegrid` | yes, not for stereo | as a point object | dots, with or without fiducial | no |
| Asymmetric circle grid | yes | `acircles` | `circlegrid`, asymmetric | yes | as a point object | no | no |
| ChArUco | yes | `charuco` | no | yes | as a point object | no | no |
| AprilGrid / AprilTag | yes, `DICT_APRILTAG_*` | no | `aprilgrid` | AprilGrid | as a point object | no | no |
| HALCON plate, hexagonal marks | no | no | no | no | `find_calib_object` | no | no |
| HALCON plate, rectangular marks | no | no | no | no | `find_calib_object` | no | no |
| Cognex fiducial checkerboard | as a plain checkerboard | as a plain checkerboard | as a plain checkerboard | as a plain checkerboard | as a point object | yes | no |
| Basler circle plate (`.pcal`) | no | no | no | no | no | no | yes |

"As a point object" means the program does not detect that pattern itself; you detect the features elsewhere and pass image points and their board coordinates.

Two things the table cannot show: how each program counts the pattern, and what it writes out. Those come next.

## 1. OpenCV

OpenCV detects checkerboards, symmetric and asymmetric circle grids, ArUco and AprilTag markers, ChArUco boards and ArUco grid boards. It writes nothing on its own; your script saves the camera matrix and distortion coefficients, usually with `cv2.FileStorage` (XML, YAML or JSON) or NumPy.

The counting rule is the one most often got wrong: `patternSize` is the number of inner corners for a checkerboard and the number of circles for a circle grid, given as (columns, rows). A board of 10 × 7 squares is `(9, 6)`.

| Call | What you pass | Given 10 × 7 squares or 7 × 5 circles | Found in 20 views, swapped order |
|---|---|---|---|
| `findChessboardCornersSB` | inner corners | `(9, 6)` | `(6, 9)` 20 of 20, `(10, 7)` 0 of 20 |
| `findCirclesGrid`, symmetric | circles | `(7, 5)` | `(5, 7)` 20 of 20 |
| `findCirclesGrid`, asymmetric | circles per row, rows | `(4, 11)` | `(11, 4)` 0 of 20 |
| `CharucoBoard` | squares | `(10, 7)` | n/a |

Checkerboards and symmetric grids forgive a swapped order; the asymmetric grid does not, and passing squares instead of corners finds nothing. The asymmetric grid's object points are `((2 * col + row % 2) * d, row * d)`, where `d` is half the spacing within a row.

ChArUco boards are detected against a `CharucoBoard` object, and the object has to match the print in dictionary, first marker ID and layout. Step 8 measures what happens when it does not.

AprilTag families are dictionaries like any other: `DICT_APRILTAG_36h11` with `ArucoDetector`. OpenCV assumes a one-bit black border unless `DetectorParameters.markerBorderBits` says otherwise; a Kalibr AprilGrid has two.

## 2. ROS camera_calibration

The `cameracalibrator` node of `image_pipeline` knows four patterns, chosen with `--pattern`: `chessboard`, `circles`, `acircles` and `charuco`. There is no AprilGrid and no plain ArUco grid.

`--size` is given as columns × rows and counts what OpenCV counts: inner corners for `chessboard`, circles for `circles`, circles per row × rows for `acircles` and squares for `charuco`. `--square` is the square or circle spacing in meters; a 30 mm square is `--square 0.030`.

A ChArUco board adds `--charuco_marker_size` in meters and `--aruco_dict`, with values such as `4x4_50`, `5x5_100` or `aruco_orig`. The node builds its board with marker IDs from 0 in the current OpenCV layout; a board printed from another start ID, or in the legacy layout, is not found.

The output is `calibrationdata.tar.gz` with the images, `ost.yaml` and `ost.txt`; the COMMIT button sends the same values to the driver through `set_camera_info`.

The `camera_info` YAML carries `camera_matrix`, `distortion_model` (`plumb_bob`, `rational_polynomial` or `equidistant`), `distortion_coefficients`, `rectification_matrix` and `projection_matrix`.

The [format converter](/tools/convert/) writes the command line for a board in our generator format, and refuses boards the node cannot build.

## 3. Kalibr

Kalibr reads the target from a YAML file with `target_type` set to `aprilgrid`, `checkerboard` or `circlegrid`. There is no ChArUco and no ArUco target.

| `target_type` | Keys | What they count |
|---|---|---|
| `aprilgrid` | `tagCols`, `tagRows`, `tagSize`, `tagSpacing` | tags; `tagSize` in meters is the black outer edge; `tagSpacing` is the gap as a fraction of `tagSize` |
| `checkerboard` | `targetCols`, `targetRows`, `colSpacingMeters`, `rowSpacingMeters` | inner corners; spacing in meters |
| `circlegrid` | `targetCols`, `targetRows`, `spacingMeters`, `asymmetricGrid` | circles; `asymmetricGrid: True` for the offset layout |

Three things are easy to get wrong. The AprilGrid tags are `tag36h11` with a two-bit black border, and ID 0 sits at the bottom left with IDs increasing to the right and then upward, the opposite of OpenCV's `GridBoard`.

`tagSpacing` is a ratio: a 30 mm tag with a 9 mm gap is `tagSpacing: 0.3`, not `0.009`. And the checkerboard keys count inner corners, as in OpenCV.

Camera and distortion models are given on the command line as `pinhole-radtan`, `pinhole-equi`, `omni-radtan` and so on.

The result is a `camchain` YAML per camera with `camera_model`, `intrinsics` as `[fu, fv, pu, pv]`, `distortion_model`, `distortion_coeffs`, `resolution` and `rostopic`; `radtan` takes four coefficients, `k1 k2 p1 p2`, with no `k3`.

The [Kalibr guide](/calibacademy/kalibr-camera-imu-calibration/) walks through the target file, the recording and the camera–IMU run.

## 4. MATLAB

The Camera Calibrator and Stereo Camera Calibrator apps accept a checkerboard, a symmetric or asymmetric circle grid, an AprilGrid, a ChArUco board, or a custom detector you write yourself. You give the square size, or the circle spacing, or the tag and checker sizes; the apps count the pattern.

The checkerboard rule is explicit in the documentation: use an even number of squares along one edge and an odd number along the other. The longer side becomes the x direction, and a square board can produce unexpected extrinsics. Step 8 shows why this rule exists.

Circle grids need circles of at least 50 px diameter in the image. The symmetric grid cannot be used for stereo because it looks the same turned 180°; the asymmetric grid can. For an AprilGrid the tag IDs must be sequential with an increment of 1, and the tag with the lowest ID is the origin.

For a ChArUco board the app takes the number of squares vertically and horizontally, the checker size and the marker size; the origin is the lower-right corner of the top-left square.

The calibration is saved as a `cameraParameters` object in a `.mat` file or exported to a script. Its older `IntrinsicMatrix` property is the transpose of OpenCV's camera matrix; the newer `K` property has OpenCV's orientation.

## 5. HALCON

HALCON finds its own plates and nothing else automatically. There are two: the plate with hexagonally arranged marks, described by a `.cpd` file from `create_caltab`, and the older plate with rectangularly arranged marks inside a black frame with a triangle in one corner.

The rectangular plate is described by a `.descr` file from `gen_caltab`.

The description file is the target definition: it holds the mark positions and radii, the rim, the polarity and the finder patterns. Use the file that came with the plate; HALCON's own documentation warns that a printed plate may not match the file it was generated from.

The workflow is `create_calib_data`, `set_calib_data_cam_param` with a camera type such as `area_scan_division` or `area_scan_polynomial`, `set_calib_data_calib_object` with the description file, then `find_calib_object` per image and `calibrate_cameras`.

`find_calib_object` needs at least one finder pattern visible on a hexagonal plate, or the frame and triangle on a rectangular one.

Any other pattern is a user-defined calibration object. `set_calib_data_calib_object` also accepts a flat tuple of 3D coordinates in meters, all X values, then all Y, then all Z.

You detect the features with your own code and pass the image rows and columns with `set_calib_data_observ_points`, together with a rough pose. The contour-based refinement of `find_calib_object` is not available this way.

Camera parameters are written with `write_cam_par` to a text file, by default `.dat`. The division model has one distortion parameter `Kappa` and the polynomial model five, but both are defined on the metric image plane together with the pixel size `Sx`, `Sy` and the focal length in meters.

They are not OpenCV's `k1`–`k3`, `p1`, `p2`, and the numbers cannot be pasted across.

Our [HALCON plate](/targets/halcon-composite/) is made to your `.descr` file or mark count; the [converter](/tools/convert/) writes a checkerboard or ChArUco board as the point tuple for `set_calib_data_calib_object`.

## 6. Cognex VisionPro and In-Sight

VisionPro's checkerboard calibration tool takes a checkerboard with or without a fiducial. The standard fiducial is an L-shaped mark of a 1 × 5 and a 1 × 3 tile bar; it sets the origin, the x and y axes and the handedness.

DataMatrix fiducial plates label vertices with codes that also carry the grid pitch and allow partial views, with one code per region.

A plain checkerboard works too, with the origin at the vertex nearest the image center. You must tell the tool whether a fiducial is present; if the setting and the plate disagree it does not compute a valid calibration.

Tiles must be square within an aspect ratio of 0.90 to 1.10, at least 9 full tiles must be visible and each tile at least 15 × 15 px.

In-Sight's `CalibrateGrid` has four grid types: "Checkerboard, with fiducial", "Checkerboard, no fiducial", "Dots, with fiducial" and "Dots, no fiducial".

Grid Spacing is the square size or the dot pitch in microns, millimeters, centimeters or inches; the lens model is Radial or Projection; 1 to 30 poses.

The dot grid with fiducial carries a coded symbol that sets the spacing and units automatically for fifteen preset values, among them 1, 2, 5, 10, 20, 50 and 100 mm.

Checks must be at least 15 px wide and can be read up to 45° off perpendicular; dots 6 to 50 px in diameter, 15 to 30 recommended, up to 30° off perpendicular.

Outside Cognex software the fiducial is simply a few black tiles in the pattern. OpenCV's chessboard detectors cannot see through it, so give them the largest clean rectangle of corners instead of the whole plate.

## 7. Basler pylon vTools

The Calibration vTool in pylon works from a circle plate with finder patterns, chosen from a list in the wizard: 60, 120, 240 and 400 mm plates are built in. A custom plate comes from Basler as a PDF plus a `.pcal` file that you load with "Select custom plate"; print it at 100 % scaling.

The plate must cover the camera's field of view completely, or at least one finder pattern must be in the image if the plate is larger than the field.

Each circle should be at least 20 px across, and the plate must lie on a firm flat surface, because the result is a transformation from pixels to world coordinates in one plane.

The Pro edition adds a choice of distortion model, division with one coefficient or polynomial with five, and of projection, perspective or parallel for telecentric lenses.

The output is the rectified image and the pixel-to-world transformation inside the recipe, not a camera matrix you would carry to another program.

## 8. Conventions that bite

### Squares, corners and the 180° flip

The rule MATLAB states, one even and one odd side, is about orientation. A board with an even number of squares on both sides, or an odd number on both, looks the same turned 180°, and a detector cannot tell which end is which.

We detected each board as rendered and again rotated by 180° in the image, and asked whether corner 0 stayed on the same physical corner.

| Squares | Inner corners | `findChessboardCornersSB` | `findChessboardCorners` |
|---|---|---|---|
| 10 × 7 | 9 × 6 | 12 of 12 views same corner | 12 of 12 |
| 9 × 7 | 8 × 6 | 1 of 12 | 0 of 12 |
| 8 × 8 | 7 × 7 | 0 of 12 | 0 of 12 |
| 9 × 9 | 8 × 8 | 0 of 12 | 0 of 12 |

For single-camera intrinsics this does not matter: a flipped ordering is still a valid pose. For stereo, hand-eye or any use where two detections of one view must agree, it matters in every second image. Choose 10 × 7, 11 × 8, 9 × 6 squares; avoid 8 × 8 and 9 × 7.

The circle grids behave the same way: the symmetric grid is ambiguous, which is why MATLAB excludes it from stereo and why the asymmetric grid exists.

### ChArUco: dictionary, first ID and layout

A ChArUco print is defined by five things: squares, square size, marker size, dictionary and the ID of the first marker, plus the layout since OpenCV 4.6 changed which square is black at the top left. The software's board object must match all of them.

| Printed board | Detected against | Views | Corners |
|---|---|---|---|
| 10 × 7, `DICT_4X4_100`, IDs from 0 | the same board | 20 | 1017 |
| 10 × 7, IDs from 20 | IDs from 0 | 20 | 327 |
| 10 × 7, IDs from 20 | IDs from 20 | 20 | 963 |
| 10 × 8, legacy layout | current layout | 0 | 0 |
| 10 × 8, legacy layout | legacy layout | 20 | 1095 |
| 10 × 7, legacy layout | current layout | 20 | 988 |

Two of these rows are traps. The ID-20 board detected as an ID-0 board still returned a third of the corners, because markers 20 to 34 exist in both definitions, four rows apart; the pose is off by four rows while the intrinsics look fine.

And the legacy layout only differs on boards with an even number of rows, so the same program can work on one board and fail on the next.

ROS camera_calibration builds its board with IDs from 0 and the current layout, with no option to change either.

For a second board in the same rig, start its IDs where the first one ends and keep the start ID in the file name; the [multi-board guide](/calibacademy/multi-board-marker-ids/) has the numbers.

### AprilGrid: border bits and where ID 0 sits

A Kalibr AprilGrid is detectable in OpenCV with `DICT_APRILTAG_36h11`, but only if two settings follow the print. The tags carry a two-bit black border: with the default `markerBorderBits = 1` the detector found 87 tags in 20 views of a 6 × 6 grid; with `markerBorderBits = 2` it found 633.

The second setting is the layout of the object points. Kalibr puts tag 0 at the bottom left with y pointing up; OpenCV's `GridBoard` puts it at the top left with y pointing down.

The same 633 detections calibrated against a board built in Kalibr's layout gave an RMS of 0.66 px and the focal length within 0.4 %; against a plain `GridBoard` the RMS was 25 px and the focal length 49 % too long.

```python
import numpy as np, cv2

TAG, SPACING, NT = 30.0, 0.3, 6          # tagSize in mm, tagSpacing as a ratio, tags per side
GAP = TAG * SPACING
ADICT = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_APRILTAG_36h11)

def kalibr_board():
    """cv2.aruco.Board with Kalibr's AprilGrid frame: ID 0 bottom left, x right, y up."""
    pitch = TAG + GAP
    pts, ids = [], []
    for r in range(NT):
        for c in range(NT):
            x0, y0 = c * pitch, r * pitch
            # OpenCV marker corners: top-left, top-right, bottom-right, bottom-left, tag upright
            pts.append(np.array([[x0, y0 + TAG, 0], [x0 + TAG, y0 + TAG, 0],
                                 [x0 + TAG, y0, 0], [x0, y0, 0]], np.float32))
            ids.append(r * NT + c)
    return cv2.aruco.Board(pts, ADICT, np.array(ids))

params = cv2.aruco.DetectorParameters()
params.markerBorderBits = 2                 # Kalibr tags have a two-bit border
params.cornerRefinementMethod = cv2.aruco.CORNER_REFINE_SUBPIX
detector = cv2.aruco.ArucoDetector(ADICT, params)
```

A `GridBoard` with the row order of its IDs reversed gives the same result as this function; the point is that the IDs and the y direction have to agree with the print, not which constructor you use.

### Units and ratios

OpenCV takes any unit as long as it is the same everywhere; the camera matrix is in pixels regardless. ROS, Kalibr and HALCON take meters. MATLAB takes the unit you pick in the dialog. Kalibr's `tagSpacing` is a ratio; OpenCV's `GridBoard` `markerSeparation` is a length.

## 9. One board, four descriptions

The same 10 × 7 board of 30 mm squares, written for each program:

```python
cols_sq, rows_sq, square_mm = 10, 7, 30.0      # squares, as printed

opencv_pattern_size = (cols_sq - 1, rows_sq - 1)          # inner corners: (9, 6)
ros_size = f"{cols_sq - 1}x{rows_sq - 1}"                 # --size 9x6 --square 0.030
kalibr = {"target_type": "checkerboard",
          "targetRows": rows_sq - 1, "targetCols": cols_sq - 1,   # inner corners
          "rowSpacingMeters": square_mm / 1000, "colSpacingMeters": square_mm / 1000}
matlab_square_mm = square_mm                              # the app asks for the square size only
# HALCON: a user-defined calibration object is a tuple of X, then Y, then Z, in meters
X = [c * square_mm / 1000 for r in range(rows_sq - 1) for c in range(cols_sq - 1)]
Y = [r * square_mm / 1000 for r in range(rows_sq - 1) for c in range(cols_sq - 1)]
Z = [0.0] * len(X)
halcon_tuple = X + Y + Z
```

The [format converter](/tools/convert/) does this for checkerboards, circle grids, ChArUco boards and AprilGrids between OpenCV JSON, Kalibr YAML, the ROS command line and the HALCON tuple, and says why when a board cannot be expressed in a format.

## 10. One calibration, three files

The programs also disagree on what comes out. The table lists what each writes and what it is called.

| Program | File | Intrinsics | Distortion |
|---|---|---|---|
| OpenCV | whatever you save, often `FileStorage` YAML | 3 × 3 camera matrix, px | `k1 k2 p1 p2 k3` and optionally `k4 k5 k6 s1–s4 τx τy`; fisheye `k1–k4` |
| ROS | `camera_info` YAML, `ost.yaml` | `camera_matrix`, `projection_matrix` | `plumb_bob` (5), `rational_polynomial` (8), `equidistant` (4) |
| Kalibr | `camchain-*.yaml` | `intrinsics: [fu, fv, pu, pv]` | `radtan` (4), `equidistant` (4) |
| MATLAB | `cameraParameters` in `.mat` | `K` or `IntrinsicMatrix` | `RadialDistortion` (2 or 3), `TangentialDistortion` (2) |
| HALCON | `.dat` from `write_cam_par` | focal length in m, `Sx Sy Cx Cy` | `Kappa` (division) or `K1 K2 K3 P1 P2` (polynomial), metric |
| VisionPro / In-Sight | tool state, job file | pixel-to-world transform | inside the transform |
| pylon vTools | recipe | pixel-to-world transform | inside the transform |

Between OpenCV, ROS and Kalibr the numbers do carry over, because all three use the same pinhole plus Brown–Conrady model. This writes an OpenCV result as both:

```python
import numpy as np, yaml

# camera_matrix and dist from cv2.calibrateCamera (5 coefficients, k1 k2 p1 p2 k3)
w, h = 1280, 1024
camera_matrix = np.array([[998.6, 0, 641.2], [0, 998.9, 511.4], [0, 0, 1]])
dist = np.array([-0.1996, 0.0493, 0.0010, -0.0005, 0.0])

fx, fy, cx, cy = camera_matrix[0, 0], camera_matrix[1, 1], camera_matrix[0, 2], camera_matrix[1, 2]

camera_info = {
    "image_width": w, "image_height": h, "camera_name": "cam0",
    "camera_matrix": {"rows": 3, "cols": 3, "data": camera_matrix.ravel().tolist()},
    "distortion_model": "plumb_bob",                       # k1 k2 p1 p2 k3, same order as OpenCV
    "distortion_coefficients": {"rows": 1, "cols": 5, "data": dist[:5].tolist()},
    "rectification_matrix": {"rows": 3, "cols": 3, "data": np.eye(3).ravel().tolist()},
    "projection_matrix": {"rows": 3, "cols": 4,
                          "data": np.hstack([camera_matrix, np.zeros((3, 1))]).ravel().tolist()},
}
camchain = {"cam0": {
    "camera_model": "pinhole",
    "intrinsics": [float(fx), float(fy), float(cx), float(cy)],   # fu fv pu pv
    "distortion_model": "radtan",
    "distortion_coeffs": dist[:4].tolist(),                       # k1 k2 p1 p2; radtan has no k3
    "resolution": [w, h],
    "rostopic": "/cam0/image_raw",
}}
open("camera_info.yaml", "w").write(yaml.safe_dump(camera_info, sort_keys=False))
open("camchain.yaml", "w").write(yaml.safe_dump(camchain, sort_keys=False))
```

Dropping `k3` for Kalibr is harmless when OpenCV returned it near zero, as it does for most lenses under 90°; if `k3` carries weight, recalibrate in Kalibr rather than truncate. Into HALCON nothing carries over: recalibrate there, with its plate or with your corners as a point object.

## Checks before you print or order

- Write the board down the way the target program counts it, and keep the square count next to it. "10 × 7 squares, 9 × 6 corners, 30 mm" is unambiguous; "9 × 6" alone is not.

- For stereo, hand-eye or multi-camera work, one side even and one side odd. Check it with the 180° test above on two images of your own board.

- For ChArUco, record dictionary, start ID and layout with the board, and check the program can set all three. ROS camera_calibration cannot.

- For an AprilGrid outside Kalibr, set two border bits and build the object points with ID 0 at the bottom left.

- For HALCON, use the description file that came with the plate; for Cognex, tell the tool whether the fiducial is there; for pylon, use the `.pcal` file and cover the field of view.

- Run one detection on the first print before the batch, with the detection check at [/tools/check/](/tools/check/) or your own code, and compare the corner count to what the geometry says it should be.

## Common problems

| What you see | Likely cause | Fix |
|---|---|---|
| OpenCV finds nothing on a board you can see clearly | `patternSize` given in squares | Pass inner corners, (columns, rows) |
| Asymmetric grid never found | Rows and columns swapped | `(circles per row, rows)`, for example `(4, 11)` |
| Stereo pairs disagree in half the views | Board symmetric under 180° | One even and one odd side |
| ChArUco: markers found, no corners | Wrong dictionary, start ID or layout | Match the board object to the print |
| ChArUco works on one board, fails on the next | Legacy layout on an even-row board | Set the layout per board |
| Kalibr rejects the YAML | Checkerboard given in squares, or `tagSpacing` in meters | Inner corners; ratio |
| Kalibr tags not found in OpenCV | One-bit border assumed | `markerBorderBits = 2` |
| AprilGrid RMS of tens of pixels in OpenCV | ID 0 at the wrong corner | Build the board with ID 0 bottom left |
| HALCON `find_calib_object` fails on a printed plate | Not a HALCON plate, or wrong description file | Use the plate's own `.cpd` / `.descr`, or go through `set_calib_data_observ_points` |
| Cognex tool gives no calibration | Fiducial setting does not match the plate | Set the fiducial option to what is printed |
| MATLAB pose jumps between images | Square board, or symmetric circle grid | Even × odd checkerboard or asymmetric grid |
| HALCON result wrong after pasting OpenCV coefficients | Different distortion model and units | Recalibrate in HALCON |

## Next steps

- [ChArUco vs checkerboard vs AprilGrid](/calibacademy/charuco-vs-checkerboard-vs-aprilgrid/): which pattern to pick once you know what your software accepts.

- [Camera calibration with OpenCV](/calibacademy/opencv-camera-calibration/): the full intrinsics pipeline for the first column of the table.

- [Kalibr camera–IMU calibration](/calibacademy/kalibr-camera-imu-calibration/): the AprilGrid file, the recording and the result files.

- [Multiple boards in one rig](/calibacademy/multi-board-marker-ids/): start IDs and dictionaries when more than one board is in view.

- The [format converter](/tools/convert/) rewrites a board between OpenCV, Kalibr, ROS and HALCON; the [pattern generator](/tools/generator/) exports each board with its counts in all of them.

- Our [checkerboards](/targets/checkerboard-composite/), [ChArUco boards](/targets/charuco-composite/) and [AprilGrids](/targets/aprilgrid-composite/) come with the same files.

## Method

Boards were rendered pixel by pixel through a 1280 × 1024 pinhole camera with a 1000 px focal length and OpenCV distortion `k1 −0.20, k2 0.05, p1 0.001, p2 −0.0005`.

Every output pixel was mapped back through the distortion model to the board plane, supersampled 2 × 2, with a 0.8 px blur and read noise.

Each board was rendered in 20 random views at 0.9 to 1.4 m with tilts of 5 to 35° and in-plane rotations within ±15°; the 180° test rotated each rendered image by half a turn and detected it again.

ChArUco and AprilGrid images came from OpenCV's own generators, the AprilGrid tags with a two-bit border.

Detection and calibration used OpenCV 4.14 with `findChessboardCornersSB`, `findChessboardCorners`, `findCirclesGrid`, `CharucoDetector` and `ArucoDetector`; the AprilGrid rows used sub-pixel corner refinement. The two code blocks in steps 9 and 10 were run as printed and their files read back.

The rules quoted for ROS, Kalibr, MATLAB, HALCON, Cognex and Basler are from each product's reference documentation as of November 2026; versions and option names change, so check the page for your release. Write to hello@calib.tools for the scripts.
