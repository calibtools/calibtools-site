"""CT-RI · Re-inspection report (2 pages).

Builds the RI sample for SN 000311 and its accompanying coordinate attachment.
The re-inspection coordinate offsets are deterministic (seed 31101) so the report,
CSV and feature-map drift vectors remain reproducible.
"""
import csv
import json
import math
import os
import random
import sys

sys.path.insert(0, "/home/ubuntu/work/docs/system")
# The CT-IR identity block is deliberately reused to keep the family metadata identical.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ctdoc import *
import ctpattern as CP
from build_ir import ident_block as ir_ident_block

S = json.load(open("/home/ubuntu/work/docs/system/sample.json"))
PREVIOUS_COORDS = json.load(open("/home/ubuntu/work/docs/system/sample_coords.json"))
P, U = S["product"], S["unit"]

DOC_NO = "CT-RI-000311-01"
REV = "A"
RI_DATE = "2027-11-10"
RI_INSPECTOR = "JG"
CSV_NO = "CT-CSV-000311-RI01"
CSV_FILE = CSV_NO + ".csv"
OUT_DIR = "/home/ubuntu/work/docs/out/CT-RI"
OUT_BASE = os.path.join(OUT_DIR, DOC_NO)

# Assumed current instrument status for the sample re-inspection; see task return.
INSTRUMENT_CAL = "2027-08"
INSTRUMENT_VALID = "2028-08"
INSTRUMENT_CERT = "OCMM-01 · certificate K-2027-08-0276 · valid to 2028-08"
REFERENCE_CERT = "Glass scale GS-01 (200 mm) · certificate K-2027-07-0198 · valid to 2028-07"


def make_reinspection_coords():
    """Return new measurements and new-minus-previous drift vectors in µm."""
    rng = random.Random(31101)
    new_rows, vectors = [], {}
    for old in PREVIOUS_COORDS:
        # Small deterministic dimensional change/read-out variation: ±0.3 µm/component.
        drift_x = round(rng.uniform(-0.35, 0.35), 1)
        drift_y = round(rng.uniform(-0.35, 0.35), 1)
        dx = round(old["dx_um"] + drift_x, 1)
        dy = round(old["dy_um"] + drift_y, 1)
        new = dict(old)
        new.update({
            "x_meas": round(old["x_nom"] + dx / 1000.0, 4),
            "y_meas": round(old["y_nom"] + dy / 1000.0, 4),
            "dx_um": dx,
            "dy_um": dy,
            "drift_x_um": drift_x,
            "drift_y_um": drift_y,
        })
        new_rows.append(new)
        vectors[old["id"]] = (drift_x, drift_y)
    return new_rows, vectors


COORDS, DRIFT_VECTORS = make_reinspection_coords()
DRIFT_MAX = max(COORDS, key=lambda r: math.hypot(r["drift_x_um"], r["drift_y_um"]))
DRIFT_MAX_MAG = math.hypot(DRIFT_MAX["drift_x_um"], DRIFT_MAX["drift_y_um"])


def write_coordinate_csv():
    """Write the RI coordinate attachment in the established CT-CSV format."""
    os.makedirs(OUT_DIR, exist_ok=True)
    path = os.path.join(OUT_DIR, CSV_FILE)
    with open(path, "w", newline="", encoding="utf-8") as f:
        f.write(f"# Calib.Tools measured coordinates · {CSV_NO} · part {P['part']} · ref 20 °C · unit mm\n")
        f.write(f"# instrument: optical CMM OCMM-01 · U(k=2): 0.0015 mm · generated {RI_DATE}\n")
        f.write("# frame: OpenCV · origin = top-left outer corner of the pattern · X right · Y down · 176 ChArUco corners\n")
        writer = csv.writer(f, lineterminator="\n")
        writer.writerow(["id", "row", "col", "x_nom", "y_nom", "x_meas", "y_meas", "dx_um", "dy_um"])
        for r in COORDS:
            writer.writerow([
                r["id"], r["row"], r["col"],
                f"{r['x_nom']:.3f}", f"{r['y_nom']:.3f}",
                f"{r['x_meas']:.4f}", f"{r['y_meas']:.4f}",
                f"{r['dx_um']:.1f}", f"{r['dy_um']:.1f}",
            ])
    return path


def reinspection_block():
    return kv([
        ("Re-inspection date", RI_DATE),
        ("Inspector", RI_INSPECTOR),
        ("Location", esc(S["inspection"]["location"])),
        ("Instrument", "Optical CMM · <span class=\"mono\">OCMM-01</span>"),
        ("Last calibration", f"{INSTRUMENT_CAL} · valid to {INSTRUMENT_VALID}"),
        ("Temperature", "20.2 °C ambient · 20 °C reference"),
    ], mono_keys=("Re-inspection date", "Inspector", "Last calibration", "Temperature"))


def geometry_table():
    # Previous values reproduce the 2026 CT-IR sample data; current values are plausible RI values.
    rows = [
        ["Square pitch X", "10.000", "10.0012", "10.0013", "+0.1", "+1.3", "±2", "PASS"],
        ["Square pitch Y", "10.000", "9.9992", "9.9993", "+0.1", "−0.7", "±2", "PASS"],
        ["Pattern width", "170.000", "170.0040", "170.0042", "+0.2", "+4.2", "±5", "PASS"],
        ["Pattern height", "120.000", "120.0030", "120.0028", "−0.2", "+2.8", "±5", "PASS"],
        ["Diagonal 1", "208.087", "208.0910", "208.0911", "+0.1", "+4.1", "±7", "PASS"],
        ["Diagonal 2", "208.087", "208.0850", "208.0849", "−0.1", "−2.1", "±7", "PASS"],
        ["Orthogonality", "90.000°", "90.0008°", "90.0007°", "—", "—", "±0.002°", "PASS"],
        ["Max single-feature deviation", "—", "—", "—", "—", "1.5", "≤ 2", "PASS"],
        ["RMS deviation <span class=\"muted small\">· information only</span>", "—", "—", "—", "—", "0.6", "—", "PASS"],
    ]
    cols = [
        ("Feature", "t"), ("Nominal<br>(mm)", "n"), ("Previous<br>(mm)", "n"),
        ("Measured<br>(mm)", "n"), ("Drift<br>(µm)", "n"), ("Deviation<br>(µm)", "n"),
        ("Tolerance<br>(µm)", "n"), ("Result", "s"),
    ]
    return table(cols, rows, cls="ri-geometry rawhead", widths=["29%", "10%", "12%", "12%", "9%", "10%", "10%", "8%"])


def flatness_table():
    f = S["flatness"]
    cols = [("Measured flatness (µm)", "n"), ("Tolerance (µm)", "n"), ("Method", "t"), ("Result", "s")]
    return table(cols, [["13", f["tol"], esc(f["method"]), "PASS"]], widths=["24%", "17%", "47%", "12%"])


def visual_table():
    cols = [("Check", "t"), ("Criterion", "t"), ("Result", "s")]
    rows = [[esc(v["check"]), esc(v["criterion"]), "PASS"] for v in S["visual"]]
    return table(cols, rows, cls="dense", widths=["29%", "56%", "15%"])


def condition_table():
    cols = [("Check", "t"), ("Observation", "t")]
    rows = [
        ["Appearance", "No visible chips, scratches or contamination observed."],
        ["Packaging", "Protective foam case intact on receipt."],
        ["Customer remarks", "[No customer remarks provided]"],
    ]
    return table(cols, rows, cls="dense", widths=["32%", "68%"])


def feature_map():
    svg = CP.board_svg(
        P["W"], P["H"], P["rows"], P["cols"], P["sq"], P["marker"], P["mx"], P["my"],
        label=P["label_line"], label_w=170, axes_spec=P["axes_spec"], mode="map", width_mm=104,
        corners=True, corner_ids=True, vectors=DRIFT_VECTORS, vec_scale=3000, highlight=[DRIFT_MAX["id"]], origin=True,
    )
    legend = f'''<div class="small" style="line-height:1.45">
<div class="tag" style="margin-bottom:1.4mm">Legend</div>
<svg width="34mm" height="13mm" viewBox="0 0 34 13">{CP.axes(2, 2, 9, 0.75, labels=False)}
<text x="13" y="3.1" font-family="Geist Mono" font-size="2.6" fill="#000">X → right</text>
<text x="4.6" y="11.6" font-family="Geist Mono" font-size="2.6" fill="#000">Y ↓ down</text></svg>
<div style="margin:1.05mm 0"><svg width="3.4mm" height="3.4mm" viewBox="0 0 3.4 3.4" style="vertical-align:-0.7mm"><circle cx="1.7" cy="1.7" r="1.3" fill="#fff" stroke="#000" stroke-width="0.35"/><circle cx="1.7" cy="1.7" r="0.45"/></svg>
 Origin <span class="mono">(0, 0)</span>: top-left outer corner of the pattern (OpenCV frame)</div>
<div style="margin:1.05mm 0"><svg width="3.4mm" height="3.4mm" viewBox="0 0 3.4 3.4" style="vertical-align:-0.7mm"><circle cx="1.7" cy="1.7" r="0.42"/></svg>
 Measured corner with id, <span class="mono">n = {P['corners']}</span></div>
<div style="margin:1.05mm 0"><svg width="7mm" height="3.4mm" viewBox="0 0 7 3.4" style="vertical-align:-0.7mm"><circle cx="0.6" cy="1.7" r="0.42"/><line x1="0.6" y1="1.7" x2="6.6" y2="1.7" stroke="#000" stroke-width="0.32"/></svg>
 Drift vector, new − previous, magnified × 3000 <span class="muted">(1 µm = 3 mm)</span></div>
<div style="margin:1.05mm 0"><svg width="3.4mm" height="3.4mm" viewBox="0 0 3.4 3.4" style="vertical-align:-0.7mm"><circle cx="1.7" cy="1.7" r="1.4" fill="none" stroke="#000" stroke-width="0.3"/></svg>
 Largest drift: id <span class="mono">{DRIFT_MAX['id']}</span>, <span class="mono">{DRIFT_MAX_MAG:.1f} µm</span></div>
</div>'''
    return f'<div style="display:grid;grid-template-columns:104mm 1fr;gap:8mm;align-items:start">{svg}{legend}</div>'


def coords_preview():
    cols = [("id", "n"), ("row", "n"), ("col", "n"), ("x_nom", "n"), ("y_nom", "n"),
            ("x_meas", "n"), ("y_meas", "n"), ("dx_um", "n"), ("dy_um", "n")]
    rows = []
    for r in COORDS[:10]:
        rows.append([
            str(r["id"]), str(r["row"]), str(r["col"]), f"{r['x_nom']:.3f}", f"{r['y_nom']:.3f}",
            f"{r['x_meas']:.4f}", f"{r['y_meas']:.4f}", num(r["dx_um"], 1, sign=True), num(r["dy_um"], 1, sign=True),
        ])
    intro = p(
        f'Complete corner coordinates are supplied in <span class="mono black">{CSV_FILE}</span> '
        f'({len(COORDS)} rows; columns id, row, col, x_nom, y_nom, x_meas, y_meas, dx_um, dy_um; mm unless stated). '
        'First 10 rows:',
        "small",
    )
    return intro + table(cols, rows, cls="dense rawhead")


def build():
    d = Doc(
        DOC_NO, REV, RI_DATE, eyebrow="Re-inspection report",
        title="ChArUco target · ceramic · 200 × 150 mm", sn=U["sn"],
        subtitle="Re-inspection of CT-IR-000311 (Rev A, 2026-11-04)",
    )

    meta = f"9 geometry · 1 flatness · 4 visual<br>{P['corners']} corners · U = 1.5 µm (k = 2)"
    result = result_box("PASS", "All measured features within datasheet tolerance.", strip=True, meta=meta)
    top = (
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8mm;align-items:start;margin-bottom:2.8mm">'
        f'<div><div class="tag" style="margin-bottom:1.2mm">Item</div>{ir_ident_block()}</div>'
        f'<div><div class="tag" style="margin-bottom:1.2mm">Re-inspection</div>{reinspection_block()}</div></div>{result}'
    )
    method = (
        f'All {P["corners"]} ChArUco corners were measured on an optical CMM (OCMM-01); flatness was measured at '
        f'{S["inspection"]["flatness_points"]} points. Expanded uncertainty U = 1.5 µm (k = 2). Results are corrected to '
        '20 °C; ambient temperature during measurement 20.2 °C.'
    )
    lower = (
        '<div style="display:grid;grid-template-columns:1.05fr .95fr;gap:7mm;align-items:start">'
        f'<div>{section(4, "Visual")}{visual_table()}</div>'
        f'<div>{section(5, "Condition on receipt")}{condition_table()}</div>'
        '</div>'
    )
    geometry_css = '''<style>
table.t.ri-geometry { font-size:8.4pt; line-height:1.18; }
table.t.ri-geometry th { font-size:6.9pt; padding:.55mm 1.2mm .65mm; }
table.t.ri-geometry td { padding:.5mm 1.2mm; }
table.t.ri-geometry td.n, table.t.ri-geometry td.m { font-size:8.4pt; }
</style>'''
    page1 = (
        geometry_css + top + section(1, "Method") + p(method) +
        section(2, "Pattern geometry", "ceramic: deviations and drift in µm") + geometry_table() +
        section(3, "Flatness") + flatness_table() + lower
    )
    d.add_page(page1)

    statement = (
        f'The item identified above meets the specifications of datasheet {P["datasheet"]} rev {P["datasheet_rev"]} at the time of re-inspection. '
        'This is a re-inspection report issued by Calib.Tools; it is not an accredited calibration certificate. '
        'An ILAC-MRA certificate issued by an accredited third-party laboratory is available as SVC-X-CERT-ILAC.'
    )
    trace = kv([
        ("Instrument", esc(INSTRUMENT_CERT)),
        ("Reference standard", esc(REFERENCE_CERT)),
        ("Raw data", "Raw data retained for 10 years under this serial number."),
    ])
    sig = signature(RI_INSPECTOR, "Inspector", RI_DATE, sig_text=RI_INSPECTOR,
                    stamp=(U["sn"], RI_DATE, RI_INSPECTOR), note_text="Printed signature")
    footer = (
        '<div class="push" style="display:flex;justify-content:space-between;align-items:flex-end">'
        f'{sig}{qr_block(S["files"]["verify_url"], 15)}</div>'
    )
    page2 = (
        section(6, "Feature map") + feature_map() +
        section(7, "Measured coordinates") + coords_preview() +
        section(8, "Statement") + p(statement, "statement") +
        section(9, "Traceability") + trace + footer
    )
    d.add_page(page2)
    return d.render(OUT_BASE)


if __name__ == "__main__":
    write_coordinate_csv()
    build()
