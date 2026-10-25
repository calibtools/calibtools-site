#!/usr/bin/env python3
"""
brand-overlay.py — detect white calibration boards in product photos,
overlay brand markings (margin text + coordinate axes), colour-correct,
and export WebP.

Subcommands:
  detect   — find boards, write brand-overlay.json + preview PNGs
  overlay  — read json, render markings, warp, colour-correct, output WebP

Requires: opencv-python-headless, Pillow, numpy
"""
import argparse, cv2, json, math, os, sys
import numpy as np
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# ── paths ──────────────────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).resolve().parent
REPO       = SCRIPT_DIR.parent
SRC_DIR    = Path.home() / "Documents/Calib.Tools/05-品牌与设计/AI产品图-暗色-原图/brand/dark"
OUT_DIR    = REPO / "src/assets/products/brand/dark"
PREVIEW_DIR= SCRIPT_DIR / "brand-overlay-preview"
JSON_PATH  = SCRIPT_DIR / "brand-overlay.json"
FONT_DIR   = REPO / "public/fonts"

# ── board specs (mm) ───────────────────────────────────────────────────
BOARDS = {
    "B1": {
        "board_mm": (300, 240),
        "pattern_mm": (250, 175),
        "text": "CALIB.TOOLS   CT-CHT-P-300240-2500   Checkerboard 7\u00d710 \u00b7 25 mm   SN 000093 \u00b7 Rev A",
    },
    "B2": {
        "board_mm": (300, 240),
        "pattern_mm": (250, 175),
        "text": "CALIB.TOOLS   CT-CHA-P-300240-2518   ChArUco 7\u00d710 \u00b7 25/18 mm \u00b7 DICT_6X6_250 \u00b7 IDs 0\u201334   SN 000127 \u00b7 Rev A",
    },
    "B3": {
        "board_mm": (200, 150),
        "pattern_mm": (170, 120),
        "text": "CALIB.TOOLS   CT-CHA-C-200150-1007   ChArUco 12\u00d717 \u00b7 10/7 mm \u00b7 DICT_6X6_250 \u00b7 IDs 0\u2013101   SN 000311 \u00b7 Rev A",
    },
}

# which board in which image (reading order: top-left first, then right, then next row)
IMAGE_BOARDS = {
    "hero-three-boards.png":        ["B1", "B2", "B3"],
    "hero-three-boards-mobile.png": ["B1", "B2", "B3"],
    "og-default.png":               ["B1", "B2", "B3"],
    "family-composite.png":         ["B1", "B2"],
    "family-ceramic.png":           ["B3"],
    "family-mounts.png":            ["B2"],
    "family-set.png":               ["B2", "B2", "B2", "B2"],
}

# family-set per-board overrides (TL, TR, BL, BR)
FAMILY_SET_OVERRIDES = [
    {"ids": "IDs 0\u201334",   "sn": "SN 000201", "id_label": "#0",   "start_id": 0},
    {"ids": "IDs 35\u201369",  "sn": "SN 000202", "id_label": "#35",  "start_id": 35},
    {"ids": "IDs 70\u2013104", "sn": "SN 000203", "id_label": "#70",  "start_id": 70},
    {"ids": "IDs 105\u2013139","sn": "SN 000204", "id_label": "#105", "start_id": 105},
]

# ── helpers ────────────────────────────────────────────────────────────

def order_corners(pts):
    """Order 4 points as TL, TR, BR, BL."""
    pts = sorted(pts, key=lambda p: p[1])  # sort by y
    top = sorted(pts[:2], key=lambda p: p[0])   # TL, TR
    bot = sorted(pts[2:], key=lambda p: p[0])   # BL, BR
    return [top[0], top[1], bot[1], bot[0]]      # TL, TR, BR, BL


def detect_boards(img):
    """Detect white quadrilateral boards in a BGR image."""
    h, w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    min_area = 0.02 * h * w

    quads = []
    for c in contours:
        area = cv2.contourArea(c)
        if area < min_area:
            continue
        peri = cv2.arcLength(c, True)
        approx = None
        for eps in [0.02, 0.03, 0.04]:
            a = cv2.approxPolyDP(c, eps * peri, True)
            if len(a) == 4:
                approx = a
                break
        if approx is None:
            continue
        pts = approx.reshape(4, 2).tolist()
        corners = order_corners(pts)
        cx = sum(p[0] for p in corners) / 4
        cy = sum(p[1] for p in corners) / 4
        quads.append({"corners": corners, "cx": cx, "cy": cy, "area": area})

    # sort reading order: by row (cy), then by column (cx)
    quads.sort(key=lambda q: (q["cy"], q["cx"]))
    return quads


def load_font(name, size):
    """Load a Geist font from the repo's public/fonts dir."""
    mapping = {
        "sans": FONT_DIR / "GeistVariable.woff2",
        "mono": FONT_DIR / "GeistMonoVariable.woff2",
    }
    path = mapping.get(name)
    if path and path.exists():
        return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


# ── detect command ─────────────────────────────────────────────────────

def cmd_detect(args):
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    result = {}

    for fname, board_ids in IMAGE_BOARDS.items():
        src_path = SRC_DIR / fname
        if not src_path.exists():
            print(f"  SKIP {fname} (not found)")
            continue

        img = cv2.imread(str(src_path))
        h, w = img.shape[:2]
        quads = detect_boards(img)
        print(f"  {fname} ({w}x{h}): {len(quads)} quads detected, {len(board_ids)} expected")

        boards = []
        preview = img.copy()

        for i, bid in enumerate(board_ids):
            if i < len(quads):
                q = quads[i]
                corners = [[int(round(p[0])), int(round(p[1]))] for p in q["corners"]]
                entry = {"board_id": bid, "corners": corners, "area": int(round(q["area"]))}

                # draw on preview
                pts_np = np.array(corners, dtype=np.int32)
                cv2.polylines(preview, [pts_np], True, (0, 255, 0), 2)
                for j, (px, py) in enumerate(corners):
                    label = ["TL", "TR", "BR", "BL"][j]
                    cv2.circle(preview, (px, py), 6, (0, 0, 255), -1)
                    cv2.putText(preview, f"{i}.{label}", (px + 8, py - 4),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1)
                # board label at centre
                cx = sum(p[0] for p in corners) // 4
                cy = sum(p[1] for p in corners) // 4
                cv2.putText(preview, f"Board {i}: {bid}", (cx - 40, cy),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)
            else:
                entry = {"board_id": bid, "corners": None, "area": None}
            boards.append(entry)

        result[fname] = {"dims": [w, h], "boards": boards}
        cv2.imwrite(str(PREVIEW_DIR / fname), preview)
        print(f"    Preview → {PREVIEW_DIR / fname}")

    with open(JSON_PATH, "w") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    print(f"\n  Detection JSON → {JSON_PATH}")


# ── overlay command ────────────────────────────────────────────────────

def make_overlay(board_spec, board_px_w, board_px_h, text_override=None, id_label=None):
    """Create an RGBA overlay image in board pixel space (4× resolution)."""
    scale = 4
    ow = board_px_w * scale
    oh = board_px_h * scale

    bw_mm, bh_mm = board_spec["board_mm"]
    pw_mm, ph_mm = board_spec["pattern_mm"]
    mm_to_px = ow / bw_mm  # pixels per mm at overlay resolution

    # margins in mm
    margin_left = (bw_mm - pw_mm) / 2
    margin_top = (bh_mm - ph_mm) / 2
    margin_bot = margin_top

    overlay = Image.new("RGBA", (ow, oh), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # ── bottom margin text ──
    text = text_override or board_spec["text"]
    cap_h_mm = 0.01 * bh_mm  # 1% of board height
    cap_h_px = cap_h_mm * mm_to_px

    # Font sizes — Pillow point size ≈ pixel size for screen
    font_size = max(8, int(round(cap_h_px)))
    font_sans = load_font("sans", font_size)
    font_mono = load_font("mono", font_size)

    # Split text: "CALIB.TOOLS" in sans, rest in mono
    wordmark = "CALIB.TOOLS"
    rest = text[len(wordmark):]

    wm_bbox = font_sans.getbbox(wordmark)
    wm_w = wm_bbox[2] - wm_bbox[0]
    rest_bbox = font_mono.getbbox(rest)
    rest_w = rest_bbox[2] - rest_bbox[0]
    total_w = wm_w + rest_w

    # Ensure ≤ 45% of board width
    max_w = 0.45 * ow
    if total_w > max_w:
        ratio = max_w / total_w
        font_size = max(6, int(font_size * ratio))
        font_sans = load_font("sans", font_size)
        font_mono = load_font("mono", font_size)
        wm_bbox = font_sans.getbbox(wordmark)
        wm_w = wm_bbox[2] - wm_bbox[0]
        rest_bbox = font_mono.getbbox(rest)
        rest_w = rest_bbox[2] - rest_bbox[0]
        total_w = wm_w + rest_w

    # Position: right-aligned, baseline 30% of margin height above lower edge
    baseline_y = oh - int(0.30 * margin_bot * mm_to_px)
    text_x = ow - int(margin_left * mm_to_px * 0.5) - total_w  # right-aligned within board

    colour = (74, 74, 74, int(255 * 0.85))  # #4A4A4A at 85%
    draw.text((text_x, baseline_y - font_size), wordmark, font=font_sans, fill=colour)
    draw.text((text_x + wm_w, baseline_y - font_size), rest, font=font_mono, fill=colour)

    # ── top-left margin: coordinate axes ──
    arrow_len_mm = 0.03 * bh_mm  # 3% of board height
    arrow_len_px = arrow_len_mm * mm_to_px
    stroke_px = max(1, int(0.5 * mm_to_px))

    # Origin in upper-left margin
    ox = int(margin_left * mm_to_px * 0.35)
    oy = int(margin_top * mm_to_px * 0.35)

    # X arrow (red, pointing right)
    x_end = ox + int(arrow_len_px)
    draw.line([(ox, oy), (x_end, oy)], fill=(230, 0, 18, 220), width=stroke_px)
    # arrowhead
    ah = max(2, int(arrow_len_px * 0.2))
    draw.polygon([(x_end, oy), (x_end - ah, oy - ah), (x_end - ah, oy + ah)],
                 fill=(230, 0, 18, 220))
    # "X" label
    label_size = max(6, int(arrow_len_px * 0.6))
    label_font = load_font("mono", label_size)
    draw.text((x_end + 3, oy - label_size // 2), "X", font=label_font, fill=(230, 0, 18, 220))

    # Y arrow (green, pointing down)
    y_end = oy + int(arrow_len_px)
    draw.line([(ox, oy), (ox, y_end)], fill=(30, 158, 74, 220), width=stroke_px)
    draw.polygon([(ox, y_end), (ox - ah, y_end - ah), (ox + ah, y_end - ah)],
                 fill=(30, 158, 74, 220))
    draw.text((ox - label_size // 2, y_end + 3), "Y", font=label_font, fill=(30, 158, 74, 220))

    # ── family-set ID label (bold, upper-left margin) ──
    if id_label:
        id_h_mm = 0.02 * bh_mm  # 2% of board height
        id_h_px = id_h_mm * mm_to_px
        id_font_size = max(8, int(id_h_px))
        id_font = load_font("sans", id_font_size)
        id_x = ox + int(arrow_len_px * 1.5)
        id_y = oy
        draw.text((id_x, id_y), id_label, font=id_font, fill=(74, 74, 74, int(255 * 0.9)))

    # ── slight blur to sit in the print ──
    overlay = overlay.filter(ImageFilter.GaussianBlur(radius=0.3 * scale))

    return overlay


def grey_world_correct(img_bgr):
    """Grey-world colour correction on white board faces."""
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    _, mask = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY)

    if mask.sum() == 0:
        return img_bgr

    b_mean = img_bgr[:, :, 0][mask > 0].mean()
    g_mean = img_bgr[:, :, 1][mask > 0].mean()
    r_mean = img_bgr[:, :, 2][mask > 0].mean()
    spread = max(r_mean, g_mean, b_mean) - min(r_mean, g_mean, b_mean)

    if spread <= 6:
        return img_bgr

    target = (r_mean + g_mean + b_mean) / 3
    gains = [target / b_mean, target / g_mean, target / r_mean]

    corrected = img_bgr.astype(np.float32)
    for c in range(3):
        corrected[:, :, c] *= gains[c]
    corrected = np.clip(corrected, 0, 255).astype(np.uint8)
    return corrected


def warp_overlay_onto(img_bgr, overlay_rgba, corners):
    """Perspective-warp an RGBA overlay onto an image at the given quad corners."""
    oh, ow = overlay_rgba.shape[:2]
    src_pts = np.float32([[0, 0], [ow, 0], [ow, oh], [0, oh]])
    dst_pts = np.float32(corners)  # TL, TR, BR, BL
    M = cv2.getPerspectiveTransform(src_pts, dst_pts)

    h, w = img_bgr.shape[:2]
    warped = cv2.warpPerspective(overlay_rgba, M, (w, h),
                                  flags=cv2.INTER_LINEAR,
                                  borderMode=cv2.BORDER_CONSTANT,
                                  borderValue=(0, 0, 0, 0))

    # Alpha-composite
    alpha = warped[:, :, 3:4].astype(np.float32) / 255.0
    fg = warped[:, :, :3].astype(np.float32)
    bg = img_bgr.astype(np.float32)
    blended = fg * alpha + bg * (1 - alpha)
    return np.clip(blended, 0, 255).astype(np.uint8)


def cmd_overlay(args):
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    with open(JSON_PATH) as f:
        data = json.load(f)

    for fname, info in data.items():
        src_path = SRC_DIR / fname
        if not src_path.exists():
            print(f"  SKIP {fname} (source not found)")
            continue

        img = cv2.imread(str(src_path))
        print(f"  Processing {fname}...")

        is_family_set = fname == "family-set.png"

        for i, board in enumerate(info["boards"]):
            corners = board.get("corners")
            if corners is None:
                print(f"    Board {i} ({board['board_id']}): null corners, skipping")
                continue

            bid = board["board_id"]
            spec = BOARDS[bid]
            bw_mm, bh_mm = spec["board_mm"]

            # Compute board pixel size from detected quad
            tl, tr, br, bl = [np.array(c, dtype=np.float32) for c in corners]
            top_w = np.linalg.norm(tr - tl)
            bot_w = np.linalg.norm(br - bl)
            left_h = np.linalg.norm(bl - tl)
            right_h = np.linalg.norm(br - tr)
            board_px_w = int(round((top_w + bot_w) / 2))
            board_px_h = int(round((left_h + right_h) / 2))

            # Text override for family-set
            text_override = None
            id_label = None
            if is_family_set and i < len(FAMILY_SET_OVERRIDES):
                ov = FAMILY_SET_OVERRIDES[i]
                base_text = "CALIB.TOOLS   CT-CHA-P-300240-2518   ChArUco 7\u00d710 \u00b7 25/18 mm \u00b7 DICT_6X6_250 \u00b7 "
                text_override = f"{base_text}{ov['ids']}   {ov['sn']} \u00b7 Rev A"
                id_label = ov["id_label"]

            overlay = make_overlay(spec, board_px_w, board_px_h,
                                   text_override=text_override, id_label=id_label)

            # Convert PIL RGBA to numpy BGRA for OpenCV
            overlay_np = np.array(overlay)
            overlay_bgra = cv2.cvtColor(overlay_np, cv2.COLOR_RGBA2BGRA)

            img = warp_overlay_onto(img, overlay_bgra, corners)
            print(f"    Board {i} ({bid}): overlay applied")

        # Colour correction
        img = grey_world_correct(img)

        # Output WebP
        h, w = img.shape[:2]
        long_edge = max(w, h)
        if long_edge > 2500:
            scale = 2500 / long_edge
            img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)

        out_name = fname.replace(".png", ".webp")
        out_path = OUT_DIR / out_name
        cv2.imwrite(str(out_path), img, [cv2.IMWRITE_WEBP_QUALITY, 90])
        out_size = out_path.stat().st_size
        print(f"    → {out_path} ({out_size // 1024} KB)")

    # Also generate OG PNG at 1200×630
    og_webp = OUT_DIR / "og-default.webp"
    if og_webp.exists():
        og_img = cv2.imread(str(og_webp))
        og_resized = cv2.resize(og_img, (1200, 630), interpolation=cv2.INTER_AREA)
        og_out = REPO / "public/og/default.png"
        cv2.imwrite(str(og_out), og_resized)
        print(f"  OG → {og_out}")


# ── crop command ───────────────────────────────────────────────────────

def boards_bbox(img):
    """Return (x_min, y_min, x_max, y_max) bounding box of all white boards."""
    h, w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    all_pts = []
    for c in contours:
        if cv2.contourArea(c) > 0.02 * h * w:
            all_pts.extend(c.reshape(-1, 2).tolist())
    if not all_pts:
        return None
    pts = np.array(all_pts)
    return int(pts[:, 0].min()), int(pts[:, 1].min()), int(pts[:, 0].max()), int(pts[:, 1].max())


def cmd_crop(args):
    """Crop overlaid hero images tight around the boards."""
    # Load existing json to append crop boxes
    with open(JSON_PATH) as f:
        data = json.load(f)

    crops = {
        "hero-three-boards.webp": {
            "output": "hero-boards-tight.webp",
            "margins": {"left": 0.07, "right": 0.07, "top": 0.30, "bottom": 0.80},
        },
        "hero-three-boards-mobile.webp": {
            "output": "hero-boards-tight-mobile.webp",
            "margins": {"left": 0.06, "right": 0.06, "top": 0.10, "bottom": 0.30},
        },
    }

    for src_name, cfg in crops.items():
        src_path = OUT_DIR / src_name
        if not src_path.exists():
            print(f"  SKIP {src_name} (not found — run overlay first)")
            continue

        img = cv2.imread(str(src_path))
        h, w = img.shape[:2]
        bbox = boards_bbox(img)
        if not bbox:
            print(f"  SKIP {src_name} (no boards detected)")
            continue

        bx0, by0, bx1, by1 = bbox
        bw = bx1 - bx0
        bh = by1 - by0

        ml = int(bw * cfg["margins"]["left"])
        mr = int(bw * cfg["margins"]["right"])
        mt = int(bh * cfg["margins"]["top"])
        mb = int(bh * cfg["margins"]["bottom"])

        cx0 = max(0, bx0 - ml)
        cy0 = max(0, by0 - mt)
        cx1 = min(w, bx1 + mr)
        cy1 = min(h, by1 + mb)

        cropped = img[cy0:cy1, cx0:cx1]
        out_path = OUT_DIR / cfg["output"]
        cv2.imwrite(str(out_path), cropped, [cv2.IMWRITE_WEBP_QUALITY, 90])
        ch, cw = cropped.shape[:2]
        print(f"  {src_name} → {cfg['output']} ({cw}x{ch}, {out_path.stat().st_size // 1024} KB)")
        print(f"    boards bbox [{bx0},{by0}]-[{bx1},{by1}], crop [{cx0},{cy0}]-[{cx1},{cy1}]")

        # Record in json
        data.setdefault("crops", {})[cfg["output"]] = {
            "source": src_name,
            "boards_bbox": [bx0, by0, bx1, by1],
            "crop_box": [cx0, cy0, cx1, cy1],
            "output_dims": [cw, ch],
        }

    with open(JSON_PATH, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"  Crop data → {JSON_PATH}")


# ── main ───────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Brand overlay pipeline")
    parser.add_argument("command", choices=["detect", "overlay", "crop"])
    args = parser.parse_args()

    if args.command == "detect":
        cmd_detect(args)
    elif args.command == "overlay":
        cmd_overlay(args)
    elif args.command == "crop":
        cmd_crop(args)


if __name__ == "__main__":
    main()
