"""CT-IR · Inspection report (2 pages) - reference implementation of the Calib.Tools document system.
python3 build_ir.py            -> out/CT-IR/CT-IR-000311(.pdf, -letter.pdf) and the PENDING variant
"""
import sys, json
sys.path.insert(0, "/home/ubuntu/work/docs/system")
from ctdoc import *
import ctpattern as CP

S = json.load(open("/home/ubuntu/work/docs/system/sample.json"))
COORDS = json.load(open("/home/ubuntu/work/docs/system/sample_coords.json"))
P, U, I = S["product"], S["unit"], S["inspection"]


def ident_block():
    item = kv([("Part number", P["part"]), ("Description", esc(P["description"])), ("Serial number", U["sn"]),
               ("Lot", U["lot"]), ("Datasheet", f'{P["datasheet"]} · Rev {P["datasheet_rev"]}'),
               ("Pattern", "ChArUco 12 × 17 · 10 / 7 mm<br>DICT_6X6_250"),
               ("Marker ID range", f'{P["id_first"]}–{P["id_last"]} <span class="muted">({P["markers"]} markers)</span>'),
               ("Start ID", str(P["start_id"]))],
              mono_keys=("Part number", "Serial number", "Lot", "Datasheet", "Marker ID range", "Start ID"))
    return item


def inspection_block(pending=False):
    i = I
    return kv([("Inspection date", "—" if pending else i["date"]), ("Inspector", "—" if pending else i["inspector"]),
               ("Location", esc(i["location"])),
               ("Instrument", f'{i["instrument_type"]} · <span class="mono">{i["instrument_id"]}</span>'),
               ("Last calibration", f'{i["instrument_cal"]} · valid to {i["instrument_valid"]}'),
               ("Temperature", ("—" if pending else f'{i["ambient_c"]} °C ambient') + f' · {i["ref_c"]} °C reference')],
              mono_keys=("Inspection date", "Inspector", "Temperature", "Last calibration"))


def geometry_table(pending=False):
    cols = [("Feature", "t"), ("Nominal<br>(mm)", "n"), ("Measured<br>(mm)", "n"), ("Deviation<br>(µm)", "n"),
            ("Tolerance<br>(µm)", "n"), ("Result", "s")]
    rows = []
    for g in S["geometry"]:
        f = esc(g["feature"]) + (f' <span class="muted small">· {esc(g["note"])}</span>' if g.get("note") else "")
        if pending:
            rows.append([f, g["nominal"], "—", "—", g["tol"], "PENDING"])
        else:
            rows.append([f, g["nominal"], g["measured"], g["dev"] or "—", g["tol"], g["result"]])
    return table(cols, rows, widths=["40%", "12%", "13%", "12%", "12%", "11%"])


def flatness_table(pending=False):
    fl = S["flatness"]
    cols = [("Measured flatness (µm)", "n"), ("Tolerance (µm)", "n"), ("Method", "t"), ("Result", "s")]
    return table(cols, [["—" if pending else str(fl["measured_um"]), fl["tol"], esc(fl["method"]), "PENDING" if pending else fl["result"]]],
                 widths=["24%", "17%", "47%", "12%"])


def visual_table(pending=False):
    cols = [("Check", "t"), ("Criterion", "t"), ("Result", "s")]
    return table(cols, [[esc(v["check"]), esc(v["criterion"]), "PENDING" if pending else v["result"]] for v in S["visual"]],
                 widths=["30%", "58%", "12%"])


def feature_map(pending=False):
    vec = None if pending else {r["id"]: (r["dx_um"], r["dy_um"]) for r in COORDS}
    hl = None if pending else [S["coordinates"]["max_id"]]
    svg = CP.board_svg(P["W"], P["H"], P["rows"], P["cols"], P["sq"], P["marker"], P["mx"], P["my"], label=P["label_line"],
                       label_w=170, axes_spec=P["axes_spec"], mode="map", width_mm=104, corners=True, corner_ids=True,
                       vectors=vec, vec_scale=2000, highlight=hl, origin=True)
    lg = f'''<div class="small" style="line-height:1.5">
<div class="tag" style="margin-bottom:1.5mm">Legend</div>
<svg width="34mm" height="13mm" viewBox="0 0 34 13">{CP.axes(2, 2, 9, 0.75, labels=False)}
<text x="13" y="3.1" font-family="Geist Mono" font-size="2.6" fill="#000">X → right</text>
<text x="4.6" y="11.6" font-family="Geist Mono" font-size="2.6" fill="#000">Y ↓ down</text></svg>
<div style="margin:1.2mm 0"><svg width="3.4mm" height="3.4mm" viewBox="0 0 3.4 3.4" style="vertical-align:-0.7mm"><circle cx="1.7" cy="1.7" r="1.3" fill="#fff" stroke="#000" stroke-width="0.35"/><circle cx="1.7" cy="1.7" r="0.45"/></svg>
 Origin <span class="mono">(0, 0)</span>: top-left outer corner of the pattern (OpenCV frame)</div>
<div style="margin:1.2mm 0"><svg width="3.4mm" height="3.4mm" viewBox="0 0 3.4 3.4" style="vertical-align:-0.7mm"><circle cx="1.7" cy="1.7" r="0.42"/></svg>
 Measured corner with id, <span class="mono">n = {P["corners"]}</span></div>
{"" if pending else f"""<div style="margin:1.2mm 0"><svg width="7mm" height="3.4mm" viewBox="0 0 7 3.4" style="vertical-align:-0.7mm"><circle cx="0.6" cy="1.7" r="0.42"/><line x1="0.6" y1="1.7" x2="6.6" y2="1.7" stroke="#000" stroke-width="0.32"/></svg>
 Deviation vector, magnified × 2000 <span class="muted">(1 µm = 2 mm on the board)</span></div>
<div style="margin:1.2mm 0"><svg width="3.4mm" height="3.4mm" viewBox="0 0 3.4 3.4" style="vertical-align:-0.7mm"><circle cx="1.7" cy="1.7" r="1.4" fill="none" stroke="#000" stroke-width="0.3"/></svg>
 Largest deviation: id <span class="mono">{S["coordinates"]["max_id"]}</span>, <span class="mono">{S["coordinates"]["max_um"]} µm</span></div>"""}
</div>'''
    return f'<div style="display:grid;grid-template-columns:104mm 1fr;gap:8mm;align-items:start">{svg}{lg}</div>'


def coords_preview(pending=False):
    c = S["coordinates"]
    if pending:
        return p("Measurement pending. The coordinate file <span class=\"mono\">CT-CSV-000311.csv</span> will be issued with Rev B of this report.")
    cols = [("id", "n"), ("row", "n"), ("col", "n"), ("x_nom", "n"), ("y_nom", "n"), ("x_meas", "n"), ("y_meas", "n"),
            ("dx_um", "n"), ("dy_um", "n")]
    rows = [[str(r["id"]), str(r["row"]), str(r["col"]), f'{r["x_nom"]:.3f}', f'{r["y_nom"]:.3f}', f'{r["x_meas"]:.4f}',
             f'{r["y_meas"]:.4f}', num(r["dx_um"], 1, sign=True), num(r["dy_um"], 1, sign=True)] for r in COORDS[:10]]
    intro = p(f'Complete corner coordinates are supplied in <span class="mono black">{c["file"]}</span> ({c["n"]} rows; columns id, row, col, '
              f'x_nom, y_nom, x_meas, y_meas, dx_um, dy_um; mm unless stated). First 10 rows:', "small")
    return intro + table(cols, rows, cls="dense rawhead")


def build(variant="pass"):
    pending = variant == "pending"
    rev = "A"
    d = Doc(I["report_no"], rev, I["date"] if not pending else "2026-11-03", eyebrow="Inspection report",
            title="ChArUco target · ceramic · 200 × 150 mm", sn=U["sn"])
    meta = (f'{len(S["geometry"])} geometry · 1 flatness · {len(S["visual"])} visual<br>'
            f'{P["corners"]} corners · U = {I["U_k2_um"]} µm (k = 2)')
    if pending:
        res = result_box("PENDING", "Measurement data pending; this report will be re-issued as Rev B.", strip=True, meta=meta)
    else:
        res = result_box("PASS", "All measured features within datasheet tolerance.", strip=True, meta=meta)
    top = (f'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8mm;align-items:start;margin-bottom:3.2mm">'
           f'<div><div class="tag" style="margin-bottom:1.2mm">Item</div>{ident_block()}</div>'
           f'<div><div class="tag" style="margin-bottom:1.2mm">Inspection</div>{inspection_block(pending)}</div></div>{res}')
    insp = ""
    verb = "will be measured" if pending else "were measured"
    m = (f'Positions of all {P["corners"]} ChArUco corners {verb} on an optical CMM ({I["instrument_id"]}); flatness '
         f'{"will be" if pending else "was"} measured at {I["flatness_points"]} points. Expanded uncertainty U = {I["U_k2_um"]} µm (k = 2). Results are corrected '
         f'to the reference temperature of {I["ref_c"]} °C' + ('.' if pending else f'; ambient temperature during measurement {I["ambient_c"]} °C.'))
    page1 = (top + insp + section(1, "Method") + p(m) + section(2, "Pattern geometry", "ceramic: deviations in µm") + geometry_table(pending)
             + section(3, "Flatness") + flatness_table(pending) + section(4, "Visual") + visual_table(pending))
    d.add_page(page1)

    ds = f'{P["datasheet"]} rev {P["datasheet_rev"]}'
    if pending:
        stmt = "Measurement data pending; this report will be re-issued as Rev B."
    else:
        stmt = (f"The item identified above meets the specifications of datasheet {ds} at the time of inspection. "
                "This is an inspection report issued by Calib.Tools; it is not an accredited calibration certificate. "
                "An ILAC-MRA certificate issued by an accredited third-party laboratory is available as SVC-X-CERT-ILAC.")
    tr = S["traceability"]
    trace = kv([("Instrument", esc(tr["instrument_cert"])), ("Reference standard", esc(tr["reference"])),
                ("Raw data", esc(tr["retention"]))])
    sig = signature(I["inspector"], "Inspector", I["date"] if not pending else "—", sig_text=None if pending else "JG",
                    stamp=None if pending else (U["sn"], I["date"], I["inspector"]),
                    note_text="Printed signature" if not pending else None)
    foot = (f'<div class="push" style="display:flex;justify-content:space-between;align-items:flex-end">{sig}'
            f'{qr_block(S["files"]["verify_url"], 15)}</div>')
    page2 = (section(5, "Feature map") + feature_map(pending) + section(6, "Measured coordinates") + coords_preview(pending)
             + section(7, "Statement") + f'<p class="statement">{stmt}</p>' + section(8, "Traceability") + trace + foot)
    d.add_page(page2)
    out = "/home/ubuntu/work/docs/out/CT-IR/" + (I["report_no"] if not pending else I["report_no"] + "-PENDING")
    return d.render(out)


if __name__ == "__main__":
    build("pass")
    build("pending")
