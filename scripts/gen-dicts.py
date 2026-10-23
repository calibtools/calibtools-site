#!/usr/bin/env python3
"""Generate ArUco dictionary JSON files from OpenCV.

Output format per file:
{
  "name": "DICT_6X6_250",
  "markerSize": 6,
  "maxCorrectionBits": 5,
  "count": 250,
  "bits": ["hex string per marker row-major, MSB first"]
}

Also prints marker 0 and marker 1 hex for checksum tests.
"""
import json, sys, pathlib
import cv2
from cv2 import aruco

DICTS = {
    "DICT_4X4_50":          aruco.DICT_4X4_50,
    "DICT_5X5_100":         aruco.DICT_5X5_100,
    "DICT_6X6_250":         aruco.DICT_6X6_250,
    "DICT_7X7_1000":        aruco.DICT_7X7_1000,
    "DICT_ARUCO_ORIGINAL":  aruco.DICT_ARUCO_ORIGINAL,
    "DICT_ARUCO_MIP_36h12": aruco.DICT_ARUCO_MIP_36h12,
}

out_dir = pathlib.Path(__file__).resolve().parent.parent / "src" / "lib" / "dicts"
out_dir.mkdir(parents=True, exist_ok=True)

checksums = {}

for name, dict_id in DICTS.items():
    d = aruco.getPredefinedDictionary(dict_id)
    marker_size = d.markerSize
    max_corr = d.maxCorrectionBits
    count = len(d.bytesList)

    bits = []
    for i in range(count):
        raw = d.bytesList[i].flatten()
        bits.append(raw.tobytes().hex())

    data = {
        "name": name,
        "markerSize": int(marker_size),
        "maxCorrectionBits": int(max_corr),
        "count": int(count),
        "bits": bits,
    }

    outfile = out_dir / f"{name}.json"
    with open(outfile, "w") as f:
        json.dump(data, f)
    print(f"  wrote {outfile.name}: {count} markers, {marker_size}x{marker_size}")

    checksums[name] = {"marker0": bits[0], "marker1": bits[1]}

print("\n// Paste into dicts.test.ts as ARUCO_CHECKSUMS:")
print("const ARUCO_CHECKSUMS: Record<string, {marker0: string; marker1: string}> = {")
for name, cs in checksums.items():
    print(f'  "{name}": {{ marker0: "{cs["marker0"]}", marker1: "{cs["marker1"]}" }},')
print("};")
