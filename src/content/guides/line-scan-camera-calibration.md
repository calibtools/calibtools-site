---
title: "Line-scan camera calibration"
description: "Calibrate a line-scan camera in two parts: scale, keystone and distortion along the line from a strip, then mm per line and skew from a scanned board."
date: 2026-11-20
updated: 2026-11-20
readingTime: "13 min"
keyRule: "Treat the two image axes separately. Along the line, the lens sets the scale and bends it; along the motion, the encoder sets the scale and the lens has no say. In our test a linear fit left 3.9 mm of error across a 400 mm line, a 1D projective term cut it to 1.0 mm, and adding 1D distortion left 0.01 mm."
related: ["opencv-camera-calibration", "calibration-target-size", "composite-ceramic-or-glass", "corner-detection-troubleshooting", "printed-target-costs-half-a-pixel", "usaf-1951-lp-mm-table"]
products: ["line-scan-target", "checkerboard-composite", "grid-distortion-target"]
sampleFiles: []
faq:
  - q: "Can I calibrate a line-scan camera with cv2.calibrateCamera?"
    a: "No. The pinhole model assumes one projection center for the whole image, and a scanned image has one per line. Fit a separate model: a 1D projection with distortion along the line and a linear scale along the motion. The guide gives a nine-parameter version that fits with scipy in a few lines."
  - q: "Do the squares in the scan have to come out square?"
    a: "Not for the calibration. The fit recovers the millimeters per line from the board; in our test it found 0.05, 0.1 and 0.2 mm per line to five digits, and the detector was fine with squares twice as tall as wide. For inspection, set the line rate so pixels are close to square and let the fit do the rest."
  - q: "What target do I need for a line-scan camera?"
    a: "Two targets do two jobs. A strip with lines or dots at known pitch, laid along the scan line, gives scale, keystone and distortion along the line without moving anything. A flat checkerboard carried through the field by the transport adds the encoder scale and the skew between line and motion."
  - q: "Why does a part measure wider than it is, but not longer?"
    a: "Height. The scale along the line depends on the distance from the lens: a surface 20 mm above the calibration plane came out 4 % wider in our 490 mm setup, while the motion scale is set by the encoder and did not change. Calibrate at the height you measure, or scale the line axis by (H − h) / H."
  - q: "How do I tell encoder problems from lens problems?"
    a: "By direction. Lens errors vary along the line and repeat line after line; transport errors vary along the motion. Plot the residuals of the fit against u and against v: a curve against u that the model missed is distortion, a wave against v is speed ripple, scatter against v is trigger jitter."
---

A line-scan camera has one row of pixels. The image you work with is that row stacked thousands of times while the part moves past, so its two axes have nothing in common: one is made by a lens, the other by a conveyor and an encoder.

The pinhole model and `cv2.calibrateCamera` assume one projection center for the whole image. A scan has one per line, and the fit fails or returns nonsense. This guide gives a model for a line-scan camera over a flat object plane, its parameters from two targets, and what the residuals mean.

Every number comes from a synthetic 4096-pixel line-scan camera we rendered pixel by pixel; the method section at the end says how.

## What has to be calibrated

| Axis | Set by | Parameters | What goes wrong without them |
|---|---|---|---|
| Along the line (u) | Lens and mounting | mm per pixel, keystone, distortion | Scale varies from one end of the line to the other; straight edges bend |
| Along the motion (v) | Transport and encoder | mm per line, skew between line and motion | Squares come out as rectangles or parallelograms |
| Height | Working distance | Scale along the line changes with the object height; the motion scale does not | Tall parts measure too wide, but not too long |

Keystone is what you get when the sensor line is not parallel to the object plane: one end of the line is further from the lens than the other, and the scale drifts along the line. On an area camera this is the perspective of a tilted plane; on a line-scan camera it is a 1D projective term.

Skew is the angle between the scan line and the direction square to the motion. A skewed line turns a rectangle into a parallelogram; the fit below measures it, and the rectification removes it.

## The test

A 4096-pixel line behind a 35 mm lens with 7 µm pixels, 490 mm above a conveyor: 0.098 mm per pixel at the center, 400 mm across. The lens has barrel distortion (k1 −0.08, k2 +0.02), the sensor is tilted 3° about the motion axis, and the line is skewed 1.5° from square to the motion.

The encoder triggers one line per 0.1 mm of travel. We scanned a 17 × 13 checkerboard with 20 mm squares (300 × 220 mm of corners), placed at 4° to the belt, and imaged a static strip with 1 mm dark lines every 4 mm.

Rendering was pixel by pixel through the true model, supersampled 3 × 3, with a 0.8 px lens blur, illumination falling 15 % toward the ends of the line, and sensor noise.

## 1. Set up the capture

Focus and align first; calibration models what is left, it does not fix a soft end of the line. Lay the strip across the field, run the camera free-running and watch the live line: the edges should be equally sharp at both ends. A soft end means a tilted sensor or a misplaced object plane.

Get the exposure right on the brightest part of the target and keep it. Illumination along a line is rarely flat; the fit does not care about brightness, but the edge detector does care about saturation and about the dark level clipping at zero.

Capture raw lines. Switch off flat-field correction only if it is also a geometric correction in your camera; a pure gain and offset table is fine to leave on. Switch off any binning or scaling you will not use in production.

For the moving captures, trigger the lines from the encoder, not from a timer. Step 5 shows what a timer costs. Record the encoder resolution you set, in millimeters per line, as the nominal value the fit will check.

## 2. Across the line, with a static strip

A strip with features at known pitch, laid along the scan line, gives the along-line model with nothing moving. Average a few hundred lines of a static capture to beat down the noise, find the edges of the dark lines, pair them into line centers, and fit.

The model for a pixel coordinate u is a 1D distortion polynomial followed by a 1D projective transform. The nominal focal length F0 only scales the coefficients; a wrong F0 changes k1 and c but not the fit. We tried 3000, 5000 and 8000 px for a 5000 px lens: same residuals, same mm per pixel.

```python
import cv2
import numpy as np
from scipy.optimize import least_squares

PITCH_MM = 4.0          # centre-to-centre pitch of the strip's dark lines
F0 = 35.0 / 0.007       # nominal focal length in pixels: lens focal length / pixel pitch

frame = cv2.imread("strip_static.png", cv2.IMREAD_UNCHANGED).astype(np.float64)
prof = frame.mean(axis=0)                    # average the lines of a static capture
n = prof.size

# edges: mid-level crossings with hysteresis (a crossing counts once the profile has
# gone 20 % of the contrast past the mid level), interpolated to sub-pixel
lo, hi = np.percentile(prof, [5, 95])
mid, band = 0.5 * (lo + hi), 0.2 * (hi - lo)
s = prof - mid
edges, state = [], s[0] > 0                   # state: True while bright
for j in range(1, n):
    if state and s[j] < -band or not state and s[j] > band:
        k = j - 1
        while k > 0 and np.sign(s[k]) == np.sign(s[j]):
            k -= 1                            # back up to the crossing itself
        edges.append(k + s[k] / (s[k] - s[k + 1]))
        state = not state
edges = np.array(edges)
if s[0] < 0:                                  # profile starts inside a dark line: drop its exit edge
    edges = edges[1:]
edges = edges[: len(edges) // 2 * 2]
centers = 0.5 * (edges[0::2] + edges[1::2])   # centre of each dark line, in pixels
x_mm = np.arange(centers.size) * PITCH_MM     # its position along the strip

def along_line(p, u):
    """Pixel u -> position along the strip in mm: 1D distortion, 1D projective, offset."""
    a, c, k1, k2, x0 = p
    w = (u - n / 2) / F0
    w = w * (1 + k1 * w**2 + k2 * w**4)
    return a * w / (1 + c * w) + x0

fit = least_squares(lambda p: along_line(p, centers) - x_mm, [F0 * 0.1, 0, 0, 0, 0], x_scale="jac")
a, c, k1, k2, x0 = fit.x
res = along_line(fit.x, centers) - x_mm
mm_per_px = a / F0
print(f"{centers.size} lines  {mm_per_px:.5f} mm/px at centre  keystone c {c:+.4f}"
      f"  k1 {k1:+.4f} k2 {k2:+.4f}  residual RMS {np.sqrt((res**2).mean()):.4f} mm")
spacing = np.diff(centers)
print(f"pixels per pitch: left {spacing[:5].mean():.1f}  centre {spacing[spacing.size // 2 - 2:spacing.size // 2 + 3].mean():.1f}"
      f"  right {spacing[-5:].mean():.1f}")
np.save("along_line.npy", fit.x)
```

The hysteresis matters. A plain threshold crossing produced a doubled edge where the noise sat on the mid level, which shifted every line center after it by half a pitch and left a 0.55 mm residual; with the 20 % band the 102 lines came out at 0.0035 mm RMS, 0.04 px.

The three terms of the model, from the same edges:

| Along-line model | Residual RMS | Largest residual | mm per pixel at center |
|---|---|---|---|
| Linear (one scale) | 1.41 mm | 3.93 mm | 0.0991 |
| 1D projective (keystone) | 0.41 mm | 1.03 mm | 0.0991 |
| 1D projective and k1, k2 | 0.005 mm | 0.014 mm | 0.0983 |

The true scale at the center is 0.0983 mm; the linear fit is 0.8 % off because it averages a line whose scale runs from 0.106 mm at one end to 0.098 mm at the other (37.7 and 40.9 px per 4 mm pitch). That is the 3° tilt: 8 % from end to end, invisible unless you count pixels per pitch at both ends.

The strip does not need to be exactly along the line. At 2° to it, the fit returned the same residual and the same mm per pixel within 0.03 %; a cosine error is second order. What it must be is straight and flat, and the pitch must be right, since every line's position is counted from it.

## 3. Scan a flat board

The strip cannot see the second axis. For that, carry a flat 2D pattern through the field at production speed with encoder triggering, and keep the whole board in the line.

A checkerboard is the right pattern here: `findChessboardCornersSB` finds it in the stacked image whatever the aspect ratio, and corners are placed to a few hundredths of a pixel. In our scan the 192 corners were 0.07 px from the truth on average, 0.18 px at worst.

The squares need not be square in the image. We rendered the same board at 0.05, 0.1 and 0.2 mm per line:

| Lines per 20 mm square | Square in the image | Detected | mm per line recovered | Residual RMS |
|---|---|---|---|---|
| 100 | 2 × wider than tall | yes | 0.20000 | 0.015 mm |
| 200 | close to square | yes | 0.10000 | 0.007 mm |
| 400 | 2 × taller than wide | yes | 0.05000 | 0.007 mm |
| 800 | 4 × taller than wide | yes | 0.02500 | 0.009 mm |

Place the board at a few degrees to the belt rather than aligned with it, so that each board axis has components along u and along v; the fit separates skew from the board's own rotation that way. Our board sat at 4°.

Size the squares for the along-line resolution: 20 mm squares were 200 px here, which is more than enough; 50 px squares are fine for the detector. For how to size against the field and the lens, see [How big should your target be?](/calibacademy/calibration-target-size/).

The board must be flat and lie in the plane you measure in; step 7 shows what height does. A printed sheet is not flat once it has been on a belt. The [composite boards](/targets/checkerboard-composite/) stay flat, and the [substrate guide](/calibacademy/composite-ceramic-or-glass/) has the numbers.

## 4. Fit the model

Nine parameters map a pixel (u, v) to the board: the along-line model of step 2 (a, c, k1, k2), the millimeters per line p, the directions of the two image axes on the board (β for the line, γ for the motion), and an offset. The skew is β − γ − 90°, independent of how the board was placed.

```python
import cv2
import numpy as np
from scipy.optimize import least_squares

CORNERS, SQUARE_MM = (16, 12), 20.0
F0 = 35.0 / 0.007                      # nominal focal length in pixels

scan = cv2.imread("scan.png", cv2.IMREAD_GRAYSCALE)
n = scan.shape[1]                      # pixels per line
ok, pts = cv2.findChessboardCornersSB(scan, CORNERS, flags=cv2.CALIB_CB_NORMALIZE_IMAGE)
assert ok, "board not found"
u, v = pts.reshape(-1, 2).T.astype(np.float64)          # u along the line, v = line index
gx, gy = np.meshgrid(np.arange(1, CORNERS[0] + 1), np.arange(1, CORNERS[1] + 1))
bx, by = gx.ravel() * SQUARE_MM, gy.ravel() * SQUARE_MM   # board coordinates of the corners

def to_board(p, u, v):
    """Pixel (u, v) -> board coordinates. Along the line: 1D distortion, then 1D projective;
    along the motion: p mm per line. beta, gamma: directions of the two axes on the board."""
    a, c, k1, k2, beta, gamma, p_mm, x0, y0 = p
    w = (u - n / 2) / F0
    w = w * (1 + k1 * w**2 + k2 * w**4)
    s = a * w / (1 + c * w)
    return (s * np.cos(beta) + p_mm * v * np.cos(gamma) + x0,
            s * np.sin(beta) + p_mm * v * np.sin(gamma) + y0)

# linear start, then the full model
M = np.linalg.lstsq(np.stack([u, v, np.ones_like(u)], 1), np.stack([bx, by], 1), rcond=None)[0]
p0 = [np.hypot(*M[0]) * F0, 0, 0, 0, np.arctan2(M[0, 1], M[0, 0]),
      np.arctan2(M[1, 1], M[1, 0]), np.hypot(*M[1]), M[2, 0], M[2, 1]]
resid = lambda p: np.concatenate([to_board(p, u, v)[0] - bx, to_board(p, u, v)[1] - by])
fit = least_squares(resid, p0, x_scale="jac")
a, c, k1, k2, beta, gamma, p_mm, x0, y0 = fit.x

r = resid(fit.x).reshape(2, -1)
rms = np.sqrt((r**2).sum(0).mean())
skew = np.degrees(beta - gamma) % 180 - 90         # 0 when the line is square to the motion
print(f"{u.size} corners  RMS {rms:.3f} mm  max {np.hypot(*r).max():.3f} mm")
print(f"along the line: {a / F0:.5f} mm/px at centre, keystone c {c:+.4f}, k1 {k1:+.4f}, k2 {k2:+.4f}")
print(f"along the motion: {p_mm:.5f} mm per line;  line skewed {skew:+.2f} deg from square")
np.save("linescan_model.npy", fit.x)
```

On our scan: RMS 0.007 mm (0.08 px), 0.0983 mm per pixel at the center, 0.10000 mm per line, skew +1.50°. The truth was 0.0983, 0.1000 and 1.5°, and the along-line coefficients agree with the strip fit of step 2 to three digits.

What each term buys, on the same 192 corners:

| Model | Parameters | Residual RMS | Largest residual |
|---|---|---|---|
| Affine (scale u, scale v, skew, offset) | 6 | 1.02 mm (10.4 px) | 2.58 mm |
| Affine and 1D projective | 7 | 0.19 mm (2.0 px) | 0.46 mm |
| Affine, 1D projective and k1, k2 | 9 | 0.007 mm (0.08 px) | 0.016 mm |
| Cubic polynomial in u instead | 10 | 0.008 mm | 0.017 mm |
| Quintic polynomial in u instead | 14 | 0.007 mm | 0.017 mm |

A cubic polynomial in u does as well as the physical model on this lens, and it fits with linear least squares. Keep the projective-plus-distortion form if you want to read the tilt off the coefficient, or if the lens is wide and the keystone strong, where a polynomial needs more terms.

## 5. Encoder, speed and the motion axis

The fit treats p as unknown and finds it from the board; that is the encoder calibration. If instead you trust the nominal value, a small error in it is the largest error in the system:

| mm per line used | Error of the value | Residual RMS | Largest residual |
|---|---|---|---|
| Fitted (0.10000) | 0 | 0.007 mm | 0.016 mm |
| 0.1005 nominal | 0.5 % | 0.35 mm | 0.58 mm |
| 0.1010 nominal | 1 % | 0.69 mm | 1.16 mm |

The residual grows along the motion, so it also shows you which axis is wrong. Over a 1 m part a 1 % encoder error is 10 mm.

Belt speed is not constant, which is why the lines must be triggered from the encoder. We rendered the scan with the lines on a timer and the speed varying ±2 % over a 50 mm period: the fit leaves 0.11 mm RMS, and the residuals along the motion swing ±0.19 mm in a sine that no static model removes.

The ripple's position amplitude is the speed ripple times the period over 2π: 2 % of 50 mm / 2π is 0.16 mm, 1.6 lines, which is what the residuals show.

Trigger jitter is the small version of the same thing: a random displacement of each line. With 0.3 line (0.03 mm) of jitter per line the RMS rose from 0.007 to 0.024 mm, with no structure against u or v. Jitter you can average; ripple you cannot.

The skew is in the fit as β − γ − 90°. Ours came back +1.50° for a true 1.5°. Leaving it out, as a model with one scale per axis and no cross term does, would shear every part by sin(1.5°) of its length along the motion, 2.6 mm on a 100 mm part.

## 6. Rectify to a metric image

With the model you can measure in the raw scan by mapping points through `to_board`. For inspection tools that expect square pixels, invert the model once and `remap` the scan to a metric image with the motion axis vertical.

```python
import cv2
import numpy as np

GRID_MM = 0.1                                   # pixel size of the metric image
F0 = 35.0 / 0.007
scan = cv2.imread("scan.png", cv2.IMREAD_GRAYSCALE)
rows, n = scan.shape
a, c, k1, k2, beta, gamma, p_mm, x0, y0 = np.load("linescan_model.npy")

def to_board(u, v):
    w = (u - n / 2) / F0
    w = w * (1 + k1 * w**2 + k2 * w**4)
    s = a * w / (1 + c * w)
    return (s * np.cos(beta) + p_mm * v * np.cos(gamma) + x0,
            s * np.sin(beta) + p_mm * v * np.sin(gamma) + y0)

def to_pixel(X, Y):
    """Board coordinates -> pixel (u, v): the model of step 4 inverted."""
    A = np.array([[np.cos(beta), np.cos(gamma)], [np.sin(beta), np.sin(gamma)]])
    s, pv = np.linalg.solve(A, np.stack([X - x0, Y - y0]).reshape(2, -1))
    w_hat = s / (a - c * s)                     # undo the 1D projective
    w = w_hat.copy()
    for _ in range(10):                         # undo the 1D distortion polynomial
        w = w_hat / (1 + k1 * w**2 + k2 * w**4)
    return (w * F0 + n / 2).reshape(X.shape), (pv / p_mm).reshape(X.shape)

# output frame: Y' along the motion, X' across it, covering the whole scan
e_m = np.array([np.cos(gamma), np.sin(gamma)])
e_a = np.array([e_m[1], -e_m[0]])
cu, cv_ = np.meshgrid([0, n - 1], [0, rows - 1])
X, Y = to_board(cu.ravel().astype(float), cv_.ravel().astype(float))
XY = np.column_stack((X, Y))
pa, pm = XY @ e_a, XY @ e_m
W, Hh = int((pa.max() - pa.min()) / GRID_MM), int((pm.max() - pm.min()) / GRID_MM)
j, i = np.meshgrid(np.arange(W), np.arange(Hh))
Xo = pa.min() + j * GRID_MM
Yo = pm.min() + i * GRID_MM
Xb = Xo * e_a[0] + Yo * e_m[0]
Yb = Xo * e_a[1] + Yo * e_m[1]
map_u, map_v = to_pixel(Xb, Yb)
metric = cv2.remap(scan, map_u.astype(np.float32), map_v.astype(np.float32),
                   cv2.INTER_LINEAR, borderValue=0)
cv2.imwrite("scan_metric.png", metric)
print(f"metric image {W} x {Hh} px at {GRID_MM} mm/px")

# check: the board's squares in the metric image
ok, pts = cv2.findChessboardCornersSB(metric, (16, 12), flags=cv2.CALIB_CB_NORMALIZE_IMAGE)
g = pts.reshape(12, 16, 2)
dx = np.linalg.norm(np.diff(g, axis=1), axis=2) * GRID_MM
dy = np.linalg.norm(np.diff(g, axis=0), axis=2) * GRID_MM
ex, ey = (g[0, -1] - g[0, 0]), (g[-1, 0] - g[0, 0])
angle = np.degrees(np.arccos(ex @ ey / np.linalg.norm(ex) / np.linalg.norm(ey)))
print(f"square across the line {dx.mean():.3f} mm (spread {dx.std():.3f}),"
      f" along the motion {dy.mean():.3f} mm (spread {dy.std():.3f}), board axes {angle:.2f} deg")
```

In the metric image of our scan the squares measured 20.000 mm both ways with a spread of 0.010 mm, and the board's two axes met at 90.00°. The board still sits at its 4° on the belt, which is right: the rectification removes the camera, not the part.

Build the maps once and keep them; `remap` with stored float maps costs a few milliseconds per megapixel. For a measurement tool, prefer mapping the measured points through `to_board` and skipping the resampling.

## 7. Objects above the belt

The along-line scale is set by the distance from the lens to the surface. A surface h above the calibration plane, at working distance H, is imaged larger by H / (H − h). The motion scale is p mm per line whatever the height, so a tall part is stretched in one axis only.

| Height above the plane | Along-line scale change (H = 490 mm) | Error on a 300 mm width |
|---|---|---|
| 5 mm | +1.0 % | 3.1 mm |
| 10 mm | +2.1 % | 6.2 mm |
| 20 mm | +4.3 % | 12.8 mm |
| 50 mm | +11.4 % | 34 mm |

We checked the 20 mm row by raising the board: the fit found 0.0943 mm per pixel instead of 0.0983, a ratio of 0.959 against the predicted 0.959, while p and the skew did not move. Measured with the belt calibration, the board was 312.7 mm wide (true 300.0) and 220.0 mm long (true 220.0).

So calibrate with the board at the height of the surface you measure, or apply the along-line factor (H − h) / H per part, with H from the geometry or from two calibrations at known heights. Parts of mixed height on one belt need the height from somewhere else; this calibration cannot supply it.

If the system measures height itself, with two line-scan cameras or a laser line, the flat model is not enough; the view plane and the motion vector have to be solved in 3D, from a target with features at several known heights. That is a different calibration and a different target.

## Checks

Before you use the model:

- Residuals: look at their shape before their size. A residual that curves against u is a missing distortion term, one that grows with v is the encoder scale, one that waves with v is speed ripple, and scatter with no shape is noise or trigger jitter.

- Scale at both ends: pixels per pitch at the left and right of the strip. A difference between the ends is keystone; if it is more than a few percent, fix the mounting rather than the model.

- Encoder: the fitted p against the value you set. A difference is a wrong wheel diameter, slip on the wheel, or a prescaler you forgot; it is not noise, since the fit found p to five digits on 192 corners.

- Skew: the fit removes what is there, but mount the camera as square as you can, since a skewed line wastes field at the ends of long parts and smears edges that run along the motion.

- Repeat the scan: two boards scanned a minute apart should agree in p to four digits and in the along-line coefficients within their fit noise. If p wanders, the belt slips on the encoder wheel.

- Height: measure a gauge block of known width at two heights. The ratio of the two widths should be (H − h₂) / (H − h₁).

## Common problems

| What you see | Likely cause | Fix |
|---|---|---|
| `calibrateCamera` fails or returns a focal length that makes no sense | Pinhole model on a scanned image | Use the line-scan model of step 4 |
| Scale differs between the two ends of the line | Sensor tilted about the motion axis | Shim the mount; the 1D projective term handles the rest |
| Straight edges bend in the raw scan | Lens distortion | k1, k2 along the line; a cubic in u also works |
| Squares are rectangles | Line rate or encoder resolution off | Trigger from the encoder; the fit measures p |
| Squares are parallelograms | Line skewed to the motion | Rotate the camera about its optical axis; the fit measures the remainder |
| Wavy edges along the motion | Timer-triggered lines with belt speed ripple | Encoder triggering |
| Residual grows linearly with v | Nominal mm per line used instead of the fitted one | Fit p |
| Part measures too wide but the right length | Surface above the calibration plane | Calibrate at that height or scale by (H − h) / H |
| Different p every day | Encoder wheel slips, or belt tension changed | Fix the drive; recalibrate after maintenance |
| Edge of the strip doubles | Threshold crossing on noise | Hysteresis band as in step 2 |

## Next steps

- [Camera calibration with OpenCV](/calibacademy/opencv-camera-calibration/) — the area-camera pipeline, for the frame cameras on the same line.

- [How big should your target be?](/calibacademy/calibration-target-size/) — square size against sensor, lens and field.

- [Composite, ceramic or glass](/calibacademy/composite-ceramic-or-glass/) — flatness and thermal expansion of the board materials against one pixel of the system.

- [Why a printed target costs half a pixel](/calibacademy/printed-target-costs-half-a-pixel/) — what a paper board on a belt does to the fit.

- Our [line-scan strips](/targets/line-scan-target/) are chrome on glass with lines or dots at known pitch, 300 to 800 mm long; tell us the field width and the pixel count and we propose a pitch.

## Method

The camera was a 1D projection with the sensor line in a view plane: optical center 490 mm above the conveyor, 5000 px focal length, principal point 12 px off center, k1 −0.08 and k2 +0.02, 3° tilt about the motion axis and 1.5° skew. Each ray met the object plane after inverting the distortion.

Scans were rendered line by line with the board displaced 0.1 mm per line (or by the ripple and jitter of step 5), supersampled 3 × 3, with a 0.8 px blur, 15 % illumination falloff and noise of 2 gray levels. Detection used OpenCV 4.14, the fits scipy. Write to hello@calib.tools for the scripts.
