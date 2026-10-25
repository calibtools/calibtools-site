"""CT-QT · Quotation Q00017 (Rev A).
Renders A4 and US Letter customer quotation PDFs plus A4 preview PNGs.
"""
import json
import sys

sys.path.insert(0, "/home/ubuntu/work/docs/system")
from ctdoc import *
import ctpattern as CP

S = json.load(open("/home/ubuntu/work/docs/system/sample.json"))
Q = S["quote"]
C = S["customer"]

OUT = "/home/ubuntu/work/docs/out/CT-QT/Q00017"

# Illustrative quotation values; all displayed totals are calculated from these values.
TARGET_UNIT_PRICE = 3280.00
CERT_UNIT_PRICE = 490.00
FIXTURE_UNIT_PRICE = 450.00
NRE_PRICE = 1850.00
TARGET_QTY = 2
CERT_QTY = 2
FIXTURE_QTY = 2

TARGET_TOTAL = TARGET_QTY * TARGET_UNIT_PRICE
CERT_TOTAL = CERT_QTY * CERT_UNIT_PRICE
FIXTURE_TOTAL = FIXTURE_QTY * FIXTURE_UNIT_PRICE
SUBTOTAL_ITEMS = TARGET_TOTAL + CERT_TOTAL
QUOTE_TOTAL = SUBTOTAL_ITEMS + NRE_PRICE


def eur(value):
    """EUR figure without the currency prefix; table header provides the unit."""
    return f"{value:,.2f}"


def css():
    """CT-QT-specific layout primitives using only the shared visual tokens."""
    return """
<style>
.qt-top { display:grid; grid-template-columns:1fr 1fr; gap:8mm; align-items:start; margin-bottom:1.2mm; }
.qt-top .tag { margin-bottom:1.2mm; }
.qt-intro { margin:0 0 2.5mm; color:#333333; }
.qt-nre-total { display:grid; grid-template-columns:1.35fr .65fr; gap:7mm; align-items:stretch; margin-top:2.7mm; }
.qt-nre { border:0.25mm solid #b3b3b3; padding:2.6mm 3mm; display:grid; grid-template-columns:1fr auto; column-gap:5mm; align-items:end; }
.qt-nre .desc { font-size:10pt; color:#000; line-height:1.34; }
.qt-nre .meta { font-size:8.5pt; color:#666666; margin-top:.8mm; }
.qt-nre .price { font-family:'Geist Mono'; font-size:10pt; text-align:right; color:#000; white-space:nowrap; }
.qt-nre .price .small { font-size:7.8pt; color:#666666; }
.qt-total { border:0.5mm solid #000; padding:2.4mm 3mm 2.5mm; display:flex; flex-direction:column; justify-content:center; }
.qt-total .tag { margin-bottom:.9mm; }
.qt-total .line { display:flex; justify-content:space-between; gap:4mm; font-size:8.5pt; line-height:1.45; color:#666666; }
.qt-total .line span:last-child { font-family:'Geist Mono'; color:#000; white-space:nowrap; text-align:right; }
.qt-total .grand { border-top:.3mm solid #000; margin-top:1.1mm; padding-top:1.1mm; font-size:10pt; font-weight:600; color:#000; }
.qt-total .grand span:last-child { font-family:'Geist Mono'; font-size:11pt; }
.qt-terms { display:grid; grid-template-columns:1fr 1fr; gap:8mm; align-items:start; }
.qt-terms h3 { margin:0 0 1.2mm; }
.qt-terms .kv { font-size:9pt; row-gap:.65mm; }
.qt-terms .kv dt { font-size:8pt; }
.qt-list { margin:0; padding-left:4mm; font-size:9pt; line-height:1.4; }
.qt-list li { margin:0 0 .8mm; }
.qt-validity { margin-top:2.5mm; border-top:.25mm solid #e6e6e6; padding-top:1.7mm; font-size:8.7pt; color:#333333; }
.qt-milestones { display:grid; grid-template-columns:1fr 1fr 1fr; border-top:.25mm solid #e6e6e6; border-bottom:.25mm solid #e6e6e6; margin-top:2.8mm; }
.qt-milestones > div { padding:1.9mm 2.2mm 2.1mm 0; font-size:8.5pt; line-height:1.35; }
.qt-milestones > div + div { border-left:.25mm solid #e6e6e6; padding-left:2.8mm; }
.qt-milestones .n { display:block; font-family:'Geist Mono'; font-size:7.4pt; color:#666666; margin-bottom:.35mm; letter-spacing:.08em; }
.qt-tech { display:grid; grid-template-columns:112mm 1fr; gap:8mm; align-items:start; }
.qt-tech figure { padding:0; }
.qt-tech svg { display:block; max-width:100%; height:auto; }
.qt-spec-list { display:grid; grid-template-columns:1fr; }
.qt-spec-list .r { border-bottom:.2mm solid #e6e6e6; padding:0 0 .75mm; margin:0 0 .75mm; }
.qt-spec-list .lab { display:block; font-size:7.4pt; color:#666666; line-height:1.15; }
.qt-spec-list .val { display:block; font-size:8.6pt; line-height:1.25; color:#000; }
.qt-spec-list .val.m { font-family:'Geist Mono'; font-size:8.1pt; white-space:nowrap; }
.qt-note-grid { display:grid; grid-template-columns:1fr 1fr; gap:8mm; margin-top:3.1mm; }
.qt-note-grid .box { min-height:25mm; padding:2.3mm 3mm; }
.qt-note-grid p { font-size:8.8pt; line-height:1.4; margin:0; }
.qt-note-grid .tag { margin-bottom:1mm; }
.qt-release-grid { display:grid; grid-template-columns:1fr 1fr; gap:8mm; margin-top:3.1mm; }
.qt-release-grid .box { min-height:30mm; padding:2.6mm 3mm; }
.qt-release-grid p { font-size:8.8pt; line-height:1.4; margin:0; }
.qt-release-grid .tag { margin-bottom:1mm; }
.qt-accept-intro { margin:0 0 2.6mm; font-size:9pt; }
.qt-signatures { display:grid; grid-template-columns:1fr 1.34fr; gap:8mm; align-items:stretch; }
.qt-sign { border:0.25mm solid #b3b3b3; padding:2.8mm 3.1mm; min-height:49mm; }
.qt-sign .tag { margin-bottom:2.1mm; }
.qt-sign .sig-line { border-bottom:.3mm solid #000; height:8.6mm; display:flex; align-items:flex-end; padding:0 0 .8mm; font-size:8.4pt; color:#666666; }
.qt-sign .sig-line + .sig-line { margin-top:2.2mm; }
.qt-sign .sig-line .field { font-family:'Geist Mono'; font-size:7.5pt; color:#666666; }
.qt-sign .sign-meta { display:grid; grid-template-columns:1fr 1fr; gap:4mm; margin-top:2.2mm; font-size:8pt; color:#666666; }
.qt-sign .sign-meta .value { font-family:'Geist Mono'; color:#000; margin-top:.4mm; white-space:nowrap; }
.qt-sign .customer-fields { display:grid; grid-template-columns:1fr 1fr; gap:2.2mm 4mm; }
.qt-sign .customer-fields .wide { grid-column:1 / -1; }
.qt-sign .field-line { border-bottom:.3mm solid #000; height:7.4mm; display:flex; align-items:flex-end; padding-bottom:.7mm; }
.qt-sign .field-line span { font-family:'Geist Mono'; font-size:7.3pt; color:#666666; }
.qt-option { font-family:'Geist Mono'; font-size:7.3pt; letter-spacing:.05em; color:#666666; white-space:nowrap; }
</style>
"""


def quote_metadata():
    customer_address = "<br>".join(esc(x) for x in C["address"])
    quote_data = kv([
        ("Quote no.", Q["no"]),
        ("Date", Q["date"]),
        ("Valid until", Q["valid_until"] + " <span class=\"muted\">(30 days)</span>"),
        ("Reference", Q["rfq"]),
    ], mono_keys=("Quote no.", "Date", "Valid until", "Reference"))
    customer_data = kv([
        ("Customer", esc(Q["customer"])),
        ("Contact", esc(Q["contact"])),
        ("Department", esc(C["dept"])),
        ("Address", customer_address),
    ], mono_keys=())
    return (f'<div class="qt-top"><div><div class="tag">Quote details</div>{quote_data}</div>'
            f'<div><div class="tag">Customer</div>{customer_data}</div></div>')


def item_table():
    columns = [
        ("Pos", "n"),
        ("Part number / description", "t"),
        ("Spec summary", "t"),
        ("Qty", "n"),
        ("Unit price<br>(EUR)", "n"),
        ("Total<br>(EUR)", "n"),
        ("Lead time", "t"),
    ]
    rows = [
        [
            "01",
            '<span class="mono" style="white-space:nowrap">CT-CHA-C-400300-6X6</span><br><span class="small">ChArUco target, ceramic</span>',
            '<span class="mono">400 × 300 mm</span> · 15 / 11 mm<br><span class="small">18 × 24 squares · DICT_6X6_250</span>',
            str(TARGET_QTY), eur(TARGET_UNIT_PRICE), eur(TARGET_TOTAL), "6 weeks",
        ],
        [
            "02",
            '<span class="mono">SVC-X-CERT-ILAC</span><br><span class="small">Third-party laboratory certificate service</span>',
            'One certificate per board<br><span class="small">issued by third-party laboratory</span>',
            str(CERT_QTY), eur(CERT_UNIT_PRICE), eur(CERT_TOTAL), "with target",
        ],
        [
            "03",
            '<span class="mono">[Fixture part no. — to be decided]</span><br><span class="small">Mounting fixture option</span>',
            '<span class="qt-option">OPTION · NOT INCLUDED IN TOTAL</span><br><span class="small">interface subject to drawing approval</span>',
            str(FIXTURE_QTY), eur(FIXTURE_UNIT_PRICE), eur(FIXTURE_TOTAL), "with target",
        ],
    ]
    return table(columns, rows, widths=["6%", "25%", "25%", "7%", "13%", "13%", "11%"])


def nre_and_total():
    nre = (f'<div class="qt-nre"><div><div class="tag">One-time NRE</div>'
           f'<div class="desc">Custom layout, drawing approval, and test plate</div>'
           f'<div class="meta">Released after written approval of the final drawing.</div></div>'
           f'<div class="price"><span class="small">QTY&nbsp;&nbsp;&nbsp;UNIT PRICE</span><br>1&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{eur(NRE_PRICE)}</div></div>')
    total = (f'<div class="qt-total"><div class="tag">Quotation total</div>'
             f'<div class="line"><span>Items</span><span>{eur(SUBTOTAL_ITEMS)}</span></div>'
             f'<div class="line"><span>One-time NRE</span><span>{eur(NRE_PRICE)}</span></div>'
             f'<div class="line grand"><span>Total, excl. VAT</span><span>EUR {eur(QUOTE_TOTAL)}</span></div></div>')
    return f'<div class="qt-nre-total">{nre}{total}</div>'


def commercial_terms():
    left = kv([
        ("Incoterms", "DAP [named place — to be confirmed] · Incoterms 2020"),
        ("Payment", "30 days net after delivery"),
        ("Warranty", "[Warranty term — to be confirmed] months from delivery"),
        ("Lead time", "6 weeks after PO, NRE release, and written drawing approval"),
    ])
    right = ('<div class="tag" style="margin-bottom:1.15mm">Included</div>'
             '<ul class="qt-list"><li>CT-IR inspection report per board.</li>'
             '<li>Measured CSV and project pattern files.</li></ul>'
             '<div class="tag" style="margin:2.1mm 0 1.15mm">Options</div>'
             '<ul class="qt-list"><li>CT-CC certificate cover.</li>'
             '<li>Mounting fixture (Pos 03; excluded from total).</li></ul>')
    milestones = ('<div class="qt-milestones">'
                  '<div><span class="n">01 · RELEASE</span>Purchase order and NRE release.</div>'
                  '<div><span class="n">02 · APPROVE</span>Written approval of final drawing.</div>'
                  '<div><span class="n">03 · DELIVER</span>Build, inspection, and DAP dispatch.</div>'
                  '</div>')
    validity = (f'<div class="qt-validity"><strong>Validity.</strong> This quotation remains valid until '
                f'<span class="mono">{Q["valid_until"]}</span> (30 days). Prices are in EUR and exclude VAT; '
                'the mounting fixture option is excluded from the quotation total.</div>')
    return (f'<div class="qt-terms"><div><h3>Delivery &amp; payment</h3>{left}</div>'
            f'<div>{right}</div></div>{validity}{milestones}')


def technical_annex():
    # 18 rows × 24 columns of 15 mm squares = 360 × 270 mm pattern field;
    # exactly half the squares are markers: 216, within DICT_6X6_250's 250 IDs.
    board = CP.board_svg(
        400, 300, 18, 24, 15, marker=11, mx=20, my=15,
        dict_name="DICT_6X6_250", start_id=0,
        axes_spec=(8, 8, 12, 1.0), mode="print", width_mm=108,
    )
    specs = ('<div class="qt-spec-list">'
             '<div class="r"><span class="lab">Quote item</span><span class="val m">CT-CHA-C-400300-6X6</span></div>'
             '<div class="r"><span class="lab">Drawing reference</span><span class="val m">CT-DWG-CHA-C-400300</span></div>'
             '<div class="r"><span class="lab">Substrate</span><span class="val">Ceramic</span></div>'
             '<div class="r"><span class="lab">Overall size</span><span class="val m">400 × 300 mm</span></div>'
             '<div class="r"><span class="lab">Pattern field</span><span class="val m">360 × 270 mm</span></div>'
             '<div class="r"><span class="lab">Pattern layout</span><span class="val m">18 × 24 squares</span></div>'
             '<div class="r"><span class="lab">Square / marker</span><span class="val m">15 / 11 mm</span></div>'
             '<div class="r"><span class="lab">Dictionary</span><span class="val m">DICT_6X6_250</span></div>'
             '<div class="r"><span class="lab">Marker IDs</span><span class="val m">0–215 (216 markers)</span></div>'
             '</div>')
    figure = (f'<figure>{board}<figcaption>Rendering · geometry shown for quotation context; not to scale.</figcaption></figure>')
    notes = ('<div class="qt-note-grid">'
             '<div class="box"><div class="tag">ID allocation check</div>'
             '<p><span class="mono">18 × 24 / 2 = 216</span> marker positions. IDs <span class="mono">0–215</span> remain within the 250 IDs available in <span class="mono">DICT_6X6_250</span>.</p></div>'
             '<div class="box"><div class="tag">Release basis</div>'
             '<p>Final layout, label content, and the fixture interface are subject to written drawing approval. The fixture is an option and is not included in the quotation total.</p></div>'
             '</div>')
    release = ('<div class="qt-release-grid">'
               '<div class="box"><div class="tag">Technical release inputs</div>'
               '<p>Drawing approval locks the overall outline, label content, marker-ID allocation, and fixture interface if selected.</p></div>'
               '<div class="box"><div class="tag">Technical deliverables</div>'
               '<p>Each board is supplied with a CT-IR inspection report, measured CSV, and the project pattern files.</p></div>'
               '</div>')
    return f'<div class="qt-tech">{figure}<div class="qt-spec">{specs}</div></div>{notes}{release}'


def acceptance_block():
    ours = ('<div class="qt-sign"><div class="tag">Calib.Tools quotation authorisation</div>'
            '<div class="sig-line"><span class="field">Signature</span></div>'
            '<div class="sign-meta"><div>Name<div class="value">[Name]</div></div>'
            '<div>Title<div class="value">[Title — to be decided]</div></div>'
            '<div>Date<div class="value">2026-10-26</div></div>'
            '<div>Quote no.<div class="value">Q00017</div></div></div></div>')
    customer = ('<div class="qt-sign"><div class="tag">Customer acceptance · Example Robotics GmbH</div>'
                '<div class="customer-fields">'
                '<div class="field-line"><span>Name (print)</span></div>'
                '<div class="field-line"><span>Title</span></div>'
                '<div class="field-line"><span>Date</span></div>'
                '<div class="field-line"><span>PO no.</span></div>'
                '<div class="field-line wide"><span>Authorised signature</span></div>'
                '</div></div>')
    return f'<div class="qt-signatures">{ours}{customer}</div>'


def build():
    d = Doc(Q["no"], "A", Q["date"], eyebrow="Quotation", title="Quotation Q00017", sn=None)

    page1 = (
        css()
        + p('Prepared in response to <span class="mono">RFQ-ER-2026-118</span> for the configured ceramic ChArUco target project.', "qt-intro")
        + quote_metadata()
        + section(1, "Quoted items", "EUR · excl. VAT")
        + item_table()
        + section(2, "Non-recurring engineering")
        + nre_and_total()
        + section(3, "Commercial terms")
        + commercial_terms()
    )
    d.add_page(page1)

    page2 = (
        section(4, "Technical annex", "CT-DWG-CHA-C-400300")
        + technical_annex()
        + '<div class="push">'
        + section(5, "Acceptance and order release")
        + p('To accept this quotation, return this page with the customer acceptance fields completed. Purchase order details confirm quantities and delivery instructions.', "qt-accept-intro")
        + acceptance_block()
        + '</div>'
    )
    d.add_page(page2)
    return d.render(OUT)


if __name__ == "__main__":
    build()
