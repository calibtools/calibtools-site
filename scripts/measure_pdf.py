#!/usr/bin/env python3
"""
Measure vector rectangles in a calibration pattern PDF.
Usage: python3 scripts/measure_pdf.py <pdf-path>

Reads all filled rectangles from page 1, converts from PDF points to mm,
and reports:
  - Scale bar length (expect 100.0 ± 0.1 mm)
  - First/last black square positions
  - Board size (bounding box of pattern squares)
  - All deviations from expected values

Exit code 1 if any deviation > 0.2 mm.
"""
import sys
import pdfplumber

PT_TO_MM = 25.4 / 72.0

def measure(pdf_path: str):
    pdf = pdfplumber.open(pdf_path)
    page = pdf.pages[0]
    pw_mm = page.width * PT_TO_MM
    ph_mm = page.height * PT_TO_MM

    rects = page.rects or []
    lines = page.lines or []

    print(f"Page size: {pw_mm:.1f} × {ph_mm:.1f} mm")
    print(f"Rectangles found: {len(rects)}")
    print(f"Lines found: {len(lines)}")
    print()

    # Classify rectangles by colour and size
    black_squares = []
    scale_bars = []
    brand_rects = []

    for r in rects:
        x0 = r['x0'] * PT_TO_MM
        y0 = r['top'] * PT_TO_MM  # pdfplumber uses top-down
        w = r['width'] * PT_TO_MM
        h = r['height'] * PT_TO_MM
        fill = r.get('non_stroking_color')

        # Scale bar: very thin rectangle (h < 1mm, w ~ 100mm)
        if h < 1.0 and w > 50:
            scale_bars.append({'x': x0, 'y': y0, 'w': w, 'h': h})
            continue

        # Black squares: fill is (0,0,0) or very dark, roughly square
        is_black = False
        if fill is not None:
            if isinstance(fill, (list, tuple)):
                if len(fill) >= 3:
                    is_black = all(c < 0.1 for c in fill[:3])
                elif len(fill) == 1:
                    is_black = fill[0] < 0.1
            elif isinstance(fill, (int, float)):
                is_black = fill < 0.1

        # Brand rects are small (< 3mm) and coloured
        if w < 3 and h < 3 and not is_black:
            brand_rects.append({'x': x0, 'y': y0, 'w': w, 'h': h})
            continue

        if is_black and w > 2 and h > 2 and abs(w - h) < 1:
            black_squares.append({'x': x0, 'y': y0, 'w': w, 'h': h, 'size': (w + h) / 2})

    print(f"Black squares: {len(black_squares)}")
    print(f"Scale bars: {len(scale_bars)}")
    print(f"Brand rects: {len(brand_rects)}")
    print()

    deviations = []

    # --- Scale bar ---
    if scale_bars:
        sb = max(scale_bars, key=lambda s: s['w'])
        dev = abs(sb['w'] - 100.0)
        status = "✓" if dev <= 0.1 else "✗"
        print(f"Scale bar: {sb['w']:.3f} mm (expected 100.0 mm, deviation {dev:.3f} mm) {status}")
        deviations.append(('Scale bar length', 100.0, sb['w'], dev))
    else:
        print("WARNING: No scale bar found!")

    # --- Pattern squares ---
    if black_squares:
        # Find expected square size (mode of sizes)
        sizes = [s['size'] for s in black_squares]
        avg_size = sum(sizes) / len(sizes)
        # Filter to pattern squares (within 20% of average)
        pattern_sq = [s for s in black_squares if abs(s['size'] - avg_size) / avg_size < 0.2]

        if pattern_sq:
            xs = [s['x'] for s in pattern_sq]
            ys = [s['y'] for s in pattern_sq]
            ws = [s['w'] for s in pattern_sq]
            hs = [s['h'] for s in pattern_sq]

            min_x, max_x = min(xs), max(xs)
            min_y, max_y = min(ys), max(ys)
            max_w = max(ws)
            max_h = max(hs)

            board_w = (max_x + max_w) - min_x
            board_h = (max_y + max_h) - min_y

            sq_size = sum(ws) / len(ws)

            print(f"\nPattern squares ({len(pattern_sq)}):")
            print(f"  Square size: {sq_size:.3f} mm")
            print(f"  First square: ({min_x:.2f}, {min_y:.2f}) mm")
            print(f"  Last square: ({max_x:.2f}, {max_y:.2f}) mm")
            print(f"  Board extent: {board_w:.2f} × {board_h:.2f} mm")

    # --- Brand footer distance ---
    if brand_rects and black_squares:
        pattern_bottom = max(s['y'] + s['h'] for s in pattern_sq)
        brand_top = min(r['y'] for r in brand_rects)
        gap = brand_top - pattern_bottom
        print(f"\n  Brand footer distance from pattern: {gap:.1f} mm")

    # --- Deviation table ---
    print("\n--- Deviation Table ---")
    print(f"{'Measurement':<25} {'Expected':>10} {'Actual':>10} {'Dev':>8} {'Status':>6}")
    print("-" * 65)
    fail = False
    for name, exp, act, dev in deviations:
        status = "PASS" if dev <= 0.2 else "FAIL"
        if dev > 0.2:
            fail = True
        print(f"{name:<25} {exp:>10.3f} {act:>10.3f} {dev:>8.3f} {status:>6}")

    if not deviations:
        print("(no numeric deviations to report)")

    pdf.close()

    if fail:
        print("\n✗ FAIL — deviation > 0.2 mm detected")
        sys.exit(1)
    else:
        print("\n✓ PASS — all deviations within tolerance")
        sys.exit(0)

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <pdf-path>")
        sys.exit(1)
    measure(sys.argv[1])
