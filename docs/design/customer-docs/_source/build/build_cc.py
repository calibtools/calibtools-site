"""CT-CC · Calibration certificate cover sheet (one-page customer document)."""
import sys
import json

sys.path.insert(0, "/home/ubuntu/work/docs/system")
from ctdoc import *

S = json.load(open("/home/ubuntu/work/docs/system/sample.json"))
P, U = S["product"], S["unit"]


DOC_NO = "CT-CC-000311"
REV = "A"
DATE = "2026-11-20"
VERIFY_URL = "https://calib.tools/verify/000311"


def correspondence_table():
    """The bound certificate index, kept in the required specification order."""
    columns = [("Correspondence", "t"), ("Reference", "t")]
    rows = [
        ["Our serial", f'<span class="mono">{U["sn"]}</span>'],
        ["Part number", f'<span class="mono">{P["part"]}</span>'],
        ["Laboratory certificate no.", '<span class="mono">[lab cert no.]</span>'],
        ["Laboratory name &amp; accreditation no.",
         '<span class="mono">[Accredited laboratory]</span><br><span class="mono muted">[accreditation body and no., e.g. D-K-xxxxx-xx-xx]</span>'],
        ["Date of calibration", '<span class="mono">[date]</span>'],
        ["Next recommended calibration", '<span class="mono">[if stated by the lab]</span>'],
    ]
    return table(columns, rows, cls="plain cc-correspondence", widths=["38%", "62%"])


def attached_block():
    attachment = (
        '<div class="attach">'
        '<div class="tag">Attached</div>'
        '<div class="attach-title">Laboratory certificate</div>'
        '<div class="attach-meta">Number of pages&nbsp;&nbsp;<span class="mono black">[n]</span></div>'
        '</div>'
    )
    return (
        '<div class="push cover-closing">'
        '<div>' + attachment +
        '<p class="small muted cover-note">This cover sheet is intended to remain bound in front of the attached laboratory certificate.</p>'
        '</div>'
        + qr_block(VERIFY_URL, 15) +
        '</div>'
    )


def cover_css():
    """Small document-local additions; all tokens remain those of ctdoc/base_css."""
    return f'''<style>
    .cc-correspondence {{ margin-top: .1mm; }}
    .cc-correspondence td {{ padding-top: 1.25mm; padding-bottom: 1.25mm; }}
    .cc-correspondence td:first-child {{ color: {G60}; font-size: 8.5pt; }}
    .cc-statement {{ max-width: 145mm; margin-bottom: .2mm; }}
    .guide {{ border: .25mm solid {G30}; padding: 2.1mm 3mm 1.8mm; display: grid; gap: .95mm; font-size: 9.5pt; line-height: 1.35; }}
    .guide > div {{ display: grid; grid-template-columns: 8mm 1fr; column-gap: 1.2mm; }}
    .guide-n {{ color: {G60}; font-size: 8pt; padding-top: .15mm; }}
    .cover-closing {{ display: flex; justify-content: space-between; align-items: flex-end; padding-top: 7mm; }}
    .attach {{ min-width: 76mm; border-top: .5mm solid {BLACK}; padding-top: 2.2mm; }}
    .attach-title {{ font-size: 12pt; font-weight: 600; color: {BLACK}; margin-top: .7mm; }}
    .attach-meta {{ font-size: 9pt; color: {G60}; margin-top: .55mm; }}
    .cover-note {{ margin: 3mm 0 0; max-width: 90mm; }}
    </style>'''


def build():
    d = Doc(
        DOC_NO,
        REV,
        DATE,
        eyebrow="Calibration certificate",
        title="Calibration certificate — cover sheet",
        sn=U["sn"],
    )

    statement = (
        'The attached certificate was issued by &lt;lab&gt;, accredited to ISO/IEC 17025 under '
        '&lt;body&gt;, a signatory of the ILAC-MRA. Calib.Tools did not alter it.'
    )
    reading_guide = (
        '<div class="guide">'
        '<div><span class="mono guide-n">01</span><span>Find the laboratory measurement results on its results page.</span></div>'
        '<div><span class="mono guide-n">02</span><span>Expanded uncertainty <span class="mono">U</span> is stated for coverage factor <span class="mono">k = 2</span>.</span></div>'
        '<div><span class="mono guide-n">03</span><span>For the board inspection record, see <span class="mono">CT-IR-000311</span>.</span></div>'
        '</div>'
    )

    page = (
        cover_css()
        + section(1, "Certificate correspondence")
        + correspondence_table()
        + section(2, "Statement")
        + f'<p class="statement cc-statement">{statement}</p>'
        + section(3, "Reading guide")
        + reading_guide
        + attached_block()
    )
    d.add_page(page)
    return d.render("/home/ubuntu/work/docs/out/CT-CC/CT-CC-000311")


if __name__ == "__main__":
    build()
