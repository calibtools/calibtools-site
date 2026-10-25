"""CT-CoC-1047 · Certificate of Conformance (one-page sample).

Writes the A4 and Letter certificate plus an A4 PNG preview under out/CT-CoC/.
"""
import json
import sys

sys.path.insert(0, "/home/ubuntu/work/docs/system")
from ctdoc import Doc, esc, kv, p, qr_block, section, signature, status, table

S = json.load(open("/home/ubuntu/work/docs/system/sample.json"))
P = S["product"]
ORDER = S["order"]
CUSTOMER = S["customer"]

DOC_NO = "CT-CoC-1047"
REV = "A"
DATE = "2026-11-05"


def order_context():
    """Compact order/customer context, directly above the prescribed declaration."""
    return (
        '<div style="display:flex;gap:9mm;margin:0 0 2.6mm">'
        '<div><span class="tag" style="display:block;margin-bottom:.45mm">Order</span>'
        f'<span class="mono black">{esc(ORDER["no"])}</span></div>'
        '<div><span class="tag" style="display:block;margin-bottom:.45mm">Customer</span>'
        f'<span class="black">{esc(CUSTOMER["name"])}</span></div>'
        '</div>'
    )


def items_table():
    columns = [
        ("Part number", "m"),
        ("Serial", "m"),
        ("Lot", "m"),
        ("Inspection report no.", "m"),
        ("Result", "s"),
    ]
    rows = [
        [P["part"], "000311", S["unit"]["lot"], "CT-IR-000311", "PASS"],
        [P["part"], "000312", S["unit"]["lot"], "CT-IR-000312", "PASS"],
    ]
    return table(columns, rows, widths=["30%", "12%", "18%", "25%", "15%"])


def materials_block():
    return kv(
        [
            ("Substrate", "Ceramic plate"),
            ("Substrate lot", "[Substrate lot — to be provided]"),
            ("Supplier certificate reference", "[Supplier certificate reference — to be provided]"),
        ],
        mono_keys=("Substrate lot", "Supplier certificate reference"),
    )


def compliance_table():
    columns = [("Topic", "t"), ("Materials statement", "t")]
    rows = [
        [
            "RoHS",
            "The passive ceramic plate is likely outside the scope of Directive 2011/65/EU; applicability is to be confirmed.",
        ],
        [
            "REACH",
            "Supplier declaration reports no SVHC above 0.1 % w/w in supplied material.",
        ],
    ]
    return table(columns, rows, widths=["18%", "82%"])


def verification_block():
    return (
        '<div><div class="tag" style="margin:0 0 1mm">Verification</div>'
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:3mm">'
        + qr_block("https://calib.tools/verify/000311", 12, label="verify/000311")
        + qr_block("https://calib.tools/verify/000312", 12, label="verify/000312")
        + "</div></div>"
    )


def build():
    d = Doc(
        DOC_NO,
        REV,
        DATE,
        eyebrow="Certificate of conformance",
        title="Certificate of Conformance",
        sn=None,
    )

    declaration = (
        f"Calib.Tools declares that the items listed below were manufactured to drawing "
        f"<span class=\"mono\">{esc(P['drawing'])}</span> rev <span class=\"mono\">{esc(P['drawing_rev'])}</span>, "
        f"inspected per procedure <span class=\"mono\">CT-WI-001</span>, and conform to datasheet "
        f"<span class=\"mono\">{esc(P['datasheet'])}</span> rev <span class=\"mono\">{esc(P['datasheet_rev'])}</span>."
    )

    signed = signature(
        "[Name — to be decided]",
        "[Title — to be decided]",
        DATE,
        sig_text="[Initials]",
        stamp=("000311-312", DATE, "[Initials]"),
        note_text="Printed signature",
    )
    closing = (
        '<div class="push">'
        + section(4, "Signature and verification")
        + '<div style="display:grid;grid-template-columns:1fr 55mm;gap:7mm;align-items:end">'
        + signed
        + verification_block()
        + "</div>"
        + '<div class="note" style="margin:4mm 0 0"><span class="lab">Scope</span>'
        + "This certificate of conformance is issued by the manufacturer and is not an accredited calibration certificate."
        + "</div></div>"
    )

    body = (
        order_context()
        + p(declaration, "statement")
        + section(1, "Items")
        + items_table()
        + section(2, "Materials")
        + materials_block()
        + section(3, "Compliance")
        + compliance_table()
        + closing
    )
    d.add_page(body)
    return d.render("/home/ubuntu/work/docs/out/CT-CoC/CT-CoC-1047")


if __name__ == "__main__":
    build()
