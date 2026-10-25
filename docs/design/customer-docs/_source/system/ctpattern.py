"""Vector renderings of Calib.Tools boards (exact ArUco bits from OpenCV) for customer documents.

All coordinates are millimetres on the board: origin of the SVG = top-left corner of the board.
Pattern rule (OpenCV >= 4.6 layout): black square top-left, (r + c) even = black, ArUco markers in the white
squares, IDs row-major from start_id. ChArUco corner id = r * (cols - 1) + c at pattern coordinates
((c + 1) * sq, (r + 1) * sq) - OpenCV frame: origin = top-left OUTER corner of the pattern, X right, Y down.
"""
import sys, math
import numpy as np
import cv2
sys.path.insert(0, "/home/ubuntu/work/brandkit")
import kitgeo as K

RED, GREEN, INK = "#E60012", "#00A651", "#282828"
G80, G60, G30, G10, G05 = "#333333", "#666666", "#B3B3B3", "#E6E6E6", "#F2F2F2"
DICTS = {"DICT_6X6_250": cv2.aruco.DICT_6X6_250, "DICT_5X5_100": cv2.aruco.DICT_5X5_100,
         "DICT_4X4_50": cv2.aruco.DICT_4X4_50, "DICT_5X5_250": cv2.aruco.DICT_5X5_250}


def corner_list(rows, cols, sq):
    """[(id, r, c, x_nom, y_nom)] in the OpenCV pattern frame (mm)."""
    out = []
    for r in range(rows - 1):
        for c in range(cols - 1):
            out.append((r * (cols - 1) + c, r, c, (c + 1) * sq, (r + 1) * sq))
    return out


def _marker_cells(dict_name, mid):
    d = cv2.aruco.getPredefinedDictionary(DICTS[dict_name])
    n = d.markerSize + 2
    m = cv2.aruco.generateImageMarker(d, mid, n)
    return m < 128, n            # True = black cell


def _runs(mask, x0, y0, cell, fill):
    out = []
    for yy in range(mask.shape[0]):
        x = 0
        while x < mask.shape[1]:
            if mask[yy, x]:
                s = x
                while x < mask.shape[1] and mask[yy, x]:
                    x += 1
                out.append(f"M{x0 + s * cell:.4f} {y0 + yy * cell:.4f}h{(x - s) * cell:.4f}v{cell:.4f}h{-(x - s) * cell:.4f}z")
            else:
                x += 1
    return f'<path d="{"".join(out)}" fill="{fill}"/>' if out else ""


def arrow(x0, y0, x1, y1, colour, w, head):
    ang = math.atan2(y1 - y0, x1 - x0)
    bx, by = x1 - head * math.cos(ang), y1 - head * math.sin(ang)
    lx, ly = bx + head * 0.45 * math.sin(ang), by - head * 0.45 * math.cos(ang)
    rx, ry = bx - head * 0.45 * math.sin(ang), by + head * 0.45 * math.cos(ang)
    return (f'<line x1="{x0}" y1="{y0}" x2="{bx:.3f}" y2="{by:.3f}" stroke="{colour}" stroke-width="{w}"/>'
            f'<path d="M{x1} {y1}L{lx:.3f} {ly:.3f}L{rx:.3f} {ry:.3f}Z" fill="{colour}"/>')


def axes(ox, oy, length, scale=1.0, labels=True):
    """Red X arrow to the right, green Y arrow down, as printed in the top-left margin of every board."""
    w, head = 0.55 * scale, 1.8 * scale
    s = arrow(ox, oy, ox + length, oy, RED, w, head) + arrow(ox, oy, ox, oy + length, GREEN, w, head)
    if labels:
        fs = 3.2 * scale
        s += (f'<text x="{ox + length + 1.0 * scale}" y="{oy + fs * 0.36}" font-family="Geist" font-weight="700" font-size="{fs}" fill="{RED}">X</text>'
              f'<text x="{ox}" y="{oy + length + 1.0 * scale + fs * 0.72}" font-family="Geist" font-weight="700" font-size="{fs}" fill="{GREEN}" text-anchor="middle">Y</text>')
    s += f'<circle cx="{ox}" cy="{oy}" r="{0.6 * scale}" fill="{INK}"/>'
    return s


def label_line_frag(line, x, y_centre, width, colour=G80):
    """Board label line (compact wordmark + Geist Mono, one colour) scaled to `width` mm, left edge at x."""
    assert line.startswith("CALIB.TOOLS")
    after = line[len("CALIB.TOOLS"):].strip()
    frag, (x0, y0, x1, y1) = K.label_line(after, colour)
    s = width / (x1 - x0)
    ty = y_centre - s * (y0 + y1) / 2
    return f'<g transform="translate({x - s * x0:.4f} {ty:.4f}) scale({s:.6f})">{frag}</g>', s * (y1 - y0)


def board_svg(W, H, rows, cols, sq, marker=None, mx=None, my=None, dict_name="DICT_6X6_250", start_id=0,
              label=None, label_w=None, axes_spec=(4.5, 4.5, 6.5, 0.6), mode="print", width_mm=None, height_mm=None,
              outline=True, corners=False, corner_ids=False, vectors=None, vec_scale=2000.0, highlight=None,
              origin=False, pad=0.0, extra="", radius=0.0):
    """Return an SVG string of the board.
    mode 'print' = true black/white; 'map' = pattern faded to greys for annotated feature maps.
    vectors: {corner_id: (dx_um, dy_um)} drawn from the nominal corner, magnified vec_scale times.
    highlight: list of corner ids ringed. pad: extra mm around the board in the viewBox. extra: SVG appended (board mm coords)."""
    mx = (W - cols * sq) / 2 if mx is None else mx
    my = (H - rows * sq) / 2 if my is None else my
    sq_fill, mk_fill, txt = ("#000", "#000", G80) if mode == "print" else (G10, G30, G30)
    out = [f'<rect x="0" y="0" width="{W}" height="{H}" rx="{radius}" fill="#fff" '
           f'stroke="{G60 if mode == "print" else G30}" stroke-width="{0.35 if outline else 0}"/>']
    black = []
    for r in range(rows):
        for c in range(cols):
            x0, y0 = mx + c * sq, my + r * sq
            if (r + c) % 2 == 0:
                black.append(f"M{x0:.4f} {y0:.4f}h{sq}v{sq}h{-sq}z")
    out.append(f'<path d="{"".join(black)}" fill="{sq_fill}"/>')
    if marker:
        nid = start_id
        off = (sq - marker) / 2
        for r in range(rows):
            for c in range(cols):
                if (r + c) % 2 == 1:
                    mask, n = _marker_cells(dict_name, nid)
                    out.append(_runs(mask, mx + c * sq + off, my + r * sq + off, marker / n, mk_fill))
                    nid += 1
    if label:
        lw = label_w or cols * sq
        yc = my + rows * sq + (H - my - rows * sq) / 2
        frag, _ = label_line_frag(label, mx, yc, lw, txt if mode == "map" else G80)
        out.append(frag)
    if axes_spec:
        out.append(axes(*axes_spec))
    cl = corner_list(rows, cols, sq)
    if vectors:
        vs = []
        for cid, r, c, xn, yn in cl:
            if cid in vectors:
                dx, dy = vectors[cid]
                x1, y1 = mx + xn, my + yn
                vs.append(f'<line x1="{x1:.3f}" y1="{y1:.3f}" x2="{x1 + dx * vec_scale / 1000:.3f}" y2="{y1 + dy * vec_scale / 1000:.3f}" '
                          f'stroke="#000" stroke-width="0.32" stroke-linecap="round"/>')
        out.append("".join(vs))
    if corners:
        out.append("".join(f'<circle cx="{mx + xn:.3f}" cy="{my + yn:.3f}" r="0.42" fill="#000"/>' for _, _, _, xn, yn in cl))
    if corner_ids:
        fs = min(2.3, sq * 0.24)
        out.append("".join(f'<text x="{mx + xn + 0.55:.3f}" y="{my + yn - 0.6:.3f}" font-family="Geist Mono" font-size="{fs}" fill="{G60}">{cid}</text>'
                           for cid, _, _, xn, yn in cl))
    if highlight:
        for cid in highlight:
            _, r, c, xn, yn = cl[cid]
            out.append(f'<circle cx="{mx + xn:.3f}" cy="{my + yn:.3f}" r="{sq * 0.32:.2f}" fill="none" stroke="#000" stroke-width="0.35"/>')
    if origin:
        out.append(f'<circle cx="{mx}" cy="{my}" r="1.3" fill="#fff" stroke="#000" stroke-width="0.35"/>'
                   f'<circle cx="{mx}" cy="{my}" r="0.45" fill="#000"/>')
    out.append(extra)
    size = (f'width="{width_mm}mm" ' if width_mm else "") + (f'height="{height_mm}mm"' if height_mm else "")
    vb = f"{-pad} {-pad} {W + 2 * pad} {H + 2 * pad}"
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" {size}>{"".join(out)}</svg>'


def dim_h(x0, x1, y, text, ext_from=None, fs=2.6, col=G60, sw=0.2, gap=0.8):
    """Horizontal dimension line between x0 and x1 at height y (mm), optional extension lines from y=ext_from."""
    e = ""
    if ext_from is not None:
        e = (f'<line x1="{x0}" y1="{ext_from}" x2="{x0}" y2="{y + (1 if y > ext_from else -1)}" stroke="{col}" stroke-width="{sw}"/>'
             f'<line x1="{x1}" y1="{ext_from}" x2="{x1}" y2="{y + (1 if y > ext_from else -1)}" stroke="{col}" stroke-width="{sw}"/>')
    a = 1.4
    return (e + f'<line x1="{x0}" y1="{y}" x2="{x1}" y2="{y}" stroke="{col}" stroke-width="{sw}"/>'
            f'<path d="M{x0} {y}l{a} {-a * 0.35}v{a * 0.7}z M{x1} {y}l{-a} {-a * 0.35}v{a * 0.7}z" fill="{col}"/>'
            f'<rect x="{(x0 + x1) / 2 - len(text) * fs * 0.32 - gap}" y="{y - fs * 0.62}" width="{len(text) * fs * 0.64 + 2 * gap}" height="{fs * 1.2}" fill="#fff"/>'
            f'<text x="{(x0 + x1) / 2}" y="{y + fs * 0.36}" font-family="Geist Mono" font-size="{fs}" fill="#000" text-anchor="middle">{text}</text>')


def dim_v(x, y0, y1, text, ext_from=None, fs=2.6, col=G60, sw=0.2, gap=0.8):
    """Vertical dimension line between y0 and y1 at x (mm); label rotated."""
    e = ""
    if ext_from is not None:
        e = (f'<line x1="{ext_from}" y1="{y0}" x2="{x + (1 if x > ext_from else -1)}" y2="{y0}" stroke="{col}" stroke-width="{sw}"/>'
             f'<line x1="{ext_from}" y1="{y1}" x2="{x + (1 if x > ext_from else -1)}" y2="{y1}" stroke="{col}" stroke-width="{sw}"/>')
    a = 1.4
    cy = (y0 + y1) / 2
    return (e + f'<line x1="{x}" y1="{y0}" x2="{x}" y2="{y1}" stroke="{col}" stroke-width="{sw}"/>'
            f'<path d="M{x} {y0}l{-a * 0.35} {a}h{a * 0.7}z M{x} {y1}l{-a * 0.35} {-a}h{a * 0.7}z" fill="{col}"/>'
            f'<g transform="rotate(-90 {x} {cy})"><rect x="{x - len(text) * fs * 0.32 - gap}" y="{cy - fs * 0.62}" width="{len(text) * fs * 0.64 + 2 * gap}" height="{fs * 1.2}" fill="#fff"/>'
            f'<text x="{x}" y="{cy + fs * 0.36}" font-family="Geist Mono" font-size="{fs}" fill="#000" text-anchor="middle">{text}</text></g>')


def scale_bar(x, y, length_mm=100, ticks=10, fs=2.6):
    """1:1 scale bar (mm units) - used on print sheets."""
    s = [f'<rect x="{x}" y="{y}" width="{length_mm}" height="1.6" fill="none" stroke="#000" stroke-width="0.25"/>']
    for i in range(ticks):
        if i % 2 == 0:
            s.append(f'<rect x="{x + i * length_mm / ticks}" y="{y}" width="{length_mm / ticks}" height="1.6" fill="#000"/>')
    s.append(f'<text x="{x}" y="{y + 1.6 + fs * 1.15}" font-family="Geist Mono" font-size="{fs}" fill="#000">0</text>')
    s.append(f'<text x="{x + length_mm}" y="{y + 1.6 + fs * 1.15}" font-family="Geist Mono" font-size="{fs}" fill="#000" text-anchor="end">{length_mm} mm</text>')
    return "".join(s)
