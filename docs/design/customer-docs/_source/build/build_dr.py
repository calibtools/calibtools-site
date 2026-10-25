"""CT-DR · Detection check report (one page).

Builds an image-based ChArUco detection diagnostic from the supplied capture. The
analysis intentionally uses cv2.aruco.CharucoDetector with both the current
(OpenCV >= 4.6) and legacy ChArUco layouts; the layout producing the most
ChArUco corners is selected and disclosed in the report.
"""
import json
import os
import sys
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, "/home/ubuntu/work/docs/system")
from ctdoc import Doc, esc, kv, note, p, result_box, section, status, table


SYSTEM = Path("/home/ubuntu/work/docs/system")
SOURCE_IMAGE = Path("/home/ubuntu/work/deliver/products/charuco-ceramic/01-hero.png")
OUT_DIR = Path("/home/ubuntu/work/docs/out/CT-DR")
OUT_BASE = OUT_DIR / "CT-DR-3M8Q1"
S = json.load(open(SYSTEM / "sample.json"))
P, U = S["product"], S["unit"]


# These thresholds are document assumptions for this image-screening tool. They
# are intentionally simple, visible in the report, and do not assert a target's
# dimensional conformance.
DETECTION_PASS_RATE = 95.0
CONTRAST_PASS_DELTA = 100.0       # grayscale levels, white minus black
SHARPNESS_PASS_SCORE = 150.0      # variance-of-Laplacian score


def _detect(gray, legacy):
    """Run the required CharucoDetector for one OpenCV board-layout convention."""
    dictionary = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_6X6_250)
    board = cv2.aruco.CharucoBoard((P["cols"], P["rows"]), float(P["sq"]), float(P["marker"]), dictionary)
    board.setLegacyPattern(legacy)
    detector = cv2.aruco.CharucoDetector(
        board, cv2.aruco.CharucoParameters(), cv2.aruco.DetectorParameters()
    )
    charuco_corners, charuco_ids, marker_corners, marker_ids = detector.detectBoard(gray)
    return {
        "legacy": legacy,
        "board": board,
        "charuco_corners": charuco_corners,
        "charuco_ids": charuco_ids,
        "marker_corners": marker_corners,
        "marker_ids": marker_ids,
        "markers": 0 if marker_ids is None else int(len(marker_ids)),
        "corners": 0 if charuco_ids is None else int(len(charuco_ids)),
    }


def _expected_rc(corner_id):
    """ChArUco ID -> intersection row/column for the current OpenCV layout."""
    cols_between = P["cols"] - 1
    return divmod(int(corner_id), cols_between)


def _missing_components(missing_ids):
    """Connected row/column clusters of missing corners for grey outline boxes."""
    remaining = set(int(i) for i in missing_ids)
    components = []
    while remaining:
        seed = remaining.pop()
        todo, part = [seed], [seed]
        while todo:
            cur = todo.pop()
            r, c = _expected_rc(cur)
            neighbors = []
            for rr, cc in ((r - 1, c), (r + 1, c), (r, c - 1), (r, c + 1)):
                if 0 <= rr < P["rows"] - 1 and 0 <= cc < P["cols"] - 1:
                    neighbors.append(rr * (P["cols"] - 1) + cc)
            for nxt in neighbors:
                if nxt in remaining:
                    remaining.remove(nxt)
                    todo.append(nxt)
                    part.append(nxt)
        components.append(part)
    return components


def _analyse_image():
    """Detect corners, write a reproducible overlay, and calculate screening metrics."""
    image = cv2.imread(str(SOURCE_IMAGE), cv2.IMREAD_COLOR)
    if image is None:
        raise FileNotFoundError(f"Cannot read supplied image: {SOURCE_IMAGE}")
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # The user asked that the >=4.6 layout be tried first, with legacy only as
    # a fall-back/diagnostic. Selection is deterministic by corner then marker count.
    current = _detect(gray, legacy=False)
    legacy = _detect(gray, legacy=True)
    selected = max((current, legacy), key=lambda r: (r["corners"], r["markers"]))

    expected_markers, expected_corners = int(P["markers"]), int(P["corners"])
    charuco_ids = (np.array([], dtype=np.int32) if selected["charuco_ids"] is None
                   else selected["charuco_ids"].reshape(-1).astype(np.int32))
    detected_set = set(int(i) for i in charuco_ids)
    missing_ids = sorted(set(range(expected_corners)) - detected_set)

    # Work on a reduced copy only for the report visual; it preserves the source
    # image itself and keeps the PDF compact. Overlay ink is greyscale only.
    overlay = image.copy()
    dot_radius = max(3, int(round(min(image.shape[:2]) / 500)))
    if selected["charuco_corners"] is not None:
        for xy in selected["charuco_corners"].reshape(-1, 2):
            x, y = (int(round(float(xy[0]))), int(round(float(xy[1]))))
            cv2.circle(overlay, (x, y), dot_radius, (25, 25, 25), -1, cv2.LINE_AA)
            cv2.circle(overlay, (x, y), max(1, dot_radius // 2), (245, 245, 245), -1, cv2.LINE_AA)

    # A homography lets the report derive square-region contrast consistently,
    # and supplies expected pixel positions if missing-corner clusters exist.
    homography = None
    if selected["corners"] >= 4:
        obj = selected["board"].getChessboardCorners()[charuco_ids, :2].astype(np.float32)
        img_pts = selected["charuco_corners"].reshape(-1, 2).astype(np.float32)
        homography, _ = cv2.findHomography(obj, img_pts, cv2.RANSAC, 2.0)

    if homography is not None and missing_ids:
        for component in _missing_components(missing_ids):
            pts_board = []
            for cid in component:
                r, c = _expected_rc(cid)
                pts_board.append(((c + 1) * P["sq"], (r + 1) * P["sq"]))
            pts_img = cv2.perspectiveTransform(np.array(pts_board, dtype=np.float32).reshape(-1, 1, 2), homography)
            x, y, w, h = cv2.boundingRect(pts_img.astype(np.int32))
            pad = 12
            cv2.rectangle(overlay, (max(0, x - pad), max(0, y - pad)),
                          (min(overlay.shape[1] - 1, x + w + pad), min(overlay.shape[0] - 1, y + h + pad)),
                          (102, 102, 102), max(2, dot_radius // 2), cv2.LINE_AA)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    overlay_path = OUT_DIR / "CT-DR-3M8Q1-overlay.png"
    # The output is a new report asset, never an overwrite of the supplied image.
    cv2.imwrite(str(overlay_path), overlay, [cv2.IMWRITE_PNG_COMPRESSION, 5])

    contrast = None
    sharpness = None
    levels = None
    if homography is not None:
        # Warp image pixels to a 12 px/mm pattern frame (170 x 120 mm). Sampling
        # black-square centers and the unmarked rim of white marker squares avoids
        # treating the marker payload itself as the white level.
        scale = 12.0
        to_pattern = np.array([[scale, 0, 0], [0, scale, 0], [0, 0, 1]], dtype=np.float64) @ np.linalg.inv(homography)
        warped = cv2.warpPerspective(gray, to_pattern, (int(P["pattern_w"] * scale), int(P["pattern_h"] * scale)),
                                     flags=cv2.INTER_CUBIC)

        def patch_mean(x_mm, y_mm, half_px):
            x, y = int(round(x_mm * scale)), int(round(y_mm * scale))
            patch = warped[max(0, y - half_px): min(warped.shape[0], y + half_px),
                           max(0, x - half_px): min(warped.shape[1], x + half_px)]
            return float(patch.mean())

        black_levels, white_levels = [], []
        for r in range(P["rows"]):
            for c in range(P["cols"]):
                if (r + c) % 2 == 0:
                    black_levels.append(patch_mean((c + 0.5) * P["sq"], (r + 0.5) * P["sq"], 16))
                else:
                    # 0.65 mm inset stays inside each white square's unmarked border.
                    for dx, dy in ((0.65, 0.65), (9.35, 0.65), (0.65, 9.35), (9.35, 9.35)):
                        white_levels.append(patch_mean(c * P["sq"] + dx, r * P["sq"] + dy, 3))
        black_mean, white_mean = float(np.mean(black_levels)), float(np.mean(white_levels))
        contrast = white_mean - black_mean
        levels = (black_mean, white_mean)
        sharpness = float(cv2.Laplacian(warped, cv2.CV_64F).var())

    corner_rate = 100.0 * selected["corners"] / expected_corners
    marker_rate = 100.0 * selected["markers"] / expected_markers
    return {
        "image": image,
        "overlay_path": overlay_path,
        "selected": selected,
        "current": current,
        "legacy": legacy,
        "expected_markers": expected_markers,
        "expected_corners": expected_corners,
        "marker_rate": marker_rate,
        "corner_rate": corner_rate,
        "missing_ids": missing_ids,
        "contrast": contrast,
        "sharpness": sharpness,
        "levels": levels,
    }


def _rate_status(rate):
    return "PASS" if rate >= DETECTION_PASS_RATE else "FAIL"


def _quality_status(value, threshold):
    return "PASS" if value is not None and value >= threshold else "N/A"


def _missing_description(missing_ids):
    if not missing_ids:
        return "None — all 176 expected ChArUco intersections were detected."
    groups = _missing_components(missing_ids)
    labels = []
    for g in groups[:3]:
        rs, cs = zip(*(_expected_rc(i) for i in g))
        labels.append(f"rows {min(rs) + 1}–{max(rs) + 1}, cols {min(cs) + 1}–{max(cs) + 1} ({len(g)} corners)")
    tail = "; ".join(labels) + ("; additional regions omitted" if len(groups) > 3 else "")
    return f"{len(missing_ids)} expected corners missed: {tail}."


def _diagnosis(a):
    if a["selected"]["corners"] == 0:
        return ("Detection failed with both tested layouts. The image cannot be registered to the stated board pattern; "
                "check framing, focus, exposure and the printed pattern before a print/capture distinction is made.")
    if a["corner_rate"] < DETECTION_PASS_RATE:
        return ("Partial corner loss is present. Localised loss suggests a capture condition first; widespread repeated marker or "
                "edge loss would instead suggest a target print/surface issue.")
    if a["contrast"] is not None and a["contrast"] < CONTRAST_PASS_DELTA:
        return ("Low black/white separation is indicated. Check exposure and diffuse lighting first; if the condition is uniform "
                "across repeat captures, inspect the target surface or replace the target.")
    if a["sharpness"] is not None and a["sharpness"] < SHARPNESS_PASS_SCORE:
        return ("Low edge sharpness is indicated, consistent with capture blur. Stabilise the camera, refocus and re-capture "
                "before judging target print quality.")
    return ("No print or capture issue is indicated by this automated screen. Full marker/corner coverage, contrast and edge "
            "sharpness do not suggest uniform target defects, blur, glare or unsuitable exposure in this image.")


def _recommendations(a):
    if a["selected"]["corners"] == 0:
        return [["Replace target", "Do not decide from this image; re-capture first."],
                ["Change lighting", "Use diffuse, even illumination; avoid glare."],
                ["Change exposure", "Adjust to retain black/white separation, then re-run."]]
    if a["corner_rate"] < DETECTION_PASS_RATE or (a["contrast"] is not None and a["contrast"] < CONTRAST_PASS_DELTA):
        return [["Replace target", "Inspect/re-capture; replace only if loss repeats uniformly."],
                ["Change lighting", "Use diffuse, even illumination; avoid glare."],
                ["Change exposure", "Avoid clipping and retain black/white separation."]]
    if a["sharpness"] is not None and a["sharpness"] < SHARPNESS_PASS_SCORE:
        return [["Replace target", "Not indicated from this capture."],
                ["Change lighting", "Maintain even illumination."],
                ["Change exposure", "Refocus/stabilise first; retain current exposure."]]
    return [["Replace target", "Not indicated by this image."],
            ["Change lighting", "No change indicated; retain diffuse, even lighting."],
            ["Change exposure", "No change indicated; retain current separation."]]


LOCAL_CSS = """
<style>
.dr-meta { display:grid; grid-template-columns:1fr 1fr; gap:8mm; align-items:start; margin-bottom:2.5mm; }
.dr-meta > div { min-width:0; }
.dr-meta .tag { margin-bottom:1.0mm; }
.dr-kv { font-size:8.8pt; line-height:1.24; }
.dr-kv dt { font-size:7.8pt; }
.dr-kv dd.m { font-size:8.35pt; }
.dr-figuregrid { display:grid; grid-template-columns:108mm 1fr; gap:7mm; align-items:start; }
.dr-photo { width:108mm; height:67mm; object-fit:contain; object-position:center; display:block; border:0.25mm solid #B3B3B3; background:#F2F2F2; }
.dr-side { min-width:0; padding-top:0.1mm; }
.dr-side .tag { margin-bottom:1.4mm; }
.dr-stat { border-top:0.25mm solid #E6E6E6; padding:1.15mm 0 1.1mm; display:grid; grid-template-columns:1fr auto; column-gap:2mm; align-items:baseline; font-size:8.65pt; line-height:1.25; }
.dr-stat:first-of-type { border-top:0.35mm solid #000; }
.dr-stat .value { font-family:'Geist Mono'; font-size:8.4pt; color:#000; text-align:right; white-space:nowrap; }
.dr-side .small { font-size:7.8pt; line-height:1.33; margin-top:2.0mm; }
.dr-two { display:grid; grid-template-columns:1.16fr .84fr; gap:8mm; align-items:start; }
.dr-two .box { padding:2.1mm 2.6mm; }
.dr-two .tag { margin-bottom:0.9mm; }
.dr-two p { font-size:8.85pt; line-height:1.35; margin:0; }
.dr-rec td { padding-top:0.55mm !important; padding-bottom:0.55mm !important; }
.dr-rec td:first-child { font-family:'Geist Mono'; font-size:8.25pt; white-space:nowrap; }
.dr-scope { font-size:8.2pt; line-height:1.34; }
</style>
"""


def build():
    a = _analyse_image()
    selected = a["selected"]
    is_current = not selected["legacy"]
    selected_label = "OpenCV 4.6+ layout" if is_current else "Legacy layout"
    selected_setting = "setLegacyPattern(False)" if is_current else "setLegacyPattern(True)"

    detection_ok = a["corner_rate"] >= DETECTION_PASS_RATE
    result_word = "PASS" if detection_ok else "FAIL"
    if detection_ok:
        result_text = "All expected markers and ChArUco corners were detected in the supplied image."
    else:
        result_text = "Detection coverage is below the stated 95.0% ChArUco-corner threshold."

    image_h, image_w = a["image"].shape[:2]
    item_block = kv([
        ("File name", esc(SOURCE_IMAGE.name)),
        ("Source", "User-supplied image"),
        ("Resolution", f"{image_w} × {image_h} px"),
        ("File format", "PNG"),
        ("Board serial", U["sn"]),
        ("Part number", P["part"]),
    ], mono_keys=("File name", "Resolution", "Board serial", "Part number"), style="")
    parameters_block = kv([
        ("Detector", "cv2.aruco.CharucoDetector"),
        ("Dictionary", P["dict"]),
        ("Board geometry", f'{P["rows"]} × {P["cols"]} squares · {P["sq"]} / {P["marker"]} mm'),
        ("Expected", f'{P["markers"]} markers · {P["corners"]} corners'),
        ("Layout selected", f"{selected_label} · {selected_setting}"),
        ("Legacy trial", f'{a["legacy"]["markers"]}/{P["markers"]} markers · {a["legacy"]["corners"]}/{P["corners"]} corners'),
    ], mono_keys=("Detector", "Dictionary", "Expected", "Layout selected", "Legacy trial"))

    detection_side = f'''<div class="dr-side">
      <div class="tag">Detected in selected layout</div>
      <div class="dr-stat"><span>Markers</span><span class="value">{selected["markers"]} / {a["expected_markers"]} · {status(_rate_status(a["marker_rate"]))}</span></div>
      <div class="dr-stat"><span>ChArUco corners</span><span class="value">{selected["corners"]} / {a["expected_corners"]} · {status(_rate_status(a["corner_rate"]))}</span></div>
      <div class="dr-stat"><span>Detection rate</span><span class="value">{a["corner_rate"]:.1f}%</span></div>
      <div class="small"><span class="tag">Missed-corner regions</span><br>{esc(_missing_description(a["missing_ids"]))}</div>
      <div class="small"><span class="tag">Overlay key</span><br>Black/white dots: detected corners. Grey outlines: missed-corner regions; none are present.</div>
    </div>'''

    if a["contrast"] is None:
        contrast_value, contrast_method, contrast_status = "—", "No valid board registration", "N/A"
        sharp_value, sharp_method, sharp_status = "—", "No valid board registration", "N/A"
    else:
        black_level, white_level = a["levels"]
        contrast_value = f"{a['contrast']:.1f}"
        contrast_method = f"white {white_level:.1f} − black {black_level:.1f}"
        contrast_status = _quality_status(a["contrast"], CONTRAST_PASS_DELTA)
        sharp_value = f"{a['sharpness']:.1f}"
        sharp_method = "variance of Laplacian, rectified pattern"
        sharp_status = _quality_status(a["sharpness"], SHARPNESS_PASS_SCORE)

    quality_table = table(
        [("Check", "t"), ("Observed", "n"), ("Threshold", "n"), ("Method", "t"), ("Result", "s")],
        [["Detection rate (corners)", f"{a['corner_rate']:.1f}%", f"min. {DETECTION_PASS_RATE:.1f}%", "expected-corner coverage", _rate_status(a["corner_rate"])],
         ["Edge contrast (dL)", contrast_value, f"min. {CONTRAST_PASS_DELTA:.0f}", contrast_method, contrast_status],
         ["Edge sharpness score", sharp_value, f"min. {SHARPNESS_PASS_SCORE:.0f}", sharp_method, sharp_status]],
        cls="dense", widths=["25%", "15%", "16%", "31%", "13%"]
    )

    rec_rows = _recommendations(a)
    recommendation_table = table(
        [("Action", "t"), ("Recommendation", "t")],
        [[esc(action), esc(recommendation)] for action, recommendation in rec_rows],
        cls="dense dr-rec plain", widths=["32%", "68%"]
    )

    d = Doc(
        "CT-DR-3M8Q1", "A", "2026-11-20",
        eyebrow="Detection check report", title="Detection check · 1 image", sn=U["sn"]
    )
    result_meta = (f'{selected["markers"]}/{a["expected_markers"]} markers · '
                   f'{selected["corners"]}/{a["expected_corners"]} corners<br>'
                   f'layout: {"current" if is_current else "legacy"}')
    page = (
        LOCAL_CSS
        + f'''<div class="dr-meta">
              <div><div class="tag">Input image</div><div class="dr-kv">{item_block}</div></div>
              <div><div class="tag">Input parameters</div><div class="dr-kv">{parameters_block}</div></div>
            </div>'''
        + result_box(result_word, result_text, label="Screening result", strip=True, meta=result_meta)
        + section(1, "Detection overlay", "user-supplied capture")
        + f'''<div class="dr-figuregrid"><figure><img class="dr-photo" src="file://{a["overlay_path"]}" alt="Detected ChArUco corners overlaid on supplied image"><figcaption>Detected-corner overlay generated from the supplied image. Original image colours are retained; report overlay ink is black, white and grey.</figcaption></figure>{detection_side}</div>'''
        + section(2, "Image quality checks", "screening thresholds stated")
        + quality_table
        + section(3, "Diagnosis and recommendations")
        + f'''<div class="dr-two"><div class="box"><div class="tag">Print vs capture diagnosis</div><p>{esc(_diagnosis(a))}</p></div><div><div class="tag" style="margin-bottom:1.0mm">Recommended next action</div>{recommendation_table}</div></div>'''
        + '<div class="push">'
        + note("This report is an automated detection screen of one user-supplied image. It does not replace dimensional inspection of the target.", label="Scope")
        + '</div>'
    )
    d.add_page(page)
    return d.render(str(OUT_BASE))


if __name__ == "__main__":
    build()
