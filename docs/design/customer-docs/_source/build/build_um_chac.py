"""CT-UM-CHA-C · ChArUco targets · ceramic · supplement.

Builds the A4 and Letter sample manuals plus an A4 preview:
  python3 /home/ubuntu/work/docs/build/build_um_chac.py
"""
import json
import sys

sys.path.insert(0, "/home/ubuntu/work/docs/system")
from ctdoc import *
import ctpattern as CP

S = json.load(open("/home/ubuntu/work/docs/system/sample.json"))
P = S["product"]

CODE = "CT-UM-CHA-C"
DATE = "2026-11-01"
OUT = "/home/ubuntu/work/docs/out/CT-UM-CHA-C/CT-UM-CHA-C"
URL = "https://calib.tools/files/CT-UM-CHA-C"


def board_rendering():
    """A compact, exact target rendering used only as an identification aid."""
    svg = CP.board_svg(
        P["W"], P["H"], P["rows"], P["cols"], P["sq"], P["marker"], P["mx"], P["my"],
        dict_name=P["dict"], start_id=P["start_id"], label=P["label_line"], label_w=P["pattern_w"],
        axes_spec=P["axes_spec"], mode="print", width_mm=91,
    )
    return f'<figure>{svg}<figcaption>Rendering · {esc(P["part"])}</figcaption></figure>'


def bullet(text):
    return f'<li>{text}</li>'


def care_list():
    return (
        '<ul class="l small">'
        + bullet('<strong>Protect edges.</strong> Technical ceramic is rigid; edges can chip under impact. Do not drop the target or place it on a hard, uneven surface.')
        + bullet('<strong>Keep hard tools away.</strong> Do not scrape, lever or probe the pattern or its edges with metal tools.')
        + bullet('<strong>Clean gently.</strong> Use isopropanol and a clean lint-free cloth. Wipe without abrasive pads, powders or pastes.')
        + '</ul>'
    )


def mounting_list():
    return (
        '<ul class="l small">'
        + bullet('<strong>No mounting holes.</strong> Do not drill, machine or modify this ceramic target.')
        + bullet('Support the target on <span class="mono">3</span> points, or use the optional fixture. The supports must sit outside the pattern area.')
        + bullet('Do not clamp across the pattern. Avoid bending stress from twisted, non-coplanar or point-loaded supports.')
        + '</ul>'
    )


def storage_list():
    return (
        '<ul class="l small">'
        + bullet('Store clean, dry and supported over its full protected area in the supplied packaging or equivalent rigid packaging.')
        + bullet('Keep the target separated from hard objects; do not stack loads on it or rest items on the pattern face.')
        + '</ul>'
    )


def temperature_block():
    example = (
        '<div class="box" style="margin-top:1.6mm;padding:1.8mm 2.3mm">'
        '<div class="tag" style="margin-bottom:.55mm">Worked example</div>'
        '<div class="mono small black">170 mm × 7 ppm/K × 5 K ≈ 6 µm</div>'
        '<div class="small">This is greater than a <span class="mono">±2 µm</span> tolerance; measure near <span class="mono">20 °C</span>.</div>'
        '</div>'
    )
    return (
        p('After transport, leave the target in the measurement environment for about <span class="mono">2 h</span> before use. Avoid direct heat, cold airflow and handling that creates a local temperature gradient.', 'small')
        + example
    )


def differences_table():
    cols = [("General manual section", "m"), ("Ceramic-specific difference", "t")]
    rows = [
        ["4 · Handling & mounting", "No holes; support on 3 points or the optional fixture. Do not clamp across the pattern; avoid bending stress."],
        ["8 · Care & storage", "Ceramic edges are brittle. No drops, hard tools or abrasives; clean with isopropanol and a lint-free cloth."],
        ["9 · Re-inspection", "If an edge is chipped, the target is dropped or bending is suspected, stop use and arrange re-inspection before precision work."],
    ]
    return table(cols, rows, widths=["34%", "66%"])


def build():
    d = Doc(
        CODE, "A", DATE,
        eyebrow="User manual",
        title="ChArUco targets · ceramic · supplement",
        sn=None,
    )

    identification = kv([
        ("Applies to", f'<span class="mono">{esc(P["part"])}</span>'),
        ("Substrate", esc(P["material_name"])),
        ("Size", f'<span class="mono">{P["W"]} × {P["H"]} × {P["t"]:.1f} mm</span>'),
        ("Pattern", f'<span class="mono">{P["rows"]} × {P["cols"]}</span> ChArUco · <span class="mono">{P["sq"]} / {P["marker"]} mm</span>'),
    ])
    top = (
        '<div style="display:grid;grid-template-columns:96mm 1fr;gap:9mm;align-items:start;margin-bottom:2.5mm">'
        f'<div>{board_rendering()}</div>'
        '<div><div class="tag" style="margin-bottom:1.2mm">Applies to</div>'
        f'{identification}'
        '<div class="note" style="margin-top:3mm;margin-bottom:0">'
        '<span class="lab">Read first</span>'
        'Read <span class="mono">CT-UM-GEN</span> before handling or using the target. This supplement states the ceramic-specific differences only.'
        '</div></div></div>'
    )

    handling = (
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8mm;align-items:start">'
        f'<div>{section(1, "Material care")}{care_list()}</div>'
        f'<div>{section(2, "Mounting")}{mounting_list()}</div>'
        '</div>'
    )
    lower = (
        '<div style="display:grid;grid-template-columns:1.12fr .88fr;gap:8mm;align-items:start">'
        f'<div>{section(3, "Temperature")}{temperature_block()}</div>'
        f'<div>{section(4, "Storage")}{storage_list()}</div>'
        '</div>'
    )
    closing = (
        '<div class="push" style="display:grid;grid-template-columns:1fr auto;gap:8mm;align-items:end;padding-top:2mm">'
        '<div>'
        + section(5, "Differences from CT-UM-GEN")
        + differences_table()
        + p('Family manuals contain only what differs from the general manual <span class="mono">CT-UM-GEN</span>.', 'small muted')
        + '</div>'
        + qr_block(URL, 15)
        + '</div>'
    )

    d.add_page(top + handling + lower + closing)
    return d.render(OUT)


if __name__ == "__main__":
    build()
