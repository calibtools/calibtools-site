"""CT-PS · ChArUco generator print sheet.

Builds the A4 and Letter print sheets, verifies the OpenCV ChArUco geometry,
and performs PDF/raster quality checks.
"""
import json
import os
import subprocess
import sys
from pathlib import Path

import cv2
import fitz
import numpy as np

sys.path.insert(0, "/home/ubuntu/work/docs/system")
from ctdoc import Doc, esc
import ctpattern as CP


# Fixed generator input specified for this print sheet.
CODE = "CT-PS-A4X7Q"
REV = "A"
DATE = "2026-10-26"
ROWS, COLS = 7, 5
SQUARE_MM, MARKER_MM = 30.0, 22.0
DICT_NAME = "DICT_6X6_250"
START_ID = 0
PATTERN_W_MM, PATTERN_H_MM = COLS * SQUARE_MM, ROWS * SQUARE_MM
OUT_BASE = f"/home/ubuntu/work/docs/out/CT-PS/{CODE}"


def charuco_board():
    """Create the OpenCV board and make the marker range an observed value."""
    dictionary = cv2.aruco.getPredefinedDictionary(CP.DICTS[DICT_NAME])
    board = cv2.aruco.CharucoBoard((COLS, ROWS), SQUARE_MM, MARKER_MM, dictionary)
    marker_ids = sorted(int(i) for i in board.getIds().flatten())
    corner_count = len(board.getChessboardCorners())
    assert marker_ids == list(range(START_ID, START_ID + len(marker_ids))), marker_ids
    assert marker_ids[0] == 0 and marker_ids[-1] == 16 and len(marker_ids) == 17
    assert corner_count == (ROWS - 1) * (COLS - 1) == 24
    return board, marker_ids, corner_count


def axis_overlay():
    """Axes at the OpenCV origin; arrow shafts ride the outer grid edges.

    The X/Y labels sit in the white margin. Keeping the shafts on the boundary
    leaves the marker-bearing white cells unmodified for detector robustness.
    """
    red_arrow = CP.arrow(6, 0, 14, 0, CP.RED, 0.55, 1.8)
    green_arrow = CP.arrow(6, 0, 6, 8, CP.GREEN, 0.55, 1.8)
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 24"
      style="position:absolute;left:-6mm;top:0;width:22mm;height:24mm;overflow:visible">
      {red_arrow}{green_arrow}
      <circle cx="6" cy="0" r="0.6" fill="#282828"/>
      <text x="15.2" y="3.2" font-family="Geist" font-size="3.2" font-weight="700" fill="#E60012">X</text>
      <text x="2.8" y="9.7" text-anchor="middle" font-family="Geist" font-size="3.2" font-weight="700" fill="#00A651">Y</text>
    </svg>'''


def target_svg():
    # CP.board_svg is deliberately limited to the nominal 150 × 210 mm grid.
    # Its top-left square is black because (row + column) == 0 is even.
    grid = CP.board_svg(
        PATTERN_W_MM, PATTERN_H_MM, ROWS, COLS, SQUARE_MM,
        marker=MARKER_MM, mx=0, my=0, dict_name=DICT_NAME,
        start_id=START_ID, axes_spec=None, outline=False, origin=False,
        mode="print", width_mm=PATTERN_W_MM, height_mm=PATTERN_H_MM,
    )
    return f'''<div class="true-scale" style="position:relative;width:{PATTERN_W_MM:g}mm;height:{PATTERN_H_MM:g}mm;margin:0 auto">
      {grid}{axis_overlay()}
    </div>'''


def scale_bar_svg():
    return f'''<div class="true-scale" style="width:100mm;height:5.6mm">
      <svg xmlns="http://www.w3.org/2000/svg" width="100mm" height="5.6mm" viewBox="0 0 100 5.6" style="display:block">
        {CP.scale_bar(0, 0, length_mm=100, ticks=10, fs=2.35)}
      </svg>
    </div>'''


def info_block(marker_ids):
    id_range = f"{marker_ids[0]}–{marker_ids[-1]}"
    # The 6 pt Mono setting is intentionally reserved for the print-critical
    # information block so the 1:1 grid remains unobstructed on a single page.
    return f'''<div style="display:flex;justify-content:flex-end;margin-top:0">
      <div style="width:calc(100mm * var(--cs));font-family:'Geist Mono';font-size:6pt;line-height:1.28;color:#333;letter-spacing:-0.015em">
        <div style="display:grid;grid-template-columns:1fr 1fr;column-gap:4mm;white-space:nowrap">
          <span>Pattern type · ChArUco</span><span>Rows × cols · {ROWS} × {COLS}</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;column-gap:4mm;white-space:nowrap">
          <span>Square / marker · {SQUARE_MM:g} / {MARKER_MM:g} mm</span><span>Dictionary · {DICT_NAME}</span>
        </div>
        <div>Start ID / ID range · {START_ID} / {id_range}</div>
        <div>Paper · A4 / Letter · Print at 100 % (no fit to page)</div>
        <div style="margin-top:0.25mm">{scale_bar_svg()}</div>
        <div>Generated · {DATE} · calib.tools/tools/generator?A4X7Q</div>
        <div>Printed targets: ±0.1–0.3 mm typical. For better, see calib.tools/targets.</div>
      </div>
    </div>'''


def build():
    board, marker_ids, corner_count = charuco_board()
    print(f"OpenCV ChArUcoBoard: {len(marker_ids)} markers, IDs {marker_ids[0]}–{marker_ids[-1]}; {corner_count} corners")
    doc = Doc(CODE, REV, DATE, eyebrow="Print sheet", title="ChArUco 7 × 5 · 30 / 22 mm")
    # A print sheet needs its 210 mm target to remain 1:1 on Letter.  The
    # title uses the normal system styles, with only unused title-block space
    # removed to reserve that physically necessary vertical measure.
    title = (f'<div class="eyebrow" style="margin:1mm 0 0.4mm;line-height:1.1">{esc(doc.eyebrow)}</div>'
             f'<h1 style="font-size:20pt;line-height:1.1;margin:0">{esc(doc.title)}</h1>'
             '<div style="height:0.5mm"></div>')
    doc.add_page(title + target_svg() + info_block(marker_ids), title_block=False)
    report = doc.render(OUT_BASE)
    assert not report["overflow"], report
    return report, board, marker_ids, corner_count


# --- PDF geometry QC -------------------------------------------------------

def _black_component_measurements(pdf_path, dpi=1200):
    """Rasterize with PyMuPDF and return physical dimensions of black components.

    Rendering through PyMuPDF is used for the dimensional check, rather than
    trusting the requested CSS size. At 1200 dpi one pixel is 0.0212 mm.
    """
    page = fitz.open(pdf_path)[0]
    pix = page.get_pixmap(dpi=dpi, colorspace=fitz.csGRAY, alpha=False)
    image = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width)
    # The pale SAMPLE watermark is intentionally excluded; target and bar ink
    # remain well below this threshold even after anti-aliasing.
    binary = (image < 80).astype(np.uint8)
    n, _, stats, _ = cv2.connectedComponentsWithStats(binary, connectivity=4)
    mm_per_px = 25.4 / dpi
    components = []
    for x, y, w, h, area in stats[1:]:
        components.append({
            "x": x * mm_per_px, "y": y * mm_per_px,
            "w": w * mm_per_px, "h": h * mm_per_px,
            "area": area * mm_per_px * mm_per_px,
            "px": (int(x), int(y), int(w), int(h), int(area)),
        })
    return components


def measure_pdf_geometry(pdf_path):
    """Measure pitch and scale-bar lengths after PDF generation with PyMuPDF."""
    components = _black_component_measurements(pdf_path)
    # A complete black checker square is 30 × 30 mm and is isolated under
    # 4-connected labeling.  The median component size measures the true pitch.
    squares = [c for c in components if 28.5 < c["w"] < 31.5 and 28.5 < c["h"] < 31.5]
    assert len(squares) >= 16, f"expected checker squares; found {len(squares)} in {pdf_path}"
    pitch = float(np.median([(c["w"] + c["h"]) / 2 for c in squares]))
    # The 100 mm scale-bar outline is the only long, low horizontal component.
    bars = [c for c in components if 98.5 < c["w"] < 101.5 and 1.0 < c["h"] < 3.5]
    assert bars, f"100 mm scale bar not found in {pdf_path}"
    # The directly rasterized external extent is the print-user's usable bar
    # length. It measures the rendered PDF rather than the requested SVG size.
    scale = min(bars, key=lambda c: abs(c["w"] - 100.0))["w"]
    return pitch, scale


def detector_check(pdf_path, board, marker_ids, corner_count):
    """Rasterize at 300 dpi and prove detector output against the board IDs."""
    png_base = Path(OUT_BASE).parent / (Path(pdf_path).stem + "-qc-300")
    subprocess.run(["pdftoppm", "-f", "1", "-singlefile", "-r", "300", "-png", pdf_path, str(png_base)], check=True)
    image = cv2.imread(str(png_base) + ".png", cv2.IMREAD_GRAYSCALE)
    assert image is not None, png_base
    detector = cv2.aruco.CharucoDetector(board)
    charuco_corners, charuco_ids, marker_corners, detected_marker_ids = detector.detectBoard(image)
    got_markers = [] if detected_marker_ids is None else sorted(int(i) for i in detected_marker_ids.flatten())
    got_corners = [] if charuco_ids is None else sorted(int(i) for i in charuco_ids.flatten())
    expected_corners = list(range(corner_count))
    assert got_markers == marker_ids, ("marker IDs", got_markers, marker_ids)
    assert got_corners == expected_corners, ("corner IDs", got_corners, expected_corners)
    return len(got_markers), len(got_corners), str(png_base) + ".png"


def quality_check(board, marker_ids, corner_count):
    checks = {}
    for label, pdf in (("A4", OUT_BASE + ".pdf"), ("Letter", OUT_BASE + "-letter.pdf")):
        pitch, scale = measure_pdf_geometry(pdf)
        assert abs(pitch - SQUARE_MM) <= 0.05, (label, "pitch", pitch)
        assert abs(scale - 100.0) <= 0.05, (label, "scale", scale)
        checks[label] = {"pitch_mm": pitch, "scale_mm": scale}
    a4_markers, a4_corners, qc_png = detector_check(OUT_BASE + ".pdf", board, marker_ids, corner_count)
    assert a4_markers == len(marker_ids) and a4_corners == corner_count
    print("PDF geometry QC (PyMuPDF): " + "; ".join(
        f"{paper} pitch {v['pitch_mm']:.3f} mm, scale {v['scale_mm']:.3f} mm" for paper, v in checks.items()))
    print(f"A4 300 dpi detector QC: {a4_markers}/{len(marker_ids)} markers; {a4_corners}/{corner_count} corners")
    return checks, qc_png


if __name__ == "__main__":
    _, board, marker_ids, corner_count = build()
    quality_check(board, marker_ids, corner_count)
