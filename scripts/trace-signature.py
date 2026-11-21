#!/usr/bin/env python3
"""Turn a photo of a pen signature on white paper into vector outlines for the quotation PDF.

  python3 scripts/trace-signature.py photo.jpg [--out src/lib/signature.ts] [--preview out.png]

Steps: grayscale -> even out the lighting -> threshold -> drop specks -> crop to the ink -> trace (potrace).
Needs: pip install pillow numpy potracer
"""
import sys, argparse
import numpy as np
from PIL import Image, ImageFilter, ImageOps
import potrace

ap = argparse.ArgumentParser()
ap.add_argument('photo')
ap.add_argument('--out', default='src/lib/signature.ts')
ap.add_argument('--preview')
ap.add_argument('--crop', help='x0,y0,x1,y1 as fractions of the photo, to pick one of several signatures')
ap.add_argument('--threshold', type=float, default=0.72, help='ink = darker than this share of the local paper tone')
a = ap.parse_args()

im = ImageOps.exif_transpose(Image.open(a.photo)).convert('L')
if a.crop:
    x0, y0, x1, y1 = [float(v) for v in a.crop.split(',')]
    im = im.crop((int(x0 * im.width), int(y0 * im.height), int(x1 * im.width), int(y1 * im.height)))
s = 1600 / max(im.size)
im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
paper = im.filter(ImageFilter.GaussianBlur(40))  # the local paper tone, so shadows don't count as ink
g = np.asarray(im, dtype=np.float32) / np.maximum(np.asarray(paper, dtype=np.float32), 1)
ink = g < a.threshold
# drop specks: keep pixels with enough ink around them
dens = np.asarray(Image.fromarray((ink * 255).astype(np.uint8)).filter(ImageFilter.BoxBlur(3)), dtype=np.float32) / 255
ink &= dens > 0.12
ys, xs = np.where(ink)
if len(xs) < 200:
    sys.exit('no ink found: is the photo dark pen on white paper?')
pad = 4
ink = ink[max(ys.min() - pad, 0):ys.max() + pad, max(xs.min() - pad, 0):xs.max() + pad]
h, w = ink.shape
paths = []
for c in potrace.Bitmap(~ink).trace(turdsize=12, alphamax=1.0, opttolerance=0.4):
    f = lambda p: f'{p.x:.1f} {p.y:.1f}'
    d = [f'M{f(c.start_point)}']
    for seg in c.segments:
        d.append(f'L{f(seg.c)}L{f(seg.end_point)}' if seg.is_corner else f'C{f(seg.c1)} {f(seg.c2)} {f(seg.end_point)}')
    paths.append(''.join(d) + 'Z')  # this tracer fills False cells, hence ~ink above
head = open(a.out).read().split('export const SIGNATURE')[0]
body = ',\n'.join(f"    '{p}'" for p in paths)
open(a.out, 'w').write(f"{head}export const SIGNATURE: {{ width: number; height: number; paths: readonly string[] }} = {{\n  width: {w},\n  height: {h},\n  paths: [\n{body},\n  ],\n}};\n")
if a.preview:
    Image.fromarray(((~ink) * 255).astype(np.uint8)).save(a.preview)
print(f'{len(paths)} outlines, {w}x{h}, {sum(map(len, paths)) // 1024} KB -> {a.out}')
