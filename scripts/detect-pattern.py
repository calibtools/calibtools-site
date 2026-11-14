#!/usr/bin/env python3
"""Detect a calibration pattern in one image and print the counts as JSON.

Usage: detect-pattern.py <image> <pattern> <cols> <rows> [dict]
  pattern: checkerboard | charuco | circles | aprilgrid
  cols, rows: squares (checkerboard, charuco), dots (circles) or tags (aprilgrid)
  dict: OpenCV ArUco dictionary name for charuco (default DICT_5X5_100)

Prints {"expected": {...}, "found": {...}}. Used by scripts/check-image-batch.mjs.
"""
import json
import sys

import cv2

path, pattern, cols, rows = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
dict_name = sys.argv[5] if len(sys.argv) > 5 else "DICT_5X5_100"

img = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
if img is None:
    print(json.dumps({"error": "cannot read image"}))
    sys.exit(0)

out = {}
if pattern == "checkerboard":
    inner = (cols - 1, rows - 1)
    ok, corners = cv2.findChessboardCornersSB(img, inner, flags=cv2.CALIB_CB_EXHAUSTIVE)
    out = {"expected": {"corners": inner[0] * inner[1]}, "found": {"corners": int(len(corners)) if ok else 0}}
elif pattern == "charuco":
    d = cv2.aruco.getPredefinedDictionary(getattr(cv2.aruco, dict_name))
    board = cv2.aruco.CharucoBoard((cols, rows), 1.0, 0.75, d)
    detector = cv2.aruco.CharucoDetector(board)
    ch_corners, ch_ids, m_corners, m_ids = detector.detectBoard(img)
    expected_markers = (cols * rows) // 2
    valid = set(range(expected_markers))
    ids = [] if m_ids is None else [int(i) for i in m_ids.flatten()]
    out = {
        "expected": {"markers": expected_markers, "corners": (cols - 1) * (rows - 1)},
        "found": {
            "markers": len([i for i in ids if i in valid]),
            "foreignMarkers": len([i for i in ids if i not in valid]),
            "corners": 0 if ch_ids is None else int(len(ch_ids)),
        },
    }
elif pattern == "circles":
    ok, centers = cv2.findCirclesGrid(img, (cols, rows), flags=cv2.CALIB_CB_SYMMETRIC_GRID)
    out = {"expected": {"dots": cols * rows}, "found": {"dots": int(len(centers)) if ok else 0}}
elif pattern == "aprilgrid":
    d = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_APRILTAG_36h11)
    det = cv2.aruco.ArucoDetector(d, cv2.aruco.DetectorParameters())
    _, ids, _ = det.detectMarkers(img)
    expected = cols * rows
    found = [] if ids is None else [int(i) for i in ids.flatten()]
    out = {
        "expected": {"tags": expected},
        "found": {"tags": len([i for i in found if i < expected]), "foreignMarkers": len([i for i in found if i >= expected])},
    }
else:
    out = {"error": f"unknown pattern {pattern}"}

print(json.dumps(out))
