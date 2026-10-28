#!/usr/bin/env python3
"""Generate reference ArUco marker PNGs from OpenCV for vitest verification.

Outputs one PNG per dictionary, containing markers 0, 1, and the last id,
at (markerSize+2)*10 pixels. The vitest reads these PNGs and compares
against decodeMarkerBits() output — no Python required at test time.
"""
import pathlib
import cv2
from cv2 import aruco

DICTS = {
    "DICT_4X4_50":          (aruco.DICT_4X4_50,          50),
    "DICT_5X5_100":         (aruco.DICT_5X5_100,         100),
    "DICT_6X6_250":         (aruco.DICT_6X6_250,         250),
    "DICT_7X7_1000":        (aruco.DICT_7X7_1000,        1000),
    "DICT_ARUCO_ORIGINAL":  (aruco.DICT_ARUCO_ORIGINAL,  1024),
    "DICT_ARUCO_MIP_36h12": (aruco.DICT_ARUCO_MIP_36h12, 250),
}

out_dir = pathlib.Path(__file__).resolve().parent.parent / "tests" / "fixtures" / "aruco"
out_dir.mkdir(parents=True, exist_ok=True)

for name, (dict_id, count) in DICTS.items():
    d = aruco.getPredefinedDictionary(dict_id)
    n = d.markerSize
    img_size = (n + 2) * 10

    # Generate markers 0, 1, and last
    for mid in [0, 1, count - 1]:
        img = aruco.generateImageMarker(d, mid, img_size)
        fname = f"{name}_id{mid}.png"
        cv2.imwrite(str(out_dir / fname), img)

    print(f"  {name}: 3 reference PNGs ({n}x{n})")

print(f"\nWrote to {out_dir}")
print(f"OpenCV version: {cv2.__version__}")
