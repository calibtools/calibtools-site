"""CT-INV · paired sample invoices for domestic and intra-EU B2B goods supplies.

Writes A4 and Letter PDFs plus A4 PNG previews to /home/ubuntu/work/docs/out/CT-INV/.
The values use the shared sample data where available. The CT-1052 delivery date,
serial number and price reuse are declared in the assumptions returned with the task.
"""
import json
import os
import sys
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP

sys.path.insert(0, "/home/ubuntu/work/docs/system")
from ctdoc import Doc, esc, p, section, table  # noqa: E402

S = json.load(open("/home/ubuntu/work/docs/system/sample.json"))
C = S["company"]
O = S["order"]

OUT = "/home/ubuntu/work/docs/out/CT-INV"
EUR = Decimal("0.01")


@dataclass(frozen=True)
class Line:
    pos: int
    description: str
    part: str
    serials: tuple[str, ...]
    qty: Decimal
    unit_price: Decimal
    vat_rate: Decimal

    @property
    def net(self):
        return (self.qty * self.unit_price).quantize(EUR, rounding=ROUND_HALF_UP)


def money(value: Decimal) -> str:
    """EUR invoice display: period decimal separator and mono-friendly grouping."""
    return f"{value.quantize(EUR, rounding=ROUND_HALF_UP):,.2f}"


def label(english: str, german: str) -> str:
    return f'{esc(english)} <span class="de">/ {esc(german)}</span>'


def address_lines(lines) -> str:
    return "<br>".join(esc(line) for line in lines)


def party_block(role_en, role_de, name, lines, vat_id, note_text="") -> str:
    note = f'<div class="party-note">{esc(note_text)}</div>' if note_text else ""
    return (
        f'<div class="party"><div class="tag party-role">{esc(role_en)} <span class="de">/ {esc(role_de)}</span></div>'
        f'<div class="party-name">{esc(name)}</div><div class="party-address">{address_lines(lines)}</div>'
        f'<div class="party-vat">{label("VAT ID", "USt-IdNr.")} <span class="mono">{esc(vat_id)}</span></div>{note}</div>'
    )


def fact(label_en, label_de, value, mono=True) -> str:
    vcls = " mono" if mono else ""
    return f'<div class="fact"><div class="fact-label">{label(label_en, label_de)}</div><div class="fact-value{vcls}">{value}</div></div>'


def facts_block(invoice_no: str, issue_date: str, order_no: str, supply_date: str, shopify="") -> str:
    order_value = f'<span class="mono">{esc(order_no)}</span>'
    if shopify:
        order_value += f' <span class="muted">· Shopify {esc(shopify)}</span>'
    return (
        '<div class="facts">'
        + fact("Invoice no.", "Rechnungsnummer", esc(invoice_no))
        + fact("Invoice date", "Rechnungsdatum", esc(issue_date))
        + fact("Order", "Bestellung", order_value, mono=False)
        + fact("Date of supply", "Lieferdatum / Leistungsdatum", esc(supply_date))
        + "</div>"
    )


def item_cell(line: Line) -> str:
    serial = " · ".join(line.serials) if line.serials else "—"
    part = line.part or "—"
    return (
        f'<div class="item-desc">{esc(line.description)}</div>'
        f'<div class="item-meta"><span>Part no.</span> <span class="mono">{esc(part)}</span>'
        f' <span class="sep">·</span> <span>SN</span> <span class="mono">{esc(serial)}</span></div>'
    )


def line_table(lines: list[Line]) -> str:
    cols = [
        ("Pos.<br><span class=\"nu\">Position</span>", "n"),
        ("Item<br><span class=\"nu\">Artikel / SN</span>", "t"),
        ("Qty<br><span class=\"nu\">Menge</span>", "n"),
        ("Unit net<br><span class=\"nu\">(EUR)</span>", "n"),
        ("Net amount<br><span class=\"nu\">(EUR)</span>", "n"),
        ("VAT rate<br><span class=\"nu\">USt.</span>", "n"),
    ]
    rows = []
    for line in lines:
        rows.append([
            str(line.pos), item_cell(line), f"{line.qty:.0f}", money(line.unit_price),
            money(line.net), f"{line.vat_rate:.0f} %",
        ])
    return table(cols, rows, cls="invoice-lines", widths=["7%", "49%", "8%", "13%", "14%", "9%"])


def totals_block(lines: list[Line], exempt: bool = False) -> str:
    net = sum((line.net for line in lines), Decimal("0.00"))
    rate_groups: dict[Decimal, Decimal] = {}
    for line in lines:
        rate_groups[line.vat_rate] = rate_groups.get(line.vat_rate, Decimal("0.00")) + line.net
    tax_groups = {
        rate: (amount * rate / Decimal("100")).quantize(EUR, rounding=ROUND_HALF_UP)
        for rate, amount in rate_groups.items()
    }
    tax_total = sum(tax_groups.values(), Decimal("0.00"))
    gross = net + tax_total
    base_rates = " / ".join(f"{rate:.0f} %" for rate in sorted(rate_groups, reverse=True))
    rows = [
        (f"Net amount ({base_rates})", "Nettobetrag", money(net)),
    ]
    for rate in sorted(rate_groups, reverse=True):
        suffix = "tax-exempt" if exempt else f"{rate:.0f} %"
        rows.append((f"VAT {suffix}", "Umsatzsteuer", money(tax_groups[rate])))
    rows.append(("Gross total", "Rechnungsbetrag", money(gross)))
    return (
        '<div class="total-panel"><div class="total-title">Amounts <span class="de">/ Beträge</span><span class="currency">EUR</span></div>'
        + "".join(
            f'<div class="total-row{(" grand" if i == len(rows) - 1 else "")}"><span>{label(en, de)}</span><span class="mono">{value}</span></div>'
            for i, (en, de, value) in enumerate(rows)
        )
        + "</div>"
    )


def payment_block(payment: str) -> str:
    return (
        '<div class="payment-grid">'
        f'<div><div class="tag">{label("Payment status", "Zahlungsstatus")}</div><div class="payment-main">{esc(payment)}</div>'
        '<div class="payment-sub">No payment due. Please quote the invoice number for any correspondence.</div></div>'
        '<div><div class="tag">Bank details <span class="de">/ Bankverbindung</span></div>'
        f'<div class="bank mono">{esc(C["bank"]["name"])} · IBAN {esc(C["bank"]["iban"])}<br>BIC {esc(C["bank"]["bic"])} </div></div>'
        '</div>'
    )


def service_note_domestic() -> str:
    return (
        '<div class="tax-note"><div class="tag">Tax treatment <span class="de">/ Steuer</span></div>'
        '<div>Domestic supply: VAT is charged at 19 % on goods, service and shipping. '
        'All line amounts are net unless stated otherwise.</div></div>'
    )


def service_note_eu(seller_vat: str, customer_vat: str) -> str:
    return (
        '<div class="tax-note"><div class="tag">Tax treatment <span class="de">/ Steuerhinweis</span></div>'
        '<div>Tax-exempt intra-Community supply of goods <span class="de">/ steuerfreie innergemeinschaftliche Lieferung</span> '
        '(<span class="mono">§ 4 Nr. 1b, § 6a UStG</span>). No VAT charged. '
        f'Supplier VAT ID: <span class="mono">{esc(seller_vat)}</span> · Customer VAT ID: <span class="mono">{esc(customer_vat)}</span>.</div></div>'
    )


def closing_links() -> str:
    return (
        '<div class="links"><span>Returns <span class="de">/ Rückgaben</span> <span class="mono">calib.tools/returns</span></span>'
        '<span>Warranty <span class="de">/ Gewährleistung</span> <span class="mono">calib.tools/warranty</span></span></div>'
    )


def invoice_css() -> str:
    # Invoice-only component styles retain the shared design-system tokens and typography.
    return """
<style>
.de { font-size: 7.4pt; color: #666666; font-weight: 400; letter-spacing: .01em; text-transform: none; }
.facts { display:grid; grid-template-columns:1.05fr 1fr 1fr 1.35fr; gap:0; border-top:.3mm solid #000; border-bottom:.25mm solid #B3B3B3; margin:0 0 3.2mm; }
.fact { min-height:15.1mm; padding:1.55mm 2.4mm 1.7mm 0; border-right:.25mm solid #E6E6E6; }
.fact + .fact { padding-left:2.4mm; }
.fact:last-child { border-right:0; }
.fact-label { font-family:'Geist Mono'; font-size:7.2pt; line-height:1.24; color:#666666; text-transform:uppercase; letter-spacing:.045em; }
.fact-value { padding-top:1.15mm; font-size:9.5pt; line-height:1.25; color:#000; font-weight:500; }
.party-grid { display:grid; grid-template-columns:1fr 1fr; gap:8mm; margin:0 0 2.8mm; }
.party { min-height:38mm; border-top:.25mm solid #B3B3B3; padding-top:1.8mm; }
.party-role { margin-bottom:1.2mm; }
.party-name { font-weight:600; color:#000; margin-bottom:.55mm; }
.party-address { font-size:9.2pt; line-height:1.36; color:#333; min-height:14.8mm; }
.party-vat { border-top:.2mm solid #E6E6E6; margin-top:1.55mm; padding-top:1.15mm; font-size:8.7pt; color:#333; }
.party-note { font-size:7.8pt; color:#666; margin-top:1mm; line-height:1.32; }
table.invoice-lines { margin-top:0; }
table.invoice-lines td { padding-top:1.2mm; padding-bottom:1.2mm; }
table.invoice-lines td:first-child { color:#666; }
.item-desc { color:#000; font-weight:500; line-height:1.26; }
.item-meta { font-size:7.8pt; line-height:1.35; color:#666; margin-top:.7mm; }
.item-meta .mono { color:#333; font-size:7.8pt; }
.item-meta .sep { margin:0 1mm; color:#B3B3B3; }
.total-wrap { display:grid; grid-template-columns:1fr 67mm; gap:8mm; align-items:start; margin-top:3.2mm; }
.total-panel { border-top:.45mm solid #000; }
.total-title { font-family:'Geist Mono'; font-size:7.3pt; letter-spacing:.12em; text-transform:uppercase; color:#666; padding:1.35mm 1.8mm .85mm; border-bottom:.2mm solid #E6E6E6; }
.total-title .currency { float:right; font-size:7pt; letter-spacing:.05em; }
.total-row { display:grid; grid-template-columns:1fr auto; gap:4mm; padding:1.08mm 1.8mm; font-size:9pt; border-bottom:.2mm solid #E6E6E6; }
.total-row > span:last-child { font-size:9.4pt; color:#000; }
.total-row.grand { background:#F2F2F2; border-bottom:.35mm solid #000; font-weight:600; color:#000; padding-top:1.55mm; padding-bottom:1.55mm; }
.total-row.grand > span:last-child { font-size:11pt; font-weight:600; }
.tax-note { font-size:8.65pt; line-height:1.36; background:#F2F2F2; border-left:.8mm solid #000; padding:2mm 3mm; color:#333; }
.tax-note .tag { margin-bottom:.65mm; }
.payment-grid { display:grid; grid-template-columns:1fr 1fr; gap:8mm; border-top:.25mm solid #B3B3B3; padding-top:1.8mm; }
.payment-main { font-size:10pt; color:#000; font-weight:600; margin-top:.65mm; }
.payment-sub { font-size:8.1pt; color:#666; line-height:1.35; margin-top:.55mm; max-width:72mm; }
.bank { font-size:8.2pt; color:#333; line-height:1.46; margin-top:.65mm; }
.links { display:flex; justify-content:space-between; gap:8mm; border-top:.25mm solid #B3B3B3; padding-top:1.5mm; font-size:8.3pt; color:#333; }
.links .mono { font-size:8.1pt; color:#000; }
</style>
"""


def build_domestic():
    # Values from S["order"], deliberately converted to Decimal for invoice arithmetic.
    source = O["lines"]
    lines = [
        Line(source[0]["pos"], source[0]["description"], source[0]["part"],
             tuple(item["sn"] for item in source[0]["serials"]), Decimal(str(source[0]["qty"])),
             Decimal(str(source[0]["unit_price_eur"])), Decimal(str(O["vat_rate_de"]))),
        Line(source[1]["pos"], source[1]["description"], source[1]["part"],
             tuple(item["sn"] for item in source[1]["serials"]), Decimal(str(source[1]["qty"])),
             Decimal(str(source[1]["unit_price_eur"])), Decimal(str(O["vat_rate_de"]))),
        Line(3, f'Shipping — {O["carrier"]}', "—", (), Decimal("1"), Decimal(str(O["shipping_eur"])),
             Decimal(str(O["vat_rate_de"]))),
    ]
    number, date = "CT-INV-2026-0047", "2026-11-05"
    d = Doc(number, "A", date, eyebrow="Invoice", title="Invoice CT-INV-2026-0047", sn=None)
    seller = party_block("Seller", "Verkäufer", C["legal_name"], C["address"],
                         "[USt-IdNr. — to be decided]",
                         "[Invoicing entity note — to be decided with tax advisor]")
    buyer_lines = [S["customer"]["contact"] + " · " + S["customer"]["dept"]] + S["customer"]["address"]
    buyer = party_block("Bill to", "Rechnungsempfänger", S["customer"]["name"], buyer_lines, S["customer"]["vat_id"])
    content = (
        invoice_css()
        + facts_block(number, date, O["no"], O["ship_date"], O["shopify"])
        + section(1, "Parties")
        + f'<div class="party-grid">{seller}{buyer}</div>'
        + section(2, "Line items", "net prices in EUR")
        + line_table(lines)
        + '<div class="total-wrap">' + service_note_domestic() + totals_block(lines) + '</div>'
        + section(3, "Payment and terms")
        + payment_block("Paid via Shopify")
        + '<div class="push">' + closing_links() + '</div>'
    )
    d.add_page(content)
    return d.render(os.path.join(OUT, number))


def build_eu():
    # Separate order CT-1052: the product price and shipping are reused from the corresponding sample order values.
    number, date, supply_date = "CT-INV-2026-0048", "2026-11-06", "2026-11-06"
    lines = [
        Line(1, "ChArUco calibration target, ceramic, 200 × 150 mm", S["product"]["part"], ("000318",),
             Decimal("1"), Decimal(str(O["lines"][0]["unit_price_eur"])), Decimal("0")),
        Line(2, "Shipping — DHL Express", "—", (), Decimal("1"), Decimal(str(O["shipping_eur"])), Decimal("0")),
    ]
    d = Doc(number, "A", date, eyebrow="Invoice", title="Invoice CT-INV-2026-0048", sn=None)
    seller_vat = "[USt-IdNr. — to be decided]"
    seller = party_block("Seller", "Verkäufer", C["legal_name"], C["address"], seller_vat,
                         "[Invoicing entity note — to be decided with tax advisor]")
    eu = S["customer_eu"]
    buyer_lines = [eu["contact"]] + eu["address"]
    buyer = party_block("Bill to", "Rechnungsempfänger", eu["name"], buyer_lines, eu["vat_id"])
    content = (
        invoice_css()
        + facts_block(number, date, "CT-1052", supply_date)
        + section(1, "Parties")
        + f'<div class="party-grid">{seller}{buyer}</div>'
        + section(2, "Line items", "net prices in EUR")
        + line_table(lines)
        + '<div class="total-wrap">' + service_note_eu(seller_vat, eu["vat_id"]) + totals_block(lines, exempt=True) + '</div>'
        + section(3, "Payment and terms")
        + payment_block("Paid via Shopify")
        + '<div class="push">' + closing_links() + '</div>'
    )
    d.add_page(content)
    return d.render(os.path.join(OUT, number))


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    build_domestic()
    build_eu()
