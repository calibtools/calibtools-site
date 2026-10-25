"""CT-DS-CHA-C · Rev A · ChArUco calibration target · ceramic.

Builds the four-page A4 and Letter customer datasheet plus A4 previews.
"""
import json
import sys

sys.path.insert(0, "/home/ubuntu/work/docs/system")
from ctdoc import *
import ctpattern as CP

S = json.load(open("/home/ubuntu/work/docs/system/sample.json"))
P = S["product"]

OUT = "/home/ubuntu/work/docs/out/CT-DS/CT-DS-CHA-C"
FILE_URL = "https://calib.tools/files/CT-DS-CHA-C"
DXF_URL = "https://calib.tools/files/CT-DWG-CHA-C-200150.dxf"


def tag(text):
    return f'<div class="tag" style="margin-bottom:1.1mm">{text}</div>'


def product_rendering():
    # A family datasheet deliberately uses a per-unit SN placeholder in the rendering.
    label = ("CALIB.TOOLS   CT-CHA-C-200150-6X6   ChArUco 12×17 · 10/7 mm · "
             "DICT_6X6_250 · IDs 0–101   SN [per unit] · Rev A")
    board = CP.board_svg(200, 150, 12, 17, 10, 7, 15, 15,
                         dict_name="DICT_6X6_250", start_id=0,
                         label=label, label_w=170, axes_spec=(4.5, 4.5, 6.5, 0.6),
                         mode="print", width_mm=125)
    coord = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 38" width="43mm" height="27.2mm">
      <rect x="9" y="7" width="40" height="24" fill="#fff" stroke="#666" stroke-width="0.45"/>
      <rect x="13" y="11" width="32" height="16" fill="#f2f2f2" stroke="#b3b3b3" stroke-width="0.25" stroke-dasharray="1.1 1.1"/>
      <circle cx="13" cy="11" r="1" fill="#000"/>
      {CP.axes(13, 11, 12, 0.68)}
      <text x="9" y="35" font-family="Geist Mono" font-size="2.6" fill="#333">(0, 0) · pattern outer corner</text>
    </svg>'''
    key = """<div class=\"small\" style=\"line-height:1.43\"> 
      <div class=\"tag\" style=\"margin-bottom:1.2mm\">Coordinate system</div>
      %s
      <div style=\"margin-top:1mm\"><span class=\"mono\">X</span> right · <span class=\"mono\">Y</span> down<br>
      OpenCV pattern frame</div>
    </div>""" % coord
    return (f'<div style="display:grid;grid-template-columns:125mm 1fr;gap:6mm;align-items:start">'
            f'<figure>{board}<figcaption>Rendering · 200 × 150 mm variant</figcaption></figure>{key}</div>')


def ordering_table():
    cols = [
        ("Part number", "m"), ("Size W × H<br>(mm)", "n"), ("Squares<br>(r × c)", "n"),
        ("Square / marker<br>(mm)", "n"), ("Dictionary options", "t"),
        ("Corners", "n"), ("Markers", "n"), ("Weight<br>(kg)", "n"),
    ]
    rows = [
        ["CT-CHA-C-100075-6X6", "100 × 75", "9 × 14", "5 / 3.5", "<span class=\"mono\">DICT_6X6_250</span>,<br><span class=\"mono\">DICT_6X6_1000</span>", "104", "63", "0.12"],
        ["CT-CHA-C-150100-6X6", "150 × 100", "7 × 12", "10 / 7", "<span class=\"mono\">DICT_6X6_250</span>,<br><span class=\"mono\">DICT_6X6_1000</span>", "66", "42", "0.23"],
        ["CT-CHA-C-200150-6X6", "200 × 150", "12 × 17", "10 / 7", "<span class=\"mono\">DICT_6X6_250</span>,<br><span class=\"mono\">DICT_6X6_1000</span>", "176", "102", "0.47"],
        ["CT-CHA-C-300200-6X6", "300 × 200", "17 × 27", "10 / 7", "<span class=\"mono\">DICT_6X6_250</span>,<br><span class=\"mono\">DICT_6X6_1000</span>", "416", "229", "0.94"],
    ]
    return table(cols, rows, cls="dense rawhead", widths=["23%", "11%", "9%", "12%", "19%", "8%", "8%", "10%"])


def key_specs():
    cells = [
        ("Accuracy", "±2 µm", "feature position · 20 °C"),
        ("Substrate", "Technical ceramic", "4.0 mm"),
        ("Sizes", "100 × 75 to 300 × 200 mm", ""),
        ("Flatness", "≤ 20 µm", "200 × 150 mm"),
    ]
    parts = []
    for lab, val, sub in cells:
        parts.append(f'''<div style="padding:1.9mm 2.5mm;min-height:16mm">
          <div class="tag" style="margin-bottom:.45mm">{lab}</div>
          <div class="mono black" style="font-size:9.2pt;line-height:1.25">{val}</div>
          <div class="small muted" style="line-height:1.22">{sub}</div></div>''')
    return (f'<div style="border-top:.35mm solid #000;border-bottom:.25mm solid #b3b3b3;display:grid;'
            f'grid-template-columns:1fr 1.23fr 1.42fr 1fr">{"".join(parts)}</div>')


def specification_tables():
    geo_cols = [("Feature", "t"), ("Specification", "t"), ("Condition / note", "t")]
    geo_rows = [
        ["Feature position accuracy", "<span class=\"mono\">±2 µm</span>", "At 20 °C; ChArUco corner positions."],
        ["Edge definition", "Sharp black / white transition", "≤ 20 µm nominal 10–90 % transition width."],
        ["Orthogonality", "<span class=\"mono\">90° ± 0.002°</span>", "Pattern axes."],
        ["Start ID / placement", "<span class=\"mono\">0</span> · row-major", "Black square top-left; marker IDs advance through white squares."],
        ["OpenCV pattern convention", "OpenCV <span class=\"mono\">≥ 4.6</span> layout", "12 rows (even). Older-board layouts require <span class=\"mono\">CharucoBoard.setLegacyPattern(True)</span>."],
    ]
    phy_cols = [("Feature", "t"), ("Specification", "t")]
    phy_rows = [
        ["Substrate", "Technical ceramic (alumina-based)."],
        ["Pattern process", "Fired mineral-pigment screen print; matte black / white pattern."],
        ["Thickness", "<span class=\"mono\">4.0 mm</span> nominal."],
        ["Flatness", "<span class=\"mono\">≤ 20 µm</span> · 200 × 150 mm variant."],
        ["Surface", "<span class=\"mono\">Ra ≤ 0.8 µm</span> nominal; non-glare finish."],
        ["Edges", "<span class=\"mono\">0.5 × 45°</span> chamfer on all edges."],
        ["Weight", "<span class=\"mono\">0.12–0.94 kg</span>, by size; 200 × 150 mm: <span class=\"mono\">0.47 kg</span>."],
        ["Mounting", "No holes. Optional fixture supports the target at the perimeter."],
    ]
    env_cols = [("Feature", "t"), ("Specification", "t")]
    env_rows = [
        ["Operating temperature", "<span class=\"mono\">5–40 °C</span>; allow target and camera to stabilise."],
        ["Storage temperature", "<span class=\"mono\">−20–60 °C</span>; store clean, dry and protected."],
        ["Thermal expansion", "Approx. <span class=\"mono\">7 ppm/K</span> (alumina); use at stated reference temperature for accuracy."],
        ["Humidity", "<span class=\"mono\">10–85 % RH</span>, non-condensing."],
        ["Chemical resistance", "Resists water and 70 % IPA at ambient conditions; avoid acids, alkalis and abrasives."],
        ["UV / outdoor life", "Indoor use. No outdoor service-life rating is specified."],
        ["Cleaning", "Clean with a lint-free cloth; use deionised water or 70 % IPA. Do not scour."],
    ]
    geometry = section(1, "Specifications · geometry") + table(geo_cols, geo_rows, widths=["25%", "24%", "51%"])
    physical = section(2, "Specifications · physical") + table(phy_cols, phy_rows, widths=["28%", "72%"])
    environment = section(3, "Specifications · environment") + table(env_cols, env_rows, widths=["28%", "72%"])
    return geometry + physical + environment


def geometry_reference():
    board = CP.board_svg(200, 150, 12, 17, 10, 7, 15, 15,
                         dict_name="DICT_6X6_250", start_id=0, axes_spec=None,
                         mode="map", width_mm=62, origin=True)
    details = kv([
        ("Reference pattern", "<span class=\"mono\">12 × 17</span> squares · <span class=\"mono\">10 / 7 mm</span>."),
        ("Marker IDs", "<span class=\"mono\">0–101</span>, row-major through white squares."),
        ("Coordinate frame", "Origin at the top-left outer pattern corner; X right, Y down."),
        ("Version control", "Current <span class=\"mono\">≥ 4.6</span> convention for an even-row board; no legacy pattern setting."),
    ])
    return (f'<div class="box" style="padding:2mm 3mm;margin:.8mm 0 .8mm">'
            f'<div style="display:grid;grid-template-columns:66mm 1fr;gap:6mm;align-items:center">'
            f'<figure>{board}<figcaption>Geometry reference · pattern envelope shown.</figcaption></figure>'
            f'<div>{tag("Pattern convention")}{details}</div></div></div>')


def deliverables_box():
    left = ('<div>' + tag("In the box") + kv([
        ("Board", "ChArUco ceramic target, selected part number."),
        ("Packaging", "Protective carton and handling information."),
        ("Report", "Inspection report and measured CSV for each serialised unit."),
        ("Files", "<span class=\"mono\">.opencv.json · .kalibr.yaml · .ros2.yaml<br>.halcon.descr · .dxf · measured CSV</span>"),
    ]) + '</div>')
    right = ('<div>' + tag("Configuration & service") + kv([
        ("Marking on board", "Label line with part / pattern / SN / Rev; printed X / Y arrows."),
        ("Lead time", "[Lead time — to be decided]"),
        ("Options", "Fixture · <span class=\"mono\">SVC-X-CERT-ILAC</span> · custom NRE."),
    ]) + '</div>')
    return f'<div class="box"><div class="cols" style="grid-template-columns:1fr 1fr">{left}{right}</div></div>'


def compatibility_table():
    cols = [("Software", "t"), ("Use / caution", "t")]
    rows = [
        ["OpenCV", "ChArUco board with <span class=\"mono\">DICT_6X6_250</span>; this 12-row board follows the OpenCV <span class=\"mono\">≥ 4.6</span> convention. Do not enable legacy pattern for this board."],
        ["Kalibr", "No native ChArUco target model. The supplied <span class=\"mono\">.kalibr.yaml</span> is a geometry reference and needs integration-specific adaptation."],
        ["HALCON", "Use the supplied descriptor as setup data for the applicable calibration workflow; confirm operator and release compatibility before deployment."],
        ["MATLAB", "Intended for the Computer Vision Toolbox ChArUco workflow (R2024a or later—confirm release support before use)."],
        ["ROS 2", "Use a <span class=\"mono\">charuco</span> pattern configuration where supported by the selected <span class=\"mono\">camera_calibration</span> package; confirm package parameters first."],
    ]
    return table(cols, rows, widths=["18%", "82%"])


def drawing_svg():
    # Top plan with dimensions generated by the shared CP dimension primitives.
    dims = "".join([
        CP.dim_h(0, 200, 173, "W 200 mm", ext_from=150, fs=4.0),
        CP.dim_v(-20, 0, 150, "H 150 mm", ext_from=0, fs=4.0),
        CP.dim_h(15, 185, -12, "pattern 170 mm", ext_from=0, fs=3.4),
        CP.dim_v(216, 15, 135, "pattern 120 mm", ext_from=200, fs=3.4),
        CP.dim_h(0, 15, -27, "15", ext_from=0, fs=3.0),
        CP.dim_v(232, 0, 15, "15", ext_from=200, fs=3.0),
        CP.dim_v(270, 77, 81, "t 4.0 mm", ext_from=252, fs=3.4),
    ])
    return f'''<figure style="margin:0">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="-37 -37 322 228" width="137mm" height="97mm">
        <rect x="0" y="0" width="200" height="150" fill="#fff" stroke="#000" stroke-width="0.55"/>
        <rect x="15" y="15" width="170" height="120" fill="#f2f2f2" stroke="#666" stroke-width="0.35" stroke-dasharray="2 1.3"/>
        <path d="M0 5L5 0 M195 0L200 5 M0 145L5 150 M195 150L200 145" stroke="#333" stroke-width="0.5" fill="none"/>
        <line x1="194" y1="7" x2="248" y2="-9" stroke="#666" stroke-width="0.25"/>
        <text x="250" y="-10" font-family="Geist Mono" font-size="3.4" fill="#333">0.5 × 45° chamfer</text>
        <text x="100" y="78" font-family="Geist Mono" font-size="4.6" fill="#666" text-anchor="middle">PATTERN AREA</text>
        <text x="100" y="85" font-family="Geist Mono" font-size="3.6" fill="#666" text-anchor="middle">170 × 120 mm</text>
        <text x="100" y="145.5" font-family="Geist Mono" font-size="3.3" fill="#666" text-anchor="middle">15 mm white margin</text>
        <text x="218" y="68" font-family="Geist Mono" font-size="3.3" fill="#666">SIDE SECTION</text>
        <rect x="220" y="77" width="32" height="4" fill="#f2f2f2" stroke="#000" stroke-width="0.35"/>
        <text x="236" y="89" font-family="Geist Mono" font-size="3.3" fill="#666" text-anchor="middle">no mounting holes</text>
        {dims}
      </svg>
      <figcaption>CT-DWG-CHA-C-200150 · Rev A · dimensions nominal unless stated.</figcaption>
    </figure>'''


def compliance_table():
    cols = [("Topic", "t"), ("Statement", "t")]
    rows = [
        ["RoHS", "Materials statement: passive ceramic plate; applicability of Directive 2011/65/EU is to be confirmed."],
        ["REACH", "[Candidate-list / material statement — to be confirmed for the current supply chain]."],
        ["HS code", "<span class=\"mono\">9031 80</span>"],
        ["Country of origin", "[per facts - to be decided]"],
        ["Packaging", "Protective carton, foam interleaf and clean sleeve; packaging configuration to be confirmed."],
        ["Handling", "FRAGILE · handle by edges; protect the patterned surface from impact and abrasion."],
    ]
    return table(cols, rows, widths=["22%", "78%"])


def revision_table():
    cols = [("Rev", "m"), ("Date", "m"), ("Change", "t")]
    return table(cols, [["A", "2026-11-01", "Initial issue."]], widths=["13%", "23%", "64%"])


def build():
    d = Doc("CT-DS-CHA-C", "A", "2026-11-01", eyebrow="Datasheet",
            title="ChArUco calibration target · ceramic", sn=None)

    page1 = (
        p("A rigid technical-ceramic ChArUco target for precise camera calibration where dimensional stability, sharp features and durable handling matter.")
        + product_rendering()
        + section(1, "Ordering", "PRINT VERSION · prices online")
        + ordering_table()
        + p("All variants: 15 mm white margin · marker side 0.7 × square side · technical ceramic, 4.0 mm · density 3.9 g/cm³.", "small")
        + p('<span class="mono">Prices:</span> calib.tools/targets', "small muted")
        + section(2, "Key specifications")
        + key_specs()
    )
    d.add_page(page1)

    page2 = (
        p("Unless stated otherwise, dimensions are nominal at <span class=\"mono\">20 °C</span>. Specifications apply to the product family; per-unit results are issued in the inspection report.", "small")
        + section(1, "Specifications · geometry")
        + table([
            ("Feature", "t"), ("Specification", "t"), ("Condition / note", "t")
        ], [
            ["Feature position accuracy", "<span class=\"mono\">±2 µm</span>", "At 20 °C; ChArUco corner positions."],
            ["Edge definition", "Sharp black / white transition", "≤ 20 µm nominal 10–90 % transition width."],
            ["Orthogonality", "<span class=\"mono\">90° ± 0.002°</span>", "Pattern axes."],
            ["Start ID / placement", "<span class=\"mono\">0</span> · row-major", "Black square top-left; marker IDs advance through white squares."],
            ["OpenCV pattern convention", "OpenCV <span class=\"mono\">≥ 4.6</span> layout", "12 rows (even). Older-board layouts require <span class=\"mono\">CharucoBoard.setLegacyPattern(True)</span>."],
        ], widths=["25%", "24%", "51%"])
        + geometry_reference()
        + section(2, "Specifications · physical")
        + table([
            ("Feature", "t"), ("Specification", "t")
        ], [
            ["Substrate", "Technical ceramic (alumina-based)."],
            ["Pattern process", "Fired mineral-pigment screen print; matte black / white pattern."],
            ["Thickness", "<span class=\"mono\">4.0 mm</span> nominal."],
            ["Flatness", "<span class=\"mono\">≤ 20 µm</span> · 200 × 150 mm variant."],
            ["Surface", "<span class=\"mono\">Ra ≤ 0.8 µm</span> nominal; non-glare finish."],
            ["Edges", "<span class=\"mono\">0.5 × 45°</span> chamfer on all edges."],
            ["Weight", "<span class=\"mono\">0.12–0.94 kg</span>, by size; 200 × 150 mm: <span class=\"mono\">0.47 kg</span>."],
            ["Mounting", "No holes. Optional fixture supports the target at the perimeter."],
        ], widths=["28%", "72%"])
        + section(3, "Specifications · environment")
        + table([
            ("Feature", "t"), ("Specification", "t")
        ], [
            ["Operating temperature", "<span class=\"mono\">5–40 °C</span>; allow target and camera to stabilise."],
            ["Storage temperature", "<span class=\"mono\">−20–60 °C</span>; store clean, dry and protected."],
            ["Thermal expansion", "Approx. <span class=\"mono\">7 ppm/K</span> (alumina); use at stated reference temperature for accuracy."],
            ["Humidity", "<span class=\"mono\">10–85 % RH</span>, non-condensing."],
            ["Chemical resistance", "Resists water and 70 % IPA at ambient conditions; avoid acids, alkalis and abrasives."],
            ["UV / outdoor life", "Indoor use. No outdoor service-life rating is specified."],
            ["Cleaning", "Clean with a lint-free cloth; use deionised water or 70 % IPA. Do not scour."],
        ], widths=["28%", "72%"])
    )
    d.add_page(page2)

    page3 = (
        section(3, "Deliverables")
        + deliverables_box()
        + section(4, "Compatibility")
        + compatibility_table()
        + section(5, "Drawing", "200 × 150 mm reference variant")
        + f'<div style="display:grid;grid-template-columns:140mm 1fr;gap:7mm;align-items:end">{drawing_svg()}'
          f'<div class="small" style="padding-bottom:5mm"><div class="tag" style="margin-bottom:1mm">DXF download</div>'
          f'<div class="mono black" style="font-size:7.5pt;overflow-wrap:anywhere">{DXF_URL.replace("https://", "")}</div>'
          f'<div class="muted" style="margin-top:1.5mm">Drawing reference only; use the released DXF for fixture design.</div></div></div>'
    )
    d.add_page(page3)

    disclaimer = "Values are nominal unless stated as measured; per-unit values are in the inspection report CT-IR-&lt;SN&gt;."
    page4 = (
        section(6, "Compliance & customs")
        + compliance_table()
        + section(7, "Revision history")
        + revision_table()
        + section(8, "Disclaimer")
        + p(disclaimer, "statement")
        + f'<div class="push" style="display:flex;justify-content:space-between;align-items:flex-end;border-top:.25mm solid #b3b3b3;padding-top:4mm">'
          f'<div class="small muted" style="max-width:94mm">Product configuration, lead time and regulatory statements remain subject to the confirmations identified in this datasheet.</div>'
          f'{qr_block(FILE_URL, 15)}</div>'
    )
    d.add_page(page4)

    return d.render(OUT)


if __name__ == "__main__":
    build()
