#!/usr/bin/env python3
"""Generate ArUco dictionary JSON files from OpenCV's canonical marker images.

Reads each marker via cv2.aruco.generateImageMarker() — the same function users
call to verify — and packs the inner data bits into hex.

Packing format (row-major, MSB-first, padded per row):
  bytesPerRow = ceil(markerSize / 8)
  For each row r:
    bits[r*bytesPerRow + floor(c/8)] bit (7 - c%8) = grid[r][c]
  Matches decodeMarkerBits() in dicts.ts.

Output per file:
{
  "name": "DICT_6X6_250",
  "markerSize": 6,
  "maxCorrectionBits": 5,
  "count": 250,
  "bits": ["hex string per marker"]
}
"""
import json
import pathlib
import sys

import cv2
from cv2 import aruco
import numpy as np

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


def extract_bits_from_image(dict_obj, marker_id, marker_size):
    """Render a marker via generateImageMarker and read inner data bits."""
    cell = 10
    img_size = (marker_size + 2) * cell  # +2 for 1-cell border each side
    img = aruco.generateImageMarker(dict_obj, marker_id, img_size)
    _, bw = cv2.threshold(img, 127, 255, cv2.THRESH_BINARY)
    grid = []
    for r in range(marker_size):
        row = []
        for c in range(marker_size):
            y = (r + 1) * cell + cell // 2
            x = (c + 1) * cell + cell // 2
            row.append(1 if bw[y, x] > 127 else 0)
        grid.append(row)
    return grid


def pack_hex(grid, marker_size):
    """Pack a 2D bit grid into hex (row-major, MSB-first, padded per row)."""
    bytes_per_row = (marker_size + 7) // 8
    raw = bytearray(marker_size * bytes_per_row)
    for r in range(marker_size):
        for c in range(marker_size):
            if grid[r][c]:
                byte_idx = r * bytes_per_row + c // 8
                bit_idx = 7 - (c % 8)
                raw[byte_idx] |= (1 << bit_idx)
    return raw.hex()


def main():
    for name, dict_id in DICTS.items():
        d = aruco.getPredefinedDictionary(dict_id)
        marker_size = d.markerSize
        max_corr = d.maxCorrectionBits
        count = len(d.bytesList)

        bits = []
        for mid in range(count):
            grid = extract_bits_from_image(d, mid, marker_size)
            bits.append(pack_hex(grid, marker_size))

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

    # Verify: decode marker 0 of DICT_6X6_250 and compare with image
    d = aruco.getPredefinedDictionary(aruco.DICT_6X6_250)
    grid_img = extract_bits_from_image(d, 0, 6)
    with open(out_dir / "DICT_6X6_250.json") as f:
        written = json.load(f)
    grid_dec = decode_hex(written["bits"][0], 6)
    assert grid_img == grid_dec, f"Self-check failed:\n  img: {grid_img}\n  dec: {grid_dec}"
    print("\n  self-check: DICT_6X6_250 marker 0 round-trips correctly")


def decode_hex(hex_str, marker_size):
    """Mirror of decodeMarkerBits in dicts.ts."""
    raw = bytes.fromhex(hex_str)
    bytes_per_row = (marker_size + 7) // 8
    grid = []
    for r in range(marker_size):
        row = []
        for c in range(marker_size):
            byte_idx = r * bytes_per_row + c // 8
            bit_idx = 7 - (c % 8)
            row.append((raw[byte_idx] >> bit_idx) & 1)
        grid.append(row)
    return grid


if __name__ == "__main__":
    main()
