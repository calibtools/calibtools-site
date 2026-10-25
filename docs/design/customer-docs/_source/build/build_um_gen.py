"""CT-UM-GEN · General user manual (sample document).

Builds A4 and Letter PDFs plus A4 page previews in the document's dedicated output folder.
"""
import json
import sys

sys.path.insert(0, "/home/ubuntu/work/docs/system")
from ctdoc import *
import ctpattern as CP

S = json.load(open("/home/ubuntu/work/docs/system/sample.json"))
P, U, O = S["product"], S["unit"], S["order"]
OUT = "/home/ubuntu/work/docs/out/CT-UM-GEN/CT-UM-GEN"


# --------------------------------------------------------------------------- figures

def _inner_svg(svg):
    """Return the content of an SVG returned by ctpattern.board_svg()."""
    return svg.split(">", 1)[1].rsplit("</svg>", 1)[0]


def identification_figure():
    """Overview plus a readable labelled bottom-edge callout for the sample board."""
    board = CP.board_svg(
        P["W"], P["H"], P["rows"], P["cols"], P["sq"], P["marker"], P["mx"], P["my"],
        dict_name=P["dict"], start_id=P["start_id"], label=P["label_line"], label_w=P["pattern_w"],
        axes_spec=P["axes_spec"], origin=True, width_mm=76,
    )
    raw = CP.board_svg(
        P["W"], P["H"], P["rows"], P["cols"], P["sq"], P["marker"], P["mx"], P["my"],
        dict_name=P["dict"], start_id=P["start_id"], label=P["label_line"], label_w=P["pattern_w"],
        axes_spec=None, origin=False,
    )
    label = _inner_svg(raw)
    zoom = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 125 204 25" style="width:100%;height:17mm;display:block">
      <rect x="-2" y="125" width="204" height="25" fill="#F2F2F2"/>{label}
      <g font-family="Geist Mono" font-size="4.1" text-anchor="middle" fill="#000" stroke="#000" stroke-width="0.35">
        <line x1="26" y1="132.5" x2="26" y2="140"/><circle cx="26" cy="130" r="2.25" fill="#fff"/><text x="26" y="131.5" stroke="none">1</text>
        <line x1="64" y1="132.5" x2="64" y2="140"/><circle cx="64" cy="130" r="2.25" fill="#fff"/><text x="64" y="131.5" stroke="none">2</text>
        <line x1="117" y1="132.5" x2="117" y2="140"/><circle cx="117" cy="130" r="2.25" fill="#fff"/><text x="117" y="131.5" stroke="none">3</text>
        <line x1="173" y1="132.5" x2="173" y2="140"/><circle cx="173" cy="130" r="2.25" fill="#fff"/><text x="173" y="131.5" stroke="none">4</text>
      </g></svg>'''
    guide = table(
        [("Mark", "m"), ("Label field", "t"), ("Read / use", "t")],
        [
            ["1", "Wordmark", "CALIB.TOOLS identifies the maker."],
            ["2", "Part number", f'<span class="mono">{P["part"]}</span> identifies the target design.'],
            ["3", "Pattern summary", f'{P["family_name"]} {P["rows"]} × {P["cols"]} · {P["sq"]} / {P["marker"]} mm · <span class="mono">{P["dict"]}</span> · IDs {P["id_first"]}–{P["id_last"]}.'],
            ["4", "SN · Rev", f'<span class="mono">SN {U["sn"]} · Rev A</span> identifies this board and its marking revision.'],
        ],
        cls="dense", widths=["10%", "24%", "66%"],
    )
    return f'''<figure>
      <div style="display:grid;grid-template-columns:78mm 1fr;gap:7mm;align-items:start">
        <div>{board}<figcaption>Rendering · sample board with printed X/Y axes and origin.</figcaption></div>
        <div>
          <div class="tag" style="margin:0 0 1.1mm">Field guide</div>{guide}
          <div class="small muted" style="margin-top:1.6mm">Origin <span class="mono">(0, 0)</span> is the top-left outer corner of the pattern; X points right and Y points down in the OpenCV frame.</div>
        </div>
      </div>
      <div style="margin-top:2.2mm">{zoom}</div>
      <figcaption>Bottom-edge label detail · markers 1–4 correspond to the field guide above.</figcaption>
    </figure>'''


def capture_figure():
    """Compact pose coverage diagram: 3×3 image position grid plus distance and tilt coverage."""
    cells = []
    positions = [(0.27, 0.27), (0.50, 0.27), (0.73, 0.27),
                 (0.27, 0.50), (0.50, 0.50), (0.73, 0.50),
                 (0.27, 0.73), (0.50, 0.73), (0.73, 0.73)]
    for i, (cx, cy) in enumerate(positions):
        x = 15 + (i % 3) * 25
        y = 17 + (i // 3) * 18
        bx, by = x + 25 * cx - 4.2, y + 18 * cy - 2.7
        cells.append(f'''<rect x="{x}" y="{y}" width="25" height="18" fill="#fff" stroke="#B3B3B3" stroke-width="0.45"/>
          <rect x="{bx:.1f}" y="{by:.1f}" width="8.4" height="5.4" fill="none" stroke="#000" stroke-width="0.7"/>
          <circle cx="{x+12.5}" cy="{y+9}" r="0.65" fill="#B3B3B3"/>''')
    dist = []
    for i, (name, w) in enumerate((("Near", 17), ("Middle", 12), ("Far", 7))):
        y = 17 + i * 17
        dist.append(f'''<text x="105" y="{y+4}" font-family="Geist Mono" font-size="3.2" fill="#333">{name}</text>
          <rect x="127" y="{y+0.5}" width="34" height="11" fill="#fff" stroke="#B3B3B3" stroke-width="0.4"/>
          <rect x="{144-w/2:.1f}" y="{y+5.5-w*0.24:.1f}" width="{w}" height="{w*0.48:.1f}" fill="none" stroke="#000" stroke-width="0.65"/>''')
    return f'''<figure>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 178 76" style="width:100%;height:68mm;display:block">
        <rect x="0.3" y="0.3" width="177.4" height="75.4" fill="#F2F2F2" stroke="#B3B3B3" stroke-width="0.3"/>
        <text x="15" y="9" font-family="Geist Mono" font-size="3.2" fill="#666">IMAGE-PLANE COVERAGE · 3 × 3</text>
        <text x="15" y="70" font-family="Geist" font-size="3.1" fill="#333">Move the target through all nine positions; keep the full pattern in frame.</text>
        {''.join(cells)}
        <line x1="96" y1="8" x2="96" y2="68" stroke="#B3B3B3" stroke-width="0.45"/>
        <text x="105" y="9" font-family="Geist Mono" font-size="3.2" fill="#666">DISTANCE · 3 LEVELS</text>
        {''.join(dist)}
        <line x1="168" y1="8" x2="168" y2="68" stroke="#B3B3B3" stroke-width="0.45"/>
        <text x="173" y="14" font-family="Geist Mono" font-size="3.0" fill="#666" transform="rotate(90 173 14)">TILT AT EACH POSITION</text>
        <g fill="none" stroke="#000" stroke-width="0.65">
          <rect x="170.5" y="33" width="5" height="3.3"/><rect x="170.5" y="43" width="5" height="3.3" transform="rotate(-18 173 44.7)"/><rect x="170.5" y="53" width="5" height="3.3" transform="rotate(18 173 54.7)"/>
        </g>
        <g font-family="Geist Mono" font-size="2.5" fill="#333"><text x="170" y="40">front</text><text x="170" y="50">roll</text><text x="170" y="60">pitch</text></g>
      </svg>
      <figcaption>Coverage checklist · 9 image positions × near / middle / far distance × front / roll / pitch tilt.</figcaption>
    </figure>'''


# --------------------------------------------------------------------------- content blocks

def unpacking_table():
    return table(
        [("Check", "t"), ("Before first use", "t"), ("If not acceptable", "t")],
        [
            ["Board and edges", "Pattern face clean and dry; no chip, crack or deep scratch in the pattern area.", "Do not mount or capture; photograph the condition."],
            ["Label and axes", "Part number, SN, revision, X/Y arrows and origin are legible.", "Record the serial number and contact support."],
            ["Documents", "Match the inspection-report serial, when a report is supplied, to the board label.", "Keep the delivery packaging and request guidance."],
        ],
        cls="dense", widths=["20%", "46%", "34%"],
    )


def file_table():
    part = P["part"]
    return table(
        [("File", "m"), ("Use with", "t"), ("Use", "t")],
        [
            [f"{part}.opencv.json", "OpenCV", "Board geometry, dictionary and start ID for Python or C++."],
            [f"{part}.kalibr.yaml", "Kalibr", "Target definition for Kalibr workflows."],
            [f"{part}.ros2.yaml", "ROS 2", "Board settings for compatible ROS 2 calibration workflows."],
            [f"{part}.halcon.descr", "HALCON", "Target description for HALCON setup."],
            [f"{P['drawing']}.dxf", "CAD / fixture", "Outline and mounting reference; not a camera-calibration file."],
            [f"CT-CSV-{U['sn']}.csv", "Analysis", "Measured coordinates for the identified serial, when supplied."],
        ],
        cls="dense", widths=["34%", "20%", "46%"],
    )


def reinspection_table():
    return table(
        [("Environment", "t"), ("Suggested interval", "m"), ("Also request after", "t")],
        [
            ["Controlled indoor reference use", "24 months", "Impact, uncertain storage, visible change or a critical-use concern."],
            ["Regular indoor engineering use", "12 months", "Frequent handling, relocation or an unexplained image-quality change."],
            ["Production / frequent handling", "6 months", "A drop, clamp event, contamination, heat exposure or edge damage."],
        ],
        cls="dense", widths=["31%", "19%", "50%"],
    )


def troubleshooting_table():
    return table(
        [("Problem", "t"), ("Check in order", "t")],
        [
            ["No corners detected", "1. Select <span class=\"mono\">DICT_6X6_250</span> and the matching rows / columns. <br>2. Check focus, exposure and glare before changing detector thresholds. <br>3. For a historical even-row board only, apply the legacy-pattern setting described in section 6."],
            ["High reprojection error", "1. Complete the coverage diagram: edges, distances and tilt. <br>2. Remove blurred or clipped images; confirm square and marker units. <br>3. Keep one camera configuration and one target definition for the run."],
            ["Multi-board ID conflict", "1. Read the <span class=\"mono\">IDs</span> and <span class=\"mono\">start_id</span> on every board label. <br>2. Use start IDs <span class=\"mono\">0</span> and <span class=\"mono\">102</span> for the illustrated set. <br>3. Do not allocate beyond the 250 IDs in <span class=\"mono\">DICT_6X6_250</span>."],
            ["Glare on the board", "1. Use broad, diffuse illumination and move the light, not the board identity. <br>2. Tilt the light path away from the camera while keeping the target pose. <br>3. Clean fingerprints with the applicable family-care method; do not apply coatings to the pattern."],
        ],
        cls="dense", widths=["23%", "77%"],
    )


def build():
    d = Doc(
        "CT-UM-GEN", "A", "2026-11-01", eyebrow="User manual",
        title="Calibration targets · general user manual",
    )

    # Page 1
    p1 = (
        p("General handling, capture and setup guidance. Use this document with the applicable family manual and datasheet; serial-specific values belong to the inspection report.")
        + section(1, "About this manual & safety")
        + p("Use targets only as stable visual references. Handle the board with clean, dry hands on a clean padded surface; stop using it after a crack, chip in the pattern area or other visible change.")
        + note("<b>Before a critical run.</b> Confirm the part number, serial number, pattern definition and current camera configuration. This general manual does not replace the material- or mounting-specific family manual.", "Safe first use")
        + section(2, "Identification")
        + p("Read the board label before creating a target definition. The sample board below identifies every field.")
        + identification_figure()
        + p(f'For the illustrated serial, open <span class="mono">calib.tools/verify/{U["sn"]}</span> and enter <span class="mono">{U["sn"]}</span> to look up the associated inspection report and available records.', "small")
        + section(3, "Unpacking & first check")
        + unpacking_table()
        + note("Keep the original protective packaging until the first check is complete. For a concern, send the part number, serial number, photographs and the delivery reference to <span class=\"mono\">hello@calib.tools</span>.", "If something is wrong")
    )
    d.add_page(p1)

    # Page 2
    p2 = (
        section(4, "Handling & mounting")
        + p("Support the board over a clean, stable surface. Keep fingers, tape, clamps and fixture features outside the active pattern area; consult the applicable family manual before using any dedicated mounting method.")
        + table(
            [("Step", "m"), ("Do", "t"), ("Avoid", "t")],
            [
                ["1", "Lift with two hands and keep the printed face clear of contact.", "Sliding the face across a bench or fixture."],
                ["2", "Support the full board or the specified mounting reference.", "Point loading, twisting or clamping across the pattern."],
                ["3", "Recheck label visibility after installation.", "Obscuring the X/Y axes, origin or label line."],
            ], cls="dense", widths=["10%", "45%", "45%"],
        )
        + section(5, "Capturing images")
        + p("Capture a varied set, not repeated centre-on views. Keep the full pattern visible with a quiet border, then repeat the coverage whenever lens, focus, aperture or resolution changes.")
        + capture_figure()
        + f'''<div class="box small" style="display:grid;grid-template-columns:1fr 1fr;column-gap:5mm;row-gap:1.2mm;margin-top:1mm">
             <div>{checkbox(False, "No clipped highlights on white squares")}</div><div>{checkbox(False, "Black squares remain separated from noise")}</div>
             <div>{checkbox(False, "Focus holds at the image corners")}</div><div>{checkbox(False, "Motion blur is absent at the target edge")}</div>
           </div>'''
        + p('For a guided capture review, use <span class="mono">calib.tools/tools/capture</span>.', "small")
        + section(6, "Pattern files")
        + file_table()
        + note("<b>OpenCV 4.6 and later.</b> The ChArUco layout changed for even row counts. For an older even-row board, use <span class=\"mono\">setLegacyPattern(True)</span> in the matching board definition; do not apply it to the current illustrated layout.", "Layout compatibility")
        + p("Multi-board start-ID setup continues on the next page.", "small muted")
    )
    d.add_page(p2)

    # Page 3
    quick_code = '''import cv2

aruco = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_6X6_250)
board = cv2.aruco.CharucoBoard((17, 12), 0.010, 0.007, aruco)
    detector = cv2.aruco.CharucoDetector(board)
    charuco_corners, charuco_ids, marker_corners, marker_ids = detector.detectBoard(image)'''
    p3 = (
        section(6, "Pattern files", "continued")
        + p("For a multi-board set, set <span class=\"mono\">start_id</span> independently for every board; the value selects the first marker ID in its row-major sequence.", "small")
        + table(
            [("SN", "m"), ("start_id", "n"), ("Marker IDs", "m"), ("Definition", "t")],
            [["000311", "0", "0–101", "First board"], ["000312", "102", "102–203", "Second board"]],
            cls="dense", widths=["18%", "20%", "22%", "40%"],
        )
        + p("<span class=\"mono\">DICT_6X6_250</span> contains only 250 IDs; the illustrated 12 × 17 board uses 102 markers, so only two such boards fit without overlap.", "small")
        + section(7, "First calibration (OpenCV quick start)")
        + p("Use a board definition that matches its label: columns × rows, square and marker length in metres, dictionary and start ID. The example below is for the sample board with 10 / 7 mm geometry.")
        + code(quick_code)
        + p("Collect only frames with stable detection and broad coverage. Pass the accepted <span class=\"mono\">charuco_corners</span> and <span class=\"mono\">charuco_ids</span> from multiple images to your chosen OpenCV camera-calibration workflow.", "small")
        + note("The board is inspected; it is not a camera-calibration result. Record the lens, image size, software version and target serial alongside your camera results.", "Keep the record")
        + section(8, "Care & storage")
        + table(
            [("Do", "t"), ("Avoid", "t")],
            [
                ["Remove loose dust with a clean, dry, non-abrasive lint-free cloth.", "Abrasion, scraping or rubbing the pattern with a soiled cloth."],
                ["Store flat in its protective packaging, clean and dry, under the datasheet storage conditions.", "Loose storage under other parts, prolonged pressure or an unsupported edge."],
                ["Use the applicable family manual before any wet-cleaning method.", "Unspecified solvents, coatings or adhesive labels on the pattern."],
            ], cls="dense", widths=["50%", "50%"],
        )
        + section(9, "Re-inspection")
        + p("These are suggested planning intervals, not a statement of board condition. Shorten the interval when handling, environment or image-quality risk is higher.")
        + reinspection_table()
        + p("To request S1e re-inspection, email <span class=\"mono\">hello@calib.tools</span> with the part number, serial number, latest report reference, use environment and any incident or image-quality concern.", "small")
        + note("For transport, place the clean board in its original protective sleeve and rigid packaging, immobilise it against movement, protect all edges, keep the serial visible in the shipment record and do not tape over the pattern.", "Return packaging")
    )
    d.add_page(p3)

    # Page 4
    docs = table(
        [("Document", "m"), ("Use", "t"), ("Reference", "m")],
        [
            ["Datasheet", "Product geometry, material and environment limits.", f'{P["datasheet"]} · Rev {P["datasheet_rev"]}'],
            ["General manual", "This handling and setup guide.", "CT-UM-GEN · Rev A"],
            ["Family manual", "Material care and mounting details for the target family.", S["doc_numbers"]["CT-UM-family"]],
            ["Inspection report", "Serial-specific inspection record.", f'CT-IR-{U["sn"]}'],
            ["Measured coordinates", "Serial-specific measured-corner data, when supplied.", f'CT-CSV-{U["sn"]}.csv'],
            ["Application note", "Further application guidance, where supplied.", S["doc_numbers"]["CT-AN"]],
        ], cls="dense", widths=["22%", "48%", "30%"],
    )
    p4 = (
        section(10, "Inspection report & online verification")
        + p("The inspection report is linked to a physical serial number. Match its serial and part number to the board label, then retain the PDF with your camera-calibration record.")
        + kv([
            ("Worked example", f'<span class="mono">CT-IR-{U["sn"]}</span> for <span class="mono">SN {U["sn"]}</span>'),
            ("Online lookup", f'<span class="mono">calib.tools/verify/{U["sn"]}</span>'),
            ("Measured coordinates", f'<span class="mono">CT-CSV-{U["sn"]}.csv</span>, when supplied'),
        ], mono_keys=("Worked example", "Online lookup", "Measured coordinates"))
        + section(11, "Warranty, returns & support")
        + p("Warranty scope and return authorization are [Warranty terms — to be decided]. Ask support for current return instructions before sending a board.")
        + kv([
            ("Support", '<span class="mono">hello@calib.tools</span>'),
            ("Prepare", "Part number · serial number · report reference · description of use · clear photographs"),
            ("Return address", "Calib.Tools · Returns · [Street and number] · [Postcode] Munich, Germany"),
        ], mono_keys=("Support",))
        + section(12, "Documents & downloads")
        + p("Document availability depends on the ordered target and option. Use the file page below for the current general-manual package, then use the serial lookup for serial-specific records.")
        + docs
        + p('General-manual files: <span class="mono">calib.tools/files/CT-UM-GEN</span>', "small")
        + section(13, "Troubleshooting")
        + troubleshooting_table()
        + f'''<div class="push" style="display:flex;justify-content:space-between;align-items:flex-end;border-top:0.3mm solid #000;padding-top:3mm">
          <div style="max-width:120mm"><div class="tag" style="margin-bottom:1mm">Need the current manual package?</div>
          <p class="small" style="margin:0">Scan the QR code or use <span class="mono">calib.tools/files/CT-UM-GEN</span>. Keep this manual with the target definition used for your camera-calibration project.</p></div>
          {qr_block("https://calib.tools/files/CT-UM-GEN", 15)}
        </div>'''
    )
    d.add_page(p4)
    return d.render(OUT)


if __name__ == "__main__":
    build()
