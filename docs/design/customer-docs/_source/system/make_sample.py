"""Shared sample data for every customer-document sample (spec section 18 + illustrative fill-ins)."""
import json, math, sys
import numpy as np
sys.path.insert(0, "/home/ubuntu/work/docs/system")
import ctpattern as CP

S = {}
S["_readme"] = ("Values marked in 'illustrative' are NOT from spec section 18; they were added so that every field of the layout "
                "can be shown. Replace them from the real data sources (serials.json, measurements/<sn>.json, datasheets).")
S["company"] = dict(brand="Calib.Tools", legal_name="[Legal entity name — to be decided]",
                    address=["[Street and number]", "[Postcode] Munich", "Germany"], vat_id="DE[VAT ID — to be assigned]",
                    register="[Commercial register — to be decided]", managing_director="[Name]",
                    email="hello@calib.tools", web="calib.tools", phone="[+49 …]",
                    bank=dict(name="[Bank]", iban="DE00 0000 0000 0000 0000 00", bic="[BIC]"),
                    returns_address=["Calib.Tools · Returns", "[Street and number]", "[Postcode] Munich, Germany"])
S["product"] = dict(part="CT-CHA-C-200150-6X6", description="ChArUco calibration target, ceramic, 200 × 150 mm",
                    family="CHA", family_name="ChArUco", material="C", material_name="ceramic",
                    W=200, H=150, t=4.0, rows=12, cols=17, sq=10, marker=7, dict="DICT_6X6_250",
                    id_first=0, id_last=101, start_id=0, markers=102, corners=176, mx=15, my=15,
                    pattern_w=170, pattern_h=120,
                    pattern_summary="ChArUco 12 × 17 · 10 / 7 mm · DICT_6X6_250 · IDs 0–101 · start 0",
                    label_line="CALIB.TOOLS   CT-CHA-C-200150-6X6   ChArUco 12×17 · 10/7 mm · DICT_6X6_250 · IDs 0–101   SN 000311 · Rev A",
                    datasheet="CT-DS-CHA-C", datasheet_rev="A", drawing="CT-DWG-CHA-C-200150", drawing_rev="A",
                    axes_spec=[4.5, 4.5, 6.5, 0.6])
S["unit"] = dict(sn="000311", sn_new_format="26W45-00311", lot="L-2611-0382")
S["inspection"] = dict(report_no="CT-IR-000311", rev="A", date="2026-11-04", inspector="JG", inspector_role="Inspector",
                       location="per Calib.Tools procedure CT-WI-001", procedure="CT-WI-001",
                       instrument_type="Optical CMM", instrument_id="OCMM-01", instrument_cal="2026-03", instrument_valid="2027-03",
                       ambient_c=20.4, ref_c=20, U_k2_um=1.5, n_points=176, flatness_points=25,
                       result="PASS")
S["geometry"] = [
    dict(feature="Square pitch X", nominal="10.000", measured="10.0012", dev="+1.2", tol="±2", result="PASS"),
    dict(feature="Square pitch Y", nominal="10.000", measured="9.9992", dev="−0.8", tol="±2", result="PASS"),
    dict(feature="Pattern width", nominal="170.000", measured="170.004", dev="+4", tol="±5", result="PASS"),
    dict(feature="Pattern height", nominal="120.000", measured="120.003", dev="+3", tol="±5", result="PASS", illustrative=True),
    dict(feature="Diagonal 1", nominal="208.087", measured="208.091", dev="+4", tol="±7", result="PASS", illustrative=True),
    dict(feature="Diagonal 2", nominal="208.087", measured="208.085", dev="−2", tol="±7", result="PASS", illustrative=True),
    dict(feature="Orthogonality", nominal="90.000°", measured="90.0008°", dev="—", tol="±0.002°", result="PASS"),
    dict(feature="Max single-feature deviation", nominal="—", measured="—", dev="1.6", tol="≤ 2", result="PASS", note="n = 176"),
    dict(feature="RMS deviation", nominal="—", measured="—", dev=None, tol="—", result="N/A", note="information only", illustrative=True),
]
S["flatness"] = dict(measured_um=12, tol="≤ 20", method="25 points, 5 × 5 grid, least-squares plane", result="PASS")
S["visual"] = [
    dict(check="Edge chamfer", criterion="0.5 × 45° on all edges, no chips > 0.3 mm", result="PASS", illustrative=True),
    dict(check="Surface defects", criterion="No scratches or pinholes in the pattern area", result="PASS"),
    dict(check="Print / edge definition", criterion="Square edges sharp, no ink bleed at 10× loupe", result="PASS"),
    dict(check="Marking legibility", criterion="Label line, X / Y arrows and SN legible", result="PASS"),
]
S["traceability"] = dict(instrument_cert="OCMM-01 · certificate K-2026-03-0141 · valid to 2027-03",
                         reference="Glass scale GS-01 (200 mm) · certificate K-2026-02-0087 · valid to 2027-02",
                         retention="Raw data retained for 10 years under this serial number.", illustrative=True)
S["customer"] = dict(name="Example Robotics GmbH", contact="Dr. Anna Weber", dept="Vision Systems",
                     address=["Musterstraße 12", "70173 Stuttgart", "Germany"], vat_id="DE123456789",
                     email="a.weber@example-robotics.de", illustrative=True)
S["order"] = dict(no="CT-1047", shopify="#1047", date="2026-11-02", ship_date="2026-11-05", line=1,
                  carrier="DHL Express", tracking="1234567890", incoterm="DAP", payment="Paid online (Shopify)",
                  illustrative=True)
S["files"] = dict(verify_url="https://calib.tools/verify/000311", files_url_base="https://calib.tools/files/")
S["doc_numbers"] = {
    "CT-IR": "CT-IR-000311", "CT-CSV": "CT-CSV-000311", "CT-DS": "CT-DS-CHA-C", "CT-UM": "CT-UM-GEN",
    "CT-UM-family": "CT-UM-CHA-C", "CT-AN": "CT-AN-004", "CT-FM": "CT-FM-1047-01", "CT-DN": "CT-DN-1047",
    "CT-CoC": "CT-CoC-1047", "CT-CC": "CT-CC-000311", "CT-RI": "CT-RI-000311-01", "CT-BR": "CT-BR-L-2611-0390",
    "CT-QR": "CT-QR-7K2F9", "CT-DR": "CT-DR-3M8Q1", "CT-PS": "CT-PS-A4X7Q", "CT-QT": "Q00017", "CT-INV": "CT-INV-2026-0047"}

# ---- synthetic corner deviations (CT-CSV-000311)
rng = np.random.default_rng(311)
cl = CP.corner_list(12, 17, 10)
dx = rng.normal(0, 0.42, len(cl)); dy = rng.normal(0, 0.42, len(cl))
for i, (cid, r, c, xn, yn) in enumerate(cl):          # mild systematic field + noise
    dx[i] += 0.25 * math.sin(xn / 170 * math.pi) - 0.1
    dy[i] += 0.2 * (yn - 60) / 60
mag = np.hypot(dx, dy); k = int(np.argmax(mag))
scale = 1.6 / mag[k]; dx *= scale; dy *= scale
dx = np.round(dx, 1); dy = np.round(dy, 1)
mag = np.hypot(dx, dy)
k = int(np.argmax(mag))
rows = []
for i, (cid, r, c, xn, yn) in enumerate(cl):
    rows.append(dict(id=cid, row=r, col=c, x_nom=xn, y_nom=yn, x_meas=round(xn + dx[i] / 1000, 4), y_meas=round(yn + dy[i] / 1000, 4),
                     dx_um=float(dx[i]), dy_um=float(dy[i])))
rms = float(np.sqrt(np.mean(dx ** 2 + dy ** 2)))
S["geometry"][-1]["dev"] = f"{rms:.1f}"
S["coordinates"] = dict(file="CT-CSV-000311.csv", n=len(rows), max_id=int(cl[k][0]), max_um=round(float(mag[k]), 2),
                        rms_um=round(rms, 2), synthetic=True)
json.dump(S, open("/home/ubuntu/work/docs/system/sample.json", "w"), ensure_ascii=False, indent=1)
json.dump(rows, open("/home/ubuntu/work/docs/system/sample_coords.json", "w"))
with open("/home/ubuntu/work/docs/out/CT-CSV/CT-CSV-000311.csv", "w", encoding="utf-8", newline="\n") as f:
    f.write("# Calib.Tools measured coordinates · CT-CSV-000311 · part CT-CHA-C-200150-6X6 · ref 20 °C · unit mm\n")
    f.write("# instrument: optical CMM OCMM-01 · U(k=2): 0.0015 mm · generated 2026-11-04\n")
    f.write("# frame: OpenCV · origin = top-left outer corner of the pattern · X right · Y down · 176 ChArUco corners\n")
    f.write("id,row,col,x_nom,y_nom,x_meas,y_meas,dx_um,dy_um\n")
    for r in rows:
        f.write(f"{r['id']},{r['row']},{r['col']},{r['x_nom']:.3f},{r['y_nom']:.3f},{r['x_meas']:.4f},{r['y_meas']:.4f},{r['dx_um']:.1f},{r['dy_um']:.1f}\n")
print("max", S["coordinates"], "rms", round(rms, 3))
