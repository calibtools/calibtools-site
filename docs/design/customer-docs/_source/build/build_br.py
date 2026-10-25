"""CT-BR · OEM batch report for lot L-2611-0390.

Builds the A4 and Letter sample PDFs plus A4 page previews.  The per-board data are
synthetic, deterministic values for layout demonstration only.
"""
import json
import sys

import numpy as np

sys.path.insert(0, "/home/ubuntu/work/docs/system")
from ctdoc import *
import ctplot as CPL

S = json.load(open("/home/ubuntu/work/docs/system/sample.json"))
P, I, O = S["product"], S["inspection"], S["oem"]

DOC_NO = "CT-BR-L-2611-0390"
REV = "A"
DATE = "2026-11-14"
LOT = O["lot"]
QR_URL = f"https://calib.tools/verify/{LOT}"


def make_boards():
    """Return 24 deterministic synthetic board results; exactly SN 000337 fails."""
    rng = np.random.default_rng(26110390)
    serials = [f"{n:06d}" for n in range(int(O["serial_first"]), int(O["serial_last"]) + 1)]
    # Values are kept inside pitch limits; flatness is capped below the limit except one rejection.
    px = np.clip(rng.normal(0.14, 0.58, len(serials)), -1.65, 1.65)
    py = np.clip(rng.normal(-0.10, 0.54, len(serials)), -1.60, 1.60)
    flat = np.clip(rng.normal(11.4, 2.15, len(serials)), 6.4, 17.6)
    fail_i = serials.index("000337")
    flat[fail_i] = 23.0
    return [
        {"sn": sn, "px": float(x), "py": float(y), "flat": float(f),
         "result": "FAIL" if f > 20.0 else "PASS"}
        for sn, x, y, f in zip(serials, px, py, flat)
    ]


BOARDS = make_boards()
ACCEPTED = [b for b in BOARDS if b["result"] == "PASS"]
REJECTED = [b for b in BOARDS if b["result"] == "FAIL"]


def fmt_signed(value, decimals=1):
    return num(value, decimals, sign=True)


def capability(values, lsl=None, usl=None):
    """Population standard deviation capability for the stated batch population."""
    a = np.asarray(values, dtype=float)
    mean = float(np.mean(a))
    std = float(np.std(a, ddof=0))
    if std == 0:
        cpk = float("inf")
    elif lsl is None:
        cpk = (usl - mean) / (3 * std)
    elif usl is None:
        cpk = (mean - lsl) / (3 * std)
    else:
        cpk = min(usl - mean, mean - lsl) / (3 * std)
    return {"n": len(a), "mean": mean, "std": std, "min": float(np.min(a)),
            "max": float(np.max(a)), "cpk": cpk}


STATS = {
    "Pitch X deviation": capability([b["px"] for b in BOARDS], -2.0, 2.0),
    "Pitch Y deviation": capability([b["py"] for b in BOARDS], -2.0, 2.0),
    "Flatness": capability([b["flat"] for b in BOARDS], None, 20.0),
}


def header_block():
    left = kv([
        ("Customer", esc(O["customer"])),
        ("PO", esc(O["po"])),
        ("Part number", esc(O["part"])),
        ("Lot", esc(O["lot"])),
    ], mono_keys=("PO", "Part number", "Lot"))
    right = kv([
        ("Quantity", f'{O["quantity"]} boards'),
        ("Serial range", f'{O["serial_first"]}–{O["serial_last"]}'),
        ("Inspection period", f'{O["inspection_from"]}–{O["inspection_to"]}'),
        ("Master board", esc(O["master_board"])),
    ], mono_keys=("Quantity", "Serial range", "Inspection period", "Master board"))
    return (f'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8mm;align-items:start;margin-bottom:3.2mm">'
            f'<div><div class="tag" style="margin-bottom:1.2mm">Customer &amp; order</div>{left}</div>'
            f'<div><div class="tag" style="margin-bottom:1.2mm">Batch</div>{right}</div></div>')


def overall_result():
    return result_box(
        "PASS",
        "All 23 released boards meet the stated limits. SN 000337 is rejected for flatness and not delivered.",
        label="Released boards",
        strip=True,
        meta="24 inspected · 23 released · 1 rejected<br>Pitch ±2 µm · flatness ≤20 µm",
    )


def summary_table():
    cols = [
        ("Serial", "m"), ("Pitch X dev<br>(µm)", "n"), ("Pitch Y dev<br>(µm)", "n"),
        ("Flatness<br>(µm)", "n"), ("Result", "s"),
    ]
    rows = [[b["sn"], fmt_signed(b["px"]), fmt_signed(b["py"]), num(b["flat"], 1), b["result"]]
            for b in BOARDS]
    return table(cols, rows, cls="dense", widths=["24%", "20%", "20%", "20%", "16%"])


def statistics_table():
    cols = [
        ("Metric", "t"), ("n", "n"), ("Mean<br>(µm)", "n"), ("Std<br>(µm)", "n"),
        ("Min<br>(µm)", "n"), ("Max<br>(µm)", "n"), ("Cpk", "n"),
    ]
    rows = []
    for name, s in STATS.items():
        mean = fmt_signed(s["mean"])
        mn = fmt_signed(s["min"])
        mx = fmt_signed(s["max"])
        rows.append([name, str(s["n"]), mean, num(s["std"], 2), mn, mx, num(s["cpk"], 2)])
    return table(cols, rows, widths=["25%", "8%", "14%", "13%", "14%", "14%", "12%"])


def control_chart():
    x = np.arange(len(BOARDS))
    labels = [b["sn"][-3:] for b in BOARDS]
    fig, ax = CPL.figure(178, 64)
    ax.plot(x, [b["px"] for b in BOARDS], color=CPL.BLACK, marker="o", markersize=2.5,
            label="Pitch X")
    ax.plot(x, [b["py"] for b in BOARDS], color=CPL.G60, marker="o", markersize=2.5,
            label="Pitch Y")
    CPL.limit(ax, 2.0, "+2 µm")
    CPL.limit(ax, -2.0, "−2 µm")
    ax.axhline(0, color=CPL.G30, lw=0.5)
    ax.set_xlim(-0.5, len(BOARDS) - 0.5)
    ax.set_ylim(-2.4, 2.4)
    ax.set_ylabel("Deviation (µm)")
    ax.set_xlabel("Serial number (last three digits)")
    ax.set_xticks(x[::2])
    ax.set_xticklabels(labels[::2], fontfamily="Geist Mono")
    ax.legend(loc="upper left", ncol=2, handlelength=2.2, columnspacing=1.6)
    fig.subplots_adjust(left=0.075, right=0.965, bottom=0.22, top=0.92)
    return CPL.svg(fig)


def master_table():
    cols = [
        ("Feature", "t"), ("Reference<br>(µm)", "n"), ("Before batch<br>(µm)", "n"),
        ("After batch<br>(µm)", "n"), ("Max difference<br>(µm)", "n"), ("U (k=2)<br>(µm)", "n"),
        ("Result", "s"),
    ]
    rows = [
        ["Pitch X deviation", "0.0", "+0.2", "+0.3", "0.3", "1.5", "PASS"],
        ["Pitch Y deviation", "0.0", "−0.2", "−0.1", "0.2", "1.5", "PASS"],
        ["Flatness", "9.5", "9.7", "9.6", "0.2", "1.5", "PASS"],
    ]
    return table(cols, rows, widths=["23%", "13%", "15%", "15%", "15%", "10%", "9%"])


def batch_stamp_svg(lot, date, initials, d_mm=32.0, rotate=-6):
    """Inspection-stamp geometry adapted cleanly for a lot identifier instead of a serial."""
    ink = G80
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" style="width:calc({d_mm}mm * var(--cs,1));height:calc({d_mm}mm * var(--cs,1));display:block">
<defs><path id="arcT" d="M 44 160 A 116 116 0 0 1 276 160"/><path id="arcB" d="M 30 160 A 130 130 0 0 0 290 160"/></defs>
<g transform="rotate({rotate} 160 160)" fill="{ink}" stroke="none">
 <circle cx="160" cy="160" r="156" fill="none" stroke="{ink}" stroke-width="6"/><circle cx="160" cy="160" r="113" fill="none" stroke="{ink}" stroke-width="2.5"/>
 <text font-family="Geist" font-weight="900" font-size="27" letter-spacing="3.2" text-anchor="middle"><textPath href="#arcT" startOffset="50%">CALIB.TOOLS</textPath></text>
 <text font-family="Geist Mono" font-weight="500" font-size="17.5" letter-spacing="2.2" text-anchor="middle"><textPath href="#arcB" startOffset="50%">DIMENSIONAL INSPECTION</textPath></text>
 <rect x="20.5" y="153.5" width="13" height="13"/><rect x="286.5" y="153.5" width="13" height="13"/>
 <line x1="88" y1="132" x2="232" y2="132" stroke="{ink}" stroke-width="2"/>
 <text x="160" y="120" font-family="Geist Mono" font-weight="500" font-size="16" text-anchor="middle" letter-spacing="0.8">LOT {esc(lot)}</text>
 <text x="160" y="172.5" font-family="Geist Pixel" font-size="32" text-anchor="middle" letter-spacing="0.6" stroke="{ink}" stroke-width="1.1" stroke-linejoin="miter">INSPECTED</text>
 <line x1="88" y1="186" x2="232" y2="186" stroke="{ink}" stroke-width="2"/>
 <text x="160" y="211" font-family="Geist Mono" font-weight="500" font-size="17" text-anchor="middle" letter-spacing="0.5">{esc(date)}</text>
 <text x="160" y="234" font-family="Geist Mono" font-weight="700" font-size="17" text-anchor="middle" letter-spacing="2">{esc(initials)}</text>
</g></svg>'''


def batch_signature():
    return (f'<div class="sig"><div class="who"><div class="tag">Signed</div><div class="line">JG</div>'
            f'<div class="lab">JG · Inspector · <span class="mono">{DATE}</span><br>Printed signature</div></div>'
            f'<div class="stamp">{batch_stamp_svg(LOT, DATE, "JG")}</div></div>')


def build():
    d = Doc(DOC_NO, REV, DATE, eyebrow="Batch report",
            title="Lot L-2611-0390 · 24 ChArUco targets", sn=None)

    cap_note = ("Cpk is calculated over all 24 inspected boards using population standard deviation. Pitch uses two-sided limits "
                "(±2 µm); flatness uses the upper limit only (≤20 µm).")
    page1 = (
        header_block() + overall_result() +
        section(1, "Board summary", "deviations in µm") +
        summary_table() +
        note("Pitch X and Pitch Y limits are ±2 µm. Flatness upper limit is 20 µm; values are measured at 25 points per board.",
             label="Limits & method") +
        section(2, "Batch statistics", "all inspected boards") + statistics_table() + p(cap_note, "small muted")
    )
    d.add_page(page1)

    master_note = ("Measurements of S1b master board SN 000300 before and after the batch remain within U = 1.5 µm (k = 2) "
                   "of the reference values.")
    rejection = ("<span class=\"mono\">000337</span> — flatness <span class=\"mono\">23.0 µm</span>; "
                 "upper limit <span class=\"mono\">20.0 µm</span>. Board rejected.")
    statement = ("The batch identified above was inspected against the stated pitch and flatness limits. "
                 "Twenty-three boards met the applicable limits; SN 000337 was rejected for flatness above the upper limit.")
    boundary = "This batch report is issued by the manufacturer and is not an accredited calibration certificate."
    closing = (f'<div class="push" style="display:flex;justify-content:space-between;align-items:flex-end">'
               f'{batch_signature()}{qr_block(QR_URL, 15, "calib.tools/verify/L-2611-0390")}</div>')
    page2 = (
        section(3, "Pitch control chart", "tolerance ±2 µm") + f'<figure>{control_chart()}<figcaption>Pitch X shown in black; Pitch Y shown in grey. Dashed lines denote the two-sided pitch tolerance.</figcaption></figure>' +
        section(4, "Master comparison", "S1b · SN 000300") + master_table() + p(master_note, "small muted") +
        section(5, "Nonconforming board") + note(rejection, label="Rejected") +
        section(6, "Statement") + p(statement, "statement") + p(boundary, "small muted") +
        closing
    )
    d.add_page(page2)
    return d.render("/home/ubuntu/work/docs/out/CT-BR/CT-BR-L-2611-0390")


if __name__ == "__main__":
    build()
