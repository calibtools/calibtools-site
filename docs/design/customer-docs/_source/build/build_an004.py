"""CT-AN-004 · Reading an inspection report (2-page application note)."""
import json
import sys

sys.path.insert(0, "/home/ubuntu/work/docs/system")
from ctdoc import *

S = json.load(open("/home/ubuntu/work/docs/system/sample.json"))
P, U, I = S["product"], S["unit"], S["inspection"]


CUSTOM_CSS = """
<style>
.an-lead { font-size:10.2pt; line-height:1.42; max-width:164mm; margin-bottom:0; }
.compare td { padding-top:1.15mm; padding-bottom:1.15mm; }
.compare td:first-child { font-weight:600; }
.report-guide { display:grid; grid-template-columns:67mm 1fr; gap:6mm; align-items:start; }
.report-map { display:block; width:67mm; height:auto; border:0.25mm solid #B3B3B3; }
.checkgrid { display:grid; grid-template-columns:1fr 1fr; gap:3mm 8mm; }
.checkgroup { border-top:0.25mm solid #E6E6E6; padding-top:1.5mm; }
.checkgroup .tag { margin-bottom:1.1mm; }
.checkgroup p { margin-bottom:1.4mm; }
.archive { display:grid; grid-template-columns:1fr 1fr; gap:8mm; align-items:start; }
.integrity { display:grid; grid-template-columns:1fr 1fr; gap:7mm; align-items:start; }
.integrity pre.code { font-size:7.25pt; line-height:1.4; margin-top:1.2mm; }
.ref td { padding-top:0.7mm; padding-bottom:0.7mm; }
.bottom-note { max-width:126mm; font-size:8.8pt; line-height:1.38; }
</style>
"""


def report_map_svg():
    """Two miniature report pages with numbered, monochrome reading callouts."""
    return '''<svg class="report-map" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 119" aria-label="Schematic of the two CT-IR report pages">
<rect width="100" height="119" fill="#fff"/>
<g font-family="Geist Mono" fill="#333333">
  <text x="5" y="6" font-size="3" letter-spacing=".5">CT-IR-000311</text>
  <text x="58" y="6" font-size="3" letter-spacing=".5">CT-IR-000311</text>
</g>
<g fill="#fff" stroke="#333333" stroke-width=".45">
  <rect x="4" y="9" width="41" height="101"/>
  <rect x="55" y="9" width="41" height="101"/>
</g>
<g font-family="Geist" fill="#000">
  <text x="8" y="15" font-size="2.8" font-weight="700">INSPECTION REPORT</text>
  <rect x="8" y="18" width="33" height="8" fill="#F2F2F2" stroke="#333333" stroke-width=".3"/>
  <text x="10" y="23" font-family="Geist Mono" font-size="3" font-weight="700">PASS</text>
  <line x1="8" y1="31" x2="41" y2="31" stroke="#000" stroke-width=".55"/>
  <text x="8" y="36" font-size="2.6" font-weight="700">2  Pattern geometry</text>
  <g stroke="#B3B3B3" stroke-width=".3"><line x1="8" y1="40" x2="41" y2="40"/><line x1="8" y1="44" x2="41" y2="44"/><line x1="8" y1="48" x2="41" y2="48"/><line x1="8" y1="52" x2="41" y2="52"/></g>
  <line x1="8" y1="58" x2="41" y2="58" stroke="#000" stroke-width=".55"/>
  <text x="8" y="63" font-size="2.6" font-weight="700">3  Flatness</text>
  <rect x="8" y="66" width="33" height="6" fill="#F2F2F2"/>
  <line x1="8" y1="78" x2="41" y2="78" stroke="#000" stroke-width=".55"/>
  <text x="8" y="83" font-size="2.6" font-weight="700">4  Visual</text>
  <g stroke="#B3B3B3" stroke-width=".3"><line x1="8" y1="87" x2="41" y2="87"/><line x1="8" y1="91" x2="41" y2="91"/><line x1="8" y1="95" x2="41" y2="95"/></g>
  <text x="8" y="106" font-family="Geist Mono" font-size="2.2" fill="#666666">PAGE 1 / 2</text>

  <line x1="59" y1="17" x2="92" y2="17" stroke="#000" stroke-width=".55"/>
  <text x="59" y="22" font-size="2.6" font-weight="700">5  Feature map</text>
  <rect x="59" y="25" width="23" height="22" fill="#F2F2F2" stroke="#B3B3B3" stroke-width=".3"/>
  <g fill="#B3B3B3"><rect x="61" y="27" width="3" height="3"/><rect x="67" y="27" width="3" height="3"/><rect x="73" y="27" width="3" height="3"/><rect x="79" y="27" width="2" height="3"/><rect x="64" y="32" width="3" height="3"/><rect x="70" y="32" width="3" height="3"/><rect x="76" y="32" width="3" height="3"/><rect x="61" y="37" width="3" height="3"/><rect x="67" y="37" width="3" height="3"/><rect x="73" y="37" width="3" height="3"/><rect x="79" y="37" width="2" height="3"/></g>
  <line x1="59" y1="53" x2="92" y2="53" stroke="#000" stroke-width=".55"/>
  <text x="59" y="58" font-size="2.6" font-weight="700">6  Coordinates CSV</text>
  <g stroke="#B3B3B3" stroke-width=".3"><line x1="59" y1="62" x2="92" y2="62"/><line x1="59" y1="66" x2="92" y2="66"/><line x1="59" y1="70" x2="92" y2="70"/></g>
  <line x1="59" y1="76" x2="92" y2="76" stroke="#000" stroke-width=".55"/>
  <text x="59" y="81" font-size="2.6" font-weight="700">7  Statement</text>
  <g stroke="#B3B3B3" stroke-width=".3"><line x1="59" y1="85" x2="92" y2="85"/><line x1="59" y1="88" x2="92" y2="88"/></g>
  <line x1="59" y1="94" x2="92" y2="94" stroke="#000" stroke-width=".55"/>
  <text x="59" y="99" font-size="2.6" font-weight="700">8  Traceability</text>
  <text x="59" y="106" font-family="Geist Mono" font-size="2.2" fill="#666666">PAGE 2 / 2</text>
</g>
<g font-family="Geist Mono" font-size="2.6" text-anchor="middle" fill="#fff" stroke="#000" stroke-width=".35">
  <circle cx="39" cy="21" r="2.5" fill="#333333"/><circle cx="39" cy="35" r="2.5" fill="#333333"/><circle cx="39" cy="62" r="2.5" fill="#333333"/>
  <circle cx="90" cy="21" r="2.5" fill="#333333"/><circle cx="90" cy="57" r="2.5" fill="#333333"/><circle cx="90" cy="80" r="2.5" fill="#333333"/><circle cx="90" cy="98" r="2.5" fill="#333333"/>
</g>
<g font-family="Geist Mono" font-size="2.6" text-anchor="middle" fill="#fff"><text x="39" y="22">1</text><text x="39" y="36">2</text><text x="39" y="63">3</text><text x="90" y="22">4</text><text x="90" y="58">5</text><text x="90" y="81">6</text><text x="90" y="99">7</text></g>
</svg>'''


def comparison_table():
    cols = [("Document", "t"), ("Issuer", "t"), ("Accreditation", "t"),
            ("What it demonstrates", "t"), ("When you need it", "t")]
    rows = [
        ["<span class=\"mono\">CT-IR</span><br>Inspection report", "Calib.Tools", "No — manufacturer record",
         "A specified board was inspected against its datasheet at the time of inspection, with measured data.",
         "You need serial-level receiving evidence or engineering data."],
        ["<span class=\"mono\">CT-CoC</span><br>Certificate of conformance", "Calib.Tools", "No — manufacturer statement",
         "Listed items were manufactured to the referenced drawing, inspected per procedure, and conform to the datasheet.",
         "A purchase order or customer asks for a conformance statement."],
        ["ILAC-MRA certificate<br><span class=\"muted small\">CT-CC cover</span>", "Accredited third-party laboratory",
         "Yes — laboratory scope applies", "The laboratory’s calibration result and stated uncertainty for the item or service in scope.",
         "Your quality plan, customer, or regulator requires an accredited laboratory certificate."],
    ]
    return table(cols, rows, cls="dense compare", widths=["17%", "17%", "16%", "29%", "21%"])


def report_guide():
    cols = [("Callout", "m"), ("What to read", "t"), ("CT-IR-000311 example", "t")]
    rows = [
        ["1", "Overall result sets the decision for the report’s defined checks.", "PASS — all measured features within datasheet tolerance."],
        ["2", "Compare deviation with tolerance; geometry values are in µm unless marked otherwise.", "Pitch X +1.2 µm vs ±2; max single-feature deviation 1.6 µm vs ≤ 2."],
        ["3", "Confirm measured flatness, method, point count, and limit.", "12 µm, 25 points, limit ≤ 20 µm."],
        ["4", "Feature map establishes the coordinate frame and locates the largest vector.", "X right, Y down; corner id 88; 1.6 µm."],
        ["5", "Use the complete CSV for analysis, not only the ten-row preview.", "176 rows in CT-CSV-000311.csv."],
        ["6", "Read the statement’s scope and date before reusing it in a supplier file.", "References CT-DS-CHA-C Rev A at time of inspection."],
        ["7", "Keep the instrument and reference record with the report.", "OCMM-01; raw data retained for 10 years."],
    ]
    return (f'<div class="report-guide"><figure>{report_map_svg()}<figcaption>Miniature schematic. Callouts align with the reading guide.</figcaption></figure>'
            f'<div>{table(cols, rows, cls="dense plain", widths=["10%", "49%", "41%"]) }'
            f'<p class="small muted" style="margin-top:2mm">The report is evidence of inspection. It does not substitute for an accredited laboratory certificate where your process requires one.</p></div></div>')


def checklist():
    groups = [
        ("Received target", ["Match SN 000311 to the target.", "Match the part number to the PO."]),
        ("Report record", ["Check CT-IR-000311 · Rev A.", "Confirm PASS belongs to that serial."]),
        ("Data package", ["Save CT-CSV-000311.csv (176 rows).", "Check X right / Y down frame."]),
        ("Release record", ["Record checksum and verify URL.", "Escalate missing files to quality owner."]),
    ]
    out = []
    for label, lines in groups:
        entries = "".join(p(checkbox(False, line), "small") for line in lines)
        out.append(f'<div class="checkgroup"><div class="tag">{esc(label)}</div>{entries}</div>')
    return '<div class="checkgrid">' + ''.join(out) + '</div>'


def references():
    cols = [("Reference", "t"), ("Use", "t")]
    rows = [
        ['<a href="https://calib.tools/verify">calib.tools/verify</a>', "Retrieve report and companion files by serial number."],
        ['<a href="https://calib.tools/files/CT-AN-001">CT-AN-001</a>', "Pattern files and software setup."],
        ['<a href="https://calib.tools/files/CT-UM-GEN">CT-UM-GEN</a>', "General handling and use."],
        ["ISO 9001:2015", "Clause 7.1.5 — monitoring and measuring resources."],
        ["ILAC MRA", "Mutual recognition context for accredited laboratory certificates."],
    ]
    return table(cols, rows, cls="dense plain ref", widths=["31%", "69%"])


def build():
    d = Doc("CT-AN-004", "A", "2026-11-01", eyebrow="Application note", title="Reading an inspection report")

    page1 = (
        CUSTOM_CSS
        + section(1, "Scope")
        + p("For purchasing and quality departments receiving a serial-numbered target. This note explains how to read the inspection report for sample unit "
            "<span class=\"mono\">000311</span>, choose the appropriate supporting record, and retain the delivery evidence. It is operational guidance, not legal advice.", "an-lead")
        + section(2, "Report, CoC and certificate compared")
        + comparison_table()
        + note("Choose the record named by your purchase order or quality plan. A CT-IR gives serial-level inspection evidence; a CT-CoC gives a manufacturer’s conformance statement; an ILAC-MRA certificate comes from an accredited third-party laboratory.", "Decision point")
        + section(3, "The report section by section", "CT-IR-000311")
        + report_guide()
    )
    d.add_page(page1)

    archive_pairs = kv([
        ("Required set", "<span class=\"mono\">CT-IR-000311.pdf</span> + <span class=\"mono\">CT-CSV-000311.csv</span>"),
        ("Online record", '<a class="mono" href="https://calib.tools/verify/000311">calib.tools/verify/000311</a>'),
        ("Supplier raw data", "Calib.Tools retains raw data for 10 years under the serial number."),
        ("Your QMS", "Set retention, acceptance, and access controls with the quality-system owner."),
    ])
    sha_code = code("""# Run from the extracted delivery folder
sha256sum -c CT-FM-1047-01.sha256""")
    pandas_code = code("""import pandas as pd
df = pd.read_csv(\"CT-CSV-000311.csv\", comment=\"#\")
df[\"dev_um\"] = (df.dx_um**2 + df.dy_um**2) ** 0.5
print(df.loc[df.dev_um.idxmax(), [\"id\", \"dev_um\"]])""")

    page2 = (
        section(4, "Incoming inspection checklist")
        + p("Record these checks in the receiving process; leave acceptance criteria and approvals to your own quality system.", "small")
        + checklist()
        + section(5, "Archiving for ISO 9001")
        + p("Use the report and CSV as evidence supporting control of monitoring and measuring resources under <span class=\"mono\">ISO 9001:2015 § 7.1.5</span>. Retain them with the asset or receiving record.")
        + f'<div class="archive"><div>{archive_pairs}</div>{note("This application note does not provide legal advice. Ask your quality-system owner how ISO 9001:2015 applies to your process.", "Quality-system boundary")}</div>'
        + section(6, "Checking file integrity")
        + p("Verify the extracted package against its SHA-256 manifest. To review the coordinate data, recompute the largest radial deviation from columns <span class=\"mono\">id, row, col, x_nom, y_nom, x_meas, y_meas, dx_um, dy_um</span>.", "small")
        + f'<div class="integrity"><div><div class="tag">Shell</div>{sha_code}</div><div><div class="tag">Python / pandas</div>{pandas_code}</div></div>'
        + section(7, "References")
        + references()
        + '<div class="push" style="display:flex;justify-content:space-between;align-items:flex-end;gap:12mm">'
          '<div class="box bottom-note"><div class="tag" style="margin-bottom:1mm">Need an accredited laboratory certificate?</div>'
          'Where required, request the applicable ILAC-MRA option for the serial-numbered target and retain the original laboratory certificate with your quality record.</div>'
          + qr_block("https://calib.tools/files/CT-AN-004", 15)
          + '</div>'
    )
    d.add_page(page2)
    return d.render("/home/ubuntu/work/docs/out/CT-AN-004/CT-AN-004")


if __name__ == "__main__":
    build()
