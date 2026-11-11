"""Circle size limits for cv2.findCirclesGrid with default settings (for the circle grid product page).

A 7 x 10 symmetric grid and a 7 x 5 asymmetric grid (stock 200 x 150 mm boards: 12 mm circles, 20 mm pitch)
are rendered fronto-parallel at different scales, with light blur and noise. Reported: whether the grid is found,
by circle diameter in pixels. Also prints the SimpleBlobDetector defaults that set the limits.

Run: python3 -I circle-grid-size.py
"""
import numpy as np
import cv2

p = cv2.SimpleBlobDetector_Params()
print('OpenCV', cv2.__version__)
print('SimpleBlobDetector defaults: filterByArea', p.filterByArea, 'minArea', p.minArea, 'maxArea', p.maxArea,
      '| minDistBetweenBlobs', p.minDistBetweenBlobs, '| blobColor', p.blobColor)
print('diameter for minArea: %.1f px, for maxArea: %.1f px' % (2 * np.sqrt(p.minArea / np.pi), 2 * np.sqrt(p.maxArea / np.pi)))

D_MM, PITCH_MM = 12.0, 20.0


def render(rows, cols, asym, px_per_mm, seed=0):
    rng = np.random.default_rng(seed)
    S = 4  # supersampling
    pitch = PITCH_MM * px_per_mm
    r = D_MM * px_per_mm / 2
    w = int((cols * (2 if asym else 1) + 2) * pitch * (0.5 if asym else 1) + 2 * pitch)
    h = int((rows + 2) * pitch * (0.5 if asym else 1) + 2 * pitch)
    w, h = max(w, 64), max(h, 64)
    img = np.full((h * S, w * S), 235, np.uint8)
    for i in range(rows):
        for j in range(cols):
            if asym:   # OpenCV asymmetric layout: x = (2j + i % 2) * d, y = i * d, with d = pitch / 2
                x, y = (2 * j + i % 2) * pitch / 2, i * pitch / 2
            else:
                x, y = j * pitch, i * pitch
            cv2.circle(img, (int((x + 1.5 * pitch) * S), int((y + 1.5 * pitch) * S)), int(round(r * S)), 20, -1, cv2.LINE_AA)
    img = cv2.resize(img, (w, h), interpolation=cv2.INTER_AREA)
    img = cv2.GaussianBlur(img, (0, 0), 0.7)
    img = np.clip(img.astype(np.float32) + rng.normal(0, 2, img.shape), 0, 255).astype(np.uint8)
    return img


for name, rows, cols, asym, flag in [('symmetric 7x10', 7, 10, False, cv2.CALIB_CB_SYMMETRIC_GRID), ('asymmetric 7x5', 7, 5, True, cv2.CALIB_CB_ASYMMETRIC_GRID)]:
    print(name)
    for d_px in [4, 5, 6, 8, 10, 15, 20, 40, 60, 75, 80, 85, 100, 150]:
        img = render(rows, cols, asym, d_px / D_MM)
        # pattern size is (points per row, points per column)
        ok, centers = cv2.findCirclesGrid(img, (cols, rows), flags=flag)
        if asym and not ok:
            ok, centers = cv2.findCirclesGrid(img, (rows, cols), flags=flag)
        print('  circle %4d px (pitch %5.1f px): %s' % (d_px, d_px * PITCH_MM / D_MM, 'found' if ok else 'not found'))
