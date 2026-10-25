"""CT-DN · Delivery note (1 page).

Builds the sample delivery note for order CT-1047 in the shared Calib.Tools
customer-document family. Run: python3 build_dn.py
"""
import json
import sys

sys.path.insert(0, "/home/ubuntu/work/docs/system")
from ctdoc import Doc, checkbox, esc, kv, p, section, table

S = json.load(open("/home/ubuntu/work/docs/system/sample.json"))
COMPANY = S["company"]
CUSTOMER = S["customer"]
ORDER = S["order"]


def address(lines):
    """Address lines are escaped independently to preserve intended breaks."""
    return "<br>".join(esc(line) for line in lines)


def party_block(label, name, lines, extra=""):
    extra_html = f'<div class="small muted" style="margin-top:1.1mm">{extra}</div>' if extra else ""
    return (f'<div><div class="tag" style="margin-bottom:1.1mm">{esc(label)}</div>'
            f'<div class="black" style="font-weight:600">{esc(name)}</div>'
            f'<div class="small" style="line-height:1.38">{address(lines)}</div>{extra_html}</div>')


def shipment_block():
    seller_extra = f'VAT ID · <span class="mono">{esc(COMPANY["vat_id"])}</span>'
    recipient_extra = f'{esc(CUSTOMER["contact"])} · {esc(CUSTOMER["dept"])}'
    parties = (f'<div style="display:grid;grid-template-columns:1fr 1fr;gap:13mm;align-items:start">'
               f'{party_block("Shipper", COMPANY["legal_name"], COMPANY["address"], seller_extra)}'
               f'{party_block("Consignee", CUSTOMER["name"], CUSTOMER["address"], recipient_extra)}'
               f'</div>')
    cells = [
        ("Order no.", ORDER["no"]),
        ("Shopify order", ORDER["shopify"]),
        ("Dispatch date", ORDER["ship_date"]),
        ("Carrier / tracking", f'{ORDER["carrier"]}<br><span class="mono">{ORDER["tracking"]}</span>'),
    ]
    order_meta = "".join(
        f'<div><div class="tag" style="margin-bottom:.7mm">{esc(label)}</div>'
        f'<div class="mono black" style="font-size:9pt;line-height:1.28">{value}</div></div>'
        for label, value in cells
    )
    return parties + f'<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4mm;border-top:.25mm solid #E6E6E6;margin-top:3.2mm;padding-top:2.3mm">{order_meta}</div>'


def item_rows():
    rows = []
    for line in ORDER["lines"]:
        serials = line.get("serials", [])
        if len(serials) > 1:
            serial_text = "<span class=\"muted\">%d boards</span>" % len(serials)
            properties = "Multi-board set"
        else:
            serial_text = esc(serials[0].get("sn", "—")) if serials else "—"
            properties = "Service"
        rows.append([
            str(line["pos"]),
            esc(line["part"]),
            esc(line["description"]),
            serial_text,
            str(line["qty"]),
            properties,
            esc(line["hs"]),
            esc(line["origin"]),
        ])
        # A multi-board order has one explicit sub-row per board so its marker ID
        # allocation is readable at receipt without looking up the inspection files.
        if len(serials) > 1:
            for idx, board in enumerate(serials, 1):
                props = (f'<span class="mono">start_id {esc(board["start_id"])}</span><br>'
                         f'<span class="mono">id_range {esc(board["id_range"])}</span>')
                rows.append([
                    f'{line["pos"]}.{idx}',
                    "—",
                    f'<span class="muted">Board {idx} of {len(serials)}</span>',
                    esc(board["sn"]),
                    "—",
                    props,
                    "—",
                    "—",
                ])
        elif serials:
            # Keep the third-party service tied to the applicable unit on the note.
            rows[-1][5] = f'For SN <span class="mono">{esc(serials[0]["sn"])}</span><br><span class="muted">may follow separately</span>'
    return rows


def items_table():
    columns = [
        ("Pos", "m"),
        ("Part number", "m"),
        ("Description", "t"),
        ("Serial(s)", "m"),
        ("Qty", "n"),
        ("Line properties", "t"),
        ("HS code", "m"),
        ("Origin", "t"),
    ]
    return table(columns, item_rows(), cls="dense", widths=["5%", "16%", "23%", "10%", "5%", "18%", "9%", "14%"])


def package_block():
    package = ORDER["package"]
    return kv([
        ("Packages", f'<span class="mono">{package["packages"]}</span>'),
        ("Weight", f'<span class="mono">{package["weight_kg"]:.1f} kg</span>'),
        ("Dimensions", f'<span class="mono">{esc(package["dimensions_cm"])} cm</span>'),
    ])


def enclosed_documents():
    checks = (checkbox(True, "IR") + checkbox(True, "DS") + checkbox(True, "UM") +
              checkbox(True, "CoC") + checkbox(False, "CC"))
    return (f'<div style="line-height:1.6">{checks}</div>'
            f'<div class="small muted" style="margin-top:1mm">CC — third-party certificate may follow separately after dispatch.</div>')


def closing_block():
    return (f'<div class="push">'
            f'<div style="border-top:.35mm solid #000;padding-top:2.5mm;display:grid;grid-template-columns:1fr 1fr;gap:13mm;align-items:end">'
            f'<div><div class="tag" style="margin-bottom:1mm">Receipt</div>'
            f'<div style="height:9mm;border-bottom:.3mm solid #000"></div>'
            f'<div class="small muted" style="margin-top:1mm">Receiver signature · printed name · date</div></div>'
            f'<div><div class="tag" style="margin-bottom:1mm">Returns</div>'
            f'<div class="small" style="line-height:1.38"><span class="black">Return address</span><br>{address(COMPANY["returns_address"])}'
            f'<br><span class="black">30-day returns — see calib.tools/returns</span></div></div>'
            f'</div></div>')


def build():
    d = Doc("CT-DN-1047", "A", "2026-11-05", eyebrow="Delivery note", title="Order CT-1047", sn=None)
    body = (section(1, "Shipment") + shipment_block()
            + section(2, "Delivered items") + items_table()
            + section(3, "Package") + package_block()
            + section(4, "Enclosed documents") + enclosed_documents()
            + closing_block())
    d.add_page(body)
    return d.render("/home/ubuntu/work/docs/out/CT-DN/CT-DN-1047")


if __name__ == "__main__":
    build()
