"""Calib.Tools customer-document system.

One module for every customer file (CT-IR, CT-DS, CT-UM, ...). Implements section 1 of
"Kundendokumente / 客户交付文件内容规范 v1" on top of the brand guidelines v1.0.

Usage
-----
    import sys; sys.path.insert(0, "/home/ubuntu/work/docs/system")
    from ctdoc import *
    d = Doc("CT-IR-000311", "A", "2026-11-04", eyebrow="Inspection report",
            title="ChArUco target, ceramic, 200 × 150 mm", sn="000311")
    d.add_page(section(1, "Method") + p("..."))
    d.render("/home/ubuntu/work/docs/out/CT-IR/CT-IR-000311")   # -> .pdf (A4), -letter.pdf, previews

render() lays every page out on A4 *and* US Letter and reports any page whose content overflows
its body area; a document is only finished when both papers report no overflow.
"""
import os, re, html as _html, json, math
import segno

SYS = os.path.dirname(os.path.abspath(__file__))
KIT = "/home/ubuntu/work/brandkit/calibtools-brand-kit"
FONTS = f"{KIT}/07-fonts/woff2"
PIXEL_FONT = f"{SYS}/fonts/GeistPixel-Square.ttf"
WORDMARK_SVG = f"{KIT}/01-logos/wordmark-framed/calibtools-wordmark-framed-positive.svg"

# brand colours (brand guidelines p. 05)
BLACK, WHITE, RED = "#000000", "#FFFFFF", "#E60012"
G80, G60, G30, G10, G05 = "#333333", "#666666", "#B3B3B3", "#E6E6E6", "#F2F2F2"
AXIS_GREEN = "#00A651"          # Y-axis arrow, identical to the arrow printed on the boards

PAPER = {"A4": (210.0, 297.0), "Letter": (215.9, 279.4)}
CONTENT_W = 178.0                # mm, identical on both papers (centred)
HDR_TOP, BODY_TOP, BODY_BOTTOM, FTR_BOTTOM = 10.0, 21.0, 16.0, 8.0   # mm from page edges

CONTACT = "Calib.Tools · Munich, Germany · hello@calib.tools"


def esc(s):
    return _html.escape(str(s), quote=True)


# --------------------------------------------------------------------------- CSS
def _font_css():
    faces = [("Geist", "Geist-Regular", 400), ("Geist", "Geist-Medium", 500), ("Geist", "Geist-SemiBold", 600),
             ("Geist", "Geist-Bold", 700), ("Geist", "Geist-Black", 900), ("Geist Mono", "GeistMono-Regular", 400),
             ("Geist Mono", "GeistMono-Medium", 500), ("Geist Mono", "GeistMono-Bold", 700)]
    css = "".join(f"@font-face{{font-family:'{f}';src:url('file://{FONTS}/{n}.woff2') format('woff2');font-weight:{w};}}"
                  for f, n, w in faces)
    return css + f"@font-face{{font-family:'Geist Pixel';src:url('file://{PIXEL_FONT}') format('truetype');}}"


A4_BODY_H = PAPER["A4"][1] - BODY_TOP - BODY_BOTTOM          # 260 mm
LETTER_ZOOM = (PAPER["Letter"][1] - BODY_TOP - BODY_BOTTOM) / A4_BODY_H   # 0.9323


def base_css(paper):
    """Letter: the A4 body (260 mm high) is laid out at LETTER_ZOOM with a widened measure so it stays 178 mm wide;
    stamp and QR are counter-scaled (var --cs) so they keep their specified physical size."""
    W, H = PAPER[paper]
    side = (W - CONTENT_W) / 2
    z = 1.0 if paper == "A4" else LETTER_ZOOM
    zin = (f".zin {{ width: 100%; height: 100%; display: flex; flex-direction: column; }}" if z == 1.0 else
           f".zin {{ zoom: {z:.5f}; width: {CONTENT_W / z:.3f}mm; height: {A4_BODY_H:.3f}mm; display: flex; flex-direction: column; }}")
    return _font_css() + f"""
:root {{ --cs: {1 / z:.5f}; }}
{zin}
.zin > .push {{ margin-top: auto; }}
@page {{ size: {W}mm {H}mm; margin: 0; }}
* {{ box-sizing: border-box; }}
html, body {{ margin: 0; padding: 0; }}
body {{ font-family: 'Geist'; font-size: 10pt; line-height: 1.45; color: {G80}; -webkit-print-color-adjust: exact; print-color-adjust: exact;
        font-variant-numeric: tabular-nums; }}
.page {{ width: {W}mm; height: {H}mm; position: relative; overflow: hidden; page-break-after: always; break-after: page; background: #fff; }}
.page:last-child {{ page-break-after: auto; break-after: auto; }}
.hdr {{ position: absolute; top: {HDR_TOP}mm; left: {side}mm; right: {side}mm; height: 6.6mm; display: flex; justify-content: space-between; align-items: center; }}
.hdr img {{ width: 28mm; height: auto; display: block; }}
.hdr .id {{ font-family: 'Geist Mono'; font-size: 8pt; color: {BLACK}; letter-spacing: .01em; }}
.body {{ position: absolute; top: {BODY_TOP}mm; bottom: {BODY_BOTTOM}mm; left: {side}mm; right: {side}mm; overflow: hidden; }}
.ftr {{ position: absolute; bottom: {FTR_BOTTOM}mm; left: {side}mm; right: {side}mm; border-top: 0.25mm solid {G10}; padding-top: 1.6mm;
        font-size: 8pt; line-height: 1.2; color: {G60}; display: flex; justify-content: space-between; }}
.ftr .pg {{ font-family: 'Geist Mono'; }}
.wm {{ position: absolute; left: 0; right: 0; top: 50%; text-align: center; transform: translateY(-50%) rotate(-35deg); font-family: 'Geist'; font-weight: 700;
       font-size: 118pt; letter-spacing: .12em; color: rgba(0,0,0,0.055); pointer-events: none; z-index: 20; white-space: nowrap; }}

/* type */
.eyebrow {{ font-family: 'Geist Mono'; font-size: 8pt; letter-spacing: .16em; text-transform: uppercase; color: {G60}; margin: 3mm 0 1.2mm; }}
h1 {{ font-weight: 700; font-size: 21pt; line-height: 1.15; color: {BLACK}; margin: 0 0 1.5mm; white-space: nowrap; letter-spacing: -.005em; }}
.sub {{ font-size: 10pt; color: {G60}; margin: 0 0 4mm; }}
h2.sec {{ font-weight: 600; font-size: 11pt; line-height: 1.25; color: {BLACK}; margin: 3.6mm 0 1.6mm; padding-top: 1.3mm; border-top: 0.35mm solid {BLACK};
          display: flex; align-items: baseline; gap: 2.6mm; break-after: avoid; }}
h2.sec .n {{ font-family: 'Geist Mono'; font-weight: 400; font-size: 8.5pt; color: {G60}; min-width: 4mm; }}
h2.sec .aside {{ margin-left: auto; font-family: 'Geist Mono'; font-weight: 400; font-size: 7.5pt; color: {G60}; letter-spacing: .04em; }}
h3 {{ font-weight: 600; font-size: 10pt; color: {BLACK}; margin: 3mm 0 1mm; }}
p {{ margin: 0 0 2mm; }}
p.small, .small {{ font-size: 8.5pt; line-height: 1.4; }}
.muted {{ color: {G60}; }}
.mono {{ font-family: 'Geist Mono'; }}
.black {{ color: {BLACK}; }}
b, strong {{ font-weight: 600; color: {BLACK}; }}
ul.l, ol.l {{ margin: 0 0 2mm; padding-left: 4.5mm; }}
ul.l li, ol.l li {{ margin: 0 0 0.8mm; }}
ul.l {{ list-style: none; padding-left: 4mm; }}
ul.l li {{ position: relative; }}
ul.l li::before {{ content: ''; position: absolute; left: -3.6mm; top: 0.62em; width: 1.3mm; height: 1.3mm; background: {BLACK}; }}
a {{ color: inherit; text-decoration: none; }}

/* key-value blocks */
.kv {{ display: grid; grid-template-columns: max-content 1fr; column-gap: 4mm; row-gap: 0.45mm; font-size: 9.5pt; line-height: 1.32; margin: 0; }}
.kv dt {{ color: {G60}; font-size: 8.5pt; padding-top: 0.25mm; white-space: nowrap; }}
.kv dd {{ margin: 0; color: {BLACK}; }}
.kv dd.m {{ font-family: 'Geist Mono'; font-size: 9pt; }}
.cols {{ display: grid; gap: 7mm; }}

/* tables */
table.t {{ width: 100%; border-collapse: collapse; font-size: 9.5pt; line-height: 1.3; }}
table.t th {{ font-family: 'Geist Mono'; font-size: 7.3pt; font-weight: 500; color: {G60}; text-transform: uppercase; letter-spacing: .05em; text-align: left;
              padding: 0.8mm 1.8mm 0.9mm; border-bottom: 0.3mm solid {BLACK}; vertical-align: bottom; line-height: 1.2; }}
table.t td {{ padding: 0.8mm 1.8mm; vertical-align: top; color: {BLACK}; }}
table.t tbody tr:nth-child(even) td {{ background: {G10}; }}
table.t.plain tbody tr:nth-child(even) td {{ background: none; }}
.nu {{ text-transform: none; letter-spacing: 0; }}
table.t.rawhead th {{ text-transform: none; letter-spacing: 0; font-size: 7.5pt; }}
table.t.plain tbody td {{ border-bottom: 0.2mm solid {G10}; }}
table.t td.n, table.t th.n {{ text-align: right; }}
table.t td.n, table.t td.m {{ font-family: 'Geist Mono'; font-size: 9.5pt; white-space: nowrap; }}
table.t td.c, table.t th.c {{ text-align: center; }}
table.t tfoot td {{ border-top: 0.3mm solid {BLACK}; font-weight: 600; }}
table.t.dense {{ font-size: 8pt; line-height: 1.2; }} table.t.dense td {{ padding: 0.35mm 1.6mm; }} table.t.dense td.n, table.t.dense td.m {{ font-size: 8pt; }}
.unit {{ color: {G60}; }}

/* status words: PASS · FAIL · PENDING · N/A (never red) */
.st {{ font-family: 'Geist Mono'; font-size: 9pt; letter-spacing: .05em; white-space: nowrap; color: {BLACK}; }}
.st.fail {{ font-weight: 700; }}
.st.pending, .st.na {{ color: {G60}; }}
.st svg {{ width: 2.5mm; height: 2.5mm; vertical-align: -0.35mm; margin-right: 1mm; }}

/* overall result */
.result {{ border: 0.5mm solid {BLACK}; padding: 2.6mm 3.6mm 3mm; }}
.result .lab {{ font-family: 'Geist Mono'; font-size: 7.5pt; letter-spacing: .16em; text-transform: uppercase; color: {G60}; }}
.result .word {{ font-family: 'Geist Mono'; font-weight: 700; font-size: 24pt; line-height: 1.1; letter-spacing: .06em; color: {BLACK}; margin: 0.8mm 0 1mm; }}
.result .word svg {{ width: 6mm; height: 6mm; margin-right: 2mm; vertical-align: -0.4mm; }}
.result .txt {{ font-size: 9pt; line-height: 1.35; color: {BLACK}; }}
.result.strip {{ display: grid; grid-template-columns: 46mm 1fr auto; align-items: center; column-gap: 5mm; padding: 2mm 4mm; }}
.result.strip .word {{ margin: 0.3mm 0 0; font-size: 21pt; }}
.result.strip .txt {{ font-size: 10pt; }}
.result .meta {{ font-family: 'Geist Mono'; font-size: 7.5pt; color: {G60}; text-align: right; line-height: 1.5; }}
.result.fail .meta {{ color: {G30}; }}
.result.fail {{ background: {BLACK}; }} .result.fail .lab {{ color: {G30}; }} .result.fail .word, .result.fail .txt {{ color: #fff; }}
.result.pending {{ border-style: dashed; border-color: {G60}; }} .result.pending .word {{ color: {G60}; }}

/* misc blocks */
.note {{ border-left: 0.8mm solid {BLACK}; background: {G05}; padding: 2mm 3mm; font-size: 9pt; line-height: 1.4; margin: 1mm 0 2.5mm; color: {BLACK}; }}
.note .lab {{ font-family: 'Geist Mono'; font-size: 7.3pt; letter-spacing: .14em; text-transform: uppercase; color: {G60}; display: block; margin-bottom: .6mm; }}
pre.code {{ font-family: 'Geist Mono'; font-size: 8pt; line-height: 1.45; background: {G05}; border-left: 0.8mm solid {G30}; padding: 2mm 3mm; margin: 1mm 0 2.5mm;
            white-space: pre; overflow: hidden; color: {BLACK}; }}
pre.code .c {{ color: {G60}; }}
figure {{ margin: 0; }}
figcaption, .cap {{ font-family: 'Geist Mono'; font-size: 7.3pt; color: {G60}; margin-top: 1.2mm; line-height: 1.4; }}
.statement {{ font-size: 9.5pt; line-height: 1.45; color: {BLACK}; }}
.box {{ border: 0.25mm solid {G30}; padding: 2.5mm 3mm; }}
.tag {{ font-family: 'Geist Mono'; font-size: 7.3pt; letter-spacing: .12em; text-transform: uppercase; color: {G60}; }}
.check {{ display: inline-block; width: 3mm; height: 3mm; border: 0.3mm solid {BLACK}; vertical-align: -0.5mm; margin-right: 1.2mm; position: relative; }}
.check.on::after {{ content: ''; position: absolute; left: 0.55mm; top: 0.55mm; right: 0.55mm; bottom: 0.55mm; background: {BLACK}; }}
.qr {{ display: flex; flex-direction: column; align-items: flex-start; }}
.qr .u {{ font-family: 'Geist Mono'; font-size: 7pt; color: {G60}; margin-top: 1mm; white-space: nowrap; }}
.sig {{ display: flex; align-items: center; }}
.sig .who {{ width: 72mm; }}
.sig .line {{ border-bottom: 0.3mm solid {BLACK}; height: 9mm; display: flex; align-items: flex-end; padding: 0 0 0.8mm 0; font-family: 'Geist Mono'; font-size: 10pt; color: {BLACK}; }}
.sig .lab {{ font-size: 8pt; color: {G60}; margin-top: 1mm; line-height: 1.35; }}
.sig .stamp {{ margin-left: -2.5mm; margin-top: 5mm; }}
.qr .u {{ font-size: calc(7pt * var(--cs,1)); }}
.spacer {{ flex: 0 0 auto; }}
/* 1:1 physical size (print sheets, scale bars): cancels the Letter zoom */
.true-scale {{ zoom: var(--cs); }}
"""


# --------------------------------------------------------------------------- small HTML helpers
_X = (f'<svg viewBox="0 0 10 10"><rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" stroke-width="1.2"/>'
      f'<path d="M2.6 2.6L7.4 7.4M7.4 2.6L2.6 7.4" stroke="currentColor" stroke-width="1.4"/></svg>')


def status(word):
    """PASS · FAIL · PENDING · N/A as a Mono status word. FAIL is bold with a crossed-box symbol (never red)."""
    w = word.upper().strip()
    cls = {"PASS": "pass", "FAIL": "fail", "PENDING": "pending", "N/A": "na"}.get(w, "pass")
    sym = _X if w == "FAIL" else ""
    return f'<span class="st {cls}">{sym}{esc(w)}</span>'


def result_box(word, text, label="Overall result", strip=False, meta=""):
    """Overall result. strip=True gives a full-width horizontal bar (label+word | sentence | meta)."""
    w = word.upper()
    cls = {"PASS": "pass", "FAIL": "fail", "PENDING": "pending"}.get(w, "pass")
    sym = _X.replace('currentColor', '#fff') if w == "FAIL" else ""
    if strip:
        return (f'<div class="result strip {cls}"><div><div class="lab">{esc(label)}</div><div class="word">{sym}{esc(w)}</div></div>'
                f'<div class="txt">{text}</div><div class="meta">{meta}</div></div>')
    return (f'<div class="result {cls}"><div class="lab">{esc(label)}</div><div class="word">{sym}{esc(w)}</div>'
            f'<div class="txt">{text}</div></div>')


def section(n, title, aside=""):
    num = f'<span class="n">{esc(n)}</span>' if n not in (None, "") else ""
    a = f'<span class="aside">{aside}</span>' if aside else ""
    return f'<h2 class="sec">{num}<span>{esc(title)}</span>{a}</h2>'


def p(text, cls=""):
    return f'<p class="{cls}">{text}</p>'


def kv(pairs, mono_keys=(), cols=None, style=""):
    """pairs: list of (label, value). Values whose label is in mono_keys (or value starts with '§') are set in Geist Mono.
    Values are inserted as HTML (escape yourself when needed)."""
    out = []
    for k, v in pairs:
        m = k in mono_keys
        out.append(f'<dt>{esc(k)}</dt><dd class="{"m" if m else ""}">{v}</dd>')
    return f'<dl class="kv" style="{style}">{"".join(out)}</dl>'


def table(columns, rows, cls="", foot=None, widths=None, style=""):
    """columns: list of (header, kind) with kind in {'t' text, 'm' mono-left, 'n' numeric-right (mono), 'c' centred, 's' status}
    rows: list of lists (cells are HTML strings; 's' columns may be plain status words)."""
    cg = ""
    if widths:
        cg = "<colgroup>" + "".join(f'<col style="width:{w}">' for w in widths) + "</colgroup>"
    # units in parentheses keep their case (mm, µm) - uppercase transform would turn µ into Greek capital Mu
    th = "".join(f'<th class="{"n" if k == "n" else ("c" if k == "c" else "")}">{re.sub(r"(\([^)]*\))", r'<span class="nu">\1</span>', h)}</th>'
                 for h, k in columns)
    body = []
    for r in rows:
        tds = []
        for (h, k), v in zip(columns, r):
            if k == "s":
                v = status(v) if isinstance(v, str) and v.upper() in ("PASS", "FAIL", "PENDING", "N/A") else v
                tds.append(f'<td>{v}</td>')
            else:
                tds.append(f'<td class="{k if k in ("n", "m", "c") else ""}">{v}</td>')
        body.append("<tr>" + "".join(tds) + "</tr>")
    tf = ""
    if foot:
        tf = "<tfoot><tr>" + "".join(f'<td class="{"n" if k == "n" else ""}">{v}</td>' for (h, k), v in zip(columns, foot)) + "</tr></tfoot>"
    return f'<table class="t {cls}" style="{style}">{cg}<thead><tr>{th}</tr></thead><tbody>{"".join(body)}</tbody>{tf}</table>'


def note(text, label="Note"):
    return f'<div class="note"><span class="lab">{esc(label)}</span>{text}</div>'


def code(text):
    """Code block; lines starting with '#' or '//' are set as comments."""
    lines = []
    for ln in text.strip("\n").split("\n"):
        e = esc(ln)
        if ln.lstrip().startswith(("#", "//")):
            e = f'<span class="c">{e}</span>'
        lines.append(e)
    return f'<pre class="code">{chr(10).join(lines)}</pre>'


def checkbox(on, label):
    return f'<span style="white-space:nowrap;margin-right:4mm"><span class="check {"on" if on else ""}"></span>{esc(label)}</span>'


def num(v, nd=None, sign=False, unit=""):
    """Format a number with a true minus sign (U+2212). sign=True forces '+'."""
    if v is None:
        return "—"
    if nd is not None and isinstance(v, (int, float)) and round(v, nd) == 0:
        v = 0.0                      # no negative zero; zero is printed unsigned ("0.0")
        sign = False
    s = f"{v:+.{nd}f}" if sign and nd is not None else (f"{v:.{nd}f}" if nd is not None else str(v))
    s = s.replace("-", "−")
    return s + (f" {unit}" if unit else "")


# --------------------------------------------------------------------------- QR code
def qr_svg(url, size_mm=14.0, border=1):
    """QR code as inline SVG. Spec: >= 12 x 12 mm, quiet zone of 1 module (page white space adds more)."""
    q = segno.make(url, error="m", micro=False)
    m = [list(r) for r in q.matrix]
    n = len(m) + 2 * border
    d = []
    for y, row in enumerate(m):
        x = 0
        while x < len(row):
            if row[x]:
                x0 = x
                while x < len(row) and row[x]:
                    x += 1
                d.append(f"M{x0 + border} {y + border}h{x - x0}v1h{x0 - x}z")
            else:
                x += 1
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {n} {n}" style="width:calc({size_mm}mm * var(--cs,1));height:calc({size_mm}mm * var(--cs,1))" shape-rendering="crispEdges">'
            f'<rect width="{n}" height="{n}" fill="#fff"/><path d="{"".join(d)}" fill="#000"/></svg>')


def qr_block(url, size_mm=14.0, label=None):
    shown = label if label is not None else url.replace("https://", "")
    return f'<div class="qr">{qr_svg(url, size_mm)}<div class="u">{esc(shown)}</div></div>'


# --------------------------------------------------------------------------- inspection stamp
def stamp_svg(sn, date, initials, d_mm=32.0, rotate=-6):
    """Inspection stamp, Ø 32 mm: ring text CALIB.TOOLS · DIMENSIONAL INSPECTION, centre INSPECTED (Geist Pixel),
    SN / date / inspector initials. Location is not shown (to be decided)."""
    ink = G80
    R = 160
    top = "CALIB.TOOLS"
    bottom = "DIMENSIONAL INSPECTION"
    s = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" style="width:calc({d_mm}mm * var(--cs,1));height:calc({d_mm}mm * var(--cs,1));display:block">
<defs>
 <path id="arcT" d="M 44 160 A 116 116 0 0 1 276 160"/>
 <path id="arcB" d="M 30 160 A 130 130 0 0 0 290 160"/>
</defs>
<g transform="rotate({rotate} 160 160)" fill="{ink}" stroke="none">
 <circle cx="160" cy="160" r="{R - 4}" fill="none" stroke="{ink}" stroke-width="6"/>
 <circle cx="160" cy="160" r="{R - 47}" fill="none" stroke="{ink}" stroke-width="2.5"/>
 <text font-family="Geist" font-weight="900" font-size="27" letter-spacing="3.2" text-anchor="middle">
   <textPath href="#arcT" startOffset="50%">{top}</textPath></text>
 <text font-family="Geist Mono" font-weight="500" font-size="17.5" letter-spacing="2.2" text-anchor="middle">
   <textPath href="#arcB" startOffset="50%">{bottom}</textPath></text>
 <rect x="20.5" y="153.5" width="13" height="13"/>
 <rect x="286.5" y="153.5" width="13" height="13"/>
 <line x1="88" y1="132" x2="232" y2="132" stroke="{ink}" stroke-width="2"/>
 <text x="160" y="172.5" font-family="Geist Pixel" font-size="32" text-anchor="middle" letter-spacing="0.6" stroke="{ink}" stroke-width="1.1" stroke-linejoin="miter">INSPECTED</text>
 <line x1="88" y1="186" x2="232" y2="186" stroke="{ink}" stroke-width="2"/>
 <text x="160" y="119" font-family="Geist Mono" font-weight="500" font-size="18" text-anchor="middle" letter-spacing="1">SN {esc(sn)}</text>
 <text x="160" y="211" font-family="Geist Mono" font-weight="500" font-size="17" text-anchor="middle" letter-spacing="0.5">{esc(date)}</text>
 <text x="160" y="234" font-family="Geist Mono" font-weight="700" font-size="17" text-anchor="middle" letter-spacing="2">{esc(initials)}</text>
</g></svg>'''
    return s


def signature(name, role, date, sig_text=None, stamp=None, note_text=None):
    """Signed row; when stamp=(sn, date, initials) the inspection stamp overlaps the signature line by 2.5 mm."""
    st = f'<div class="stamp">{stamp_svg(*stamp)}</div>' if stamp else ""
    nt = f'<br>{note_text}' if note_text else ""
    return (f'<div class="sig"><div class="who"><div class="tag">Signed</div><div class="line">{esc(sig_text or "")}</div>'
            f'<div class="lab">{esc(name)} · {esc(role)} · <span class="mono">{esc(date)}</span>{nt}</div></div>{st}</div>')


# --------------------------------------------------------------------------- document
class Doc:
    def __init__(self, number, rev, date, eyebrow, title, sn=None, subtitle=None, watermark="SAMPLE",
                 footer_left=None, header_id=None):
        self.number, self.rev, self.date = number, rev, date
        self.eyebrow, self.title, self.subtitle, self.sn = eyebrow, title, subtitle, sn
        self.watermark = watermark
        self.header_id = header_id or " · ".join(x for x in (number, f"Rev {rev}" if rev else None, date) if x)
        if footer_left is None:
            footer_left = CONTACT + (f" · calib.tools/verify/{sn}" if sn else "")
        self.footer_left = footer_left
        self.pages = []

    def add_page(self, body_html, title_block=None):
        """Add one page. The first page automatically starts with eyebrow + title (title_block=False to suppress)."""
        if title_block is None:
            title_block = not self.pages
        tb = ""
        if title_block:
            tb = f'<div class="eyebrow">{esc(self.eyebrow)}</div><h1>{esc(self.title)}</h1>'
            if self.subtitle:
                tb += f'<div class="sub">{self.subtitle}</div>'
            else:
                tb += '<div style="height:2.5mm"></div>'
        self.pages.append(tb + body_html)

    def html(self, paper="A4"):
        N = len(self.pages)
        out = []
        for i, b in enumerate(self.pages, 1):
            wm = f'<div class="wm">{esc(self.watermark)}</div>' if self.watermark else ""
            out.append(f'''<section class="page">
<div class="hdr"><img src="file://{WORDMARK_SVG}" alt="CALIB.TOOLS"><div class="id">{esc(self.header_id)}</div></div>
<div class="body"><div class="zin">{b}</div></div>
<div class="ftr"><span>{esc(self.footer_left)}</span><span class="pg">Page {i} / {N}</span></div>{wm}
</section>''')
        return (f"<!doctype html><html><head><meta charset='utf-8'><title>{esc(self.number)}</title>"
                f"<style>{base_css(paper)}</style></head><body>{''.join(out)}</body></html>")

    def render(self, out_base, papers=("A4", "Letter"), previews=True, preview_dpi=70):
        """Writes <out_base>.pdf (A4) and <out_base>-letter.pdf; preview PNGs <out_base>-p<N>.png (A4).
        Returns dict with overflow report. Prints a one-line summary."""
        from playwright.sync_api import sync_playwright
        os.makedirs(os.path.dirname(out_base), exist_ok=True)
        report = {}
        with sync_playwright() as pw:
            br = pw.chromium.launch(executable_path="/usr/bin/chromium")
            for paper in papers:
                W, H = PAPER[paper]
                hp = f"{out_base}{'' if paper == 'A4' else '-letter'}.html"
                open(hp, "w").write(self.html(paper))
                pg = br.new_page()
                pg.goto(f"file://{hp}")
                pg.evaluate("document.fonts.ready.then(() => true)")
                pg.wait_for_timeout(300)
                over = pg.evaluate("""() => Array.from(document.querySelectorAll('.page .body')).map((b, i) => {
                    const r = b.getBoundingClientRect(); let maxB = 0, maxR = 0;
                    b.querySelectorAll('.zin *').forEach(e => { if (e.tagName.toLowerCase() !== 'svg' && e.closest('svg')) return; const q = e.getBoundingClientRect(); if (q.height>0) { maxB = Math.max(maxB, q.bottom); maxR = Math.max(maxR, q.right);} });
                    return {page: i+1, over_mm: Math.max(0, (Math.max(b.scrollHeight - b.clientHeight, maxB - r.bottom)) * 25.4/96),
                            over_w_mm: Math.max(0, (Math.max(b.scrollWidth - b.clientWidth, maxR - r.right)) * 25.4/96),
                            free_mm: Math.max(0, (r.bottom - maxB) * 25.4/96)}; })""")
                pdf = f"{out_base}{'' if paper == 'A4' else '-letter'}.pdf"
                pg.pdf(path=pdf, width=f"{W}mm", height=f"{H}mm", print_background=True, prefer_css_page_size=True)
                pg.close()
                os.remove(hp)
                report[paper] = over
            br.close()
        if previews:
            import subprocess, glob
            for f in glob.glob(f"{out_base}-p*.png"):
                os.remove(f)
            subprocess.run(["pdftoppm", "-r", str(preview_dpi), "-png", f"{out_base}.pdf", f"{out_base}-p"], check=True)
        bad = [(paper, o["page"], round(o["over_mm"], 1), round(o["over_w_mm"], 1)) for paper, lst in report.items() for o in lst
               if o["over_mm"] > 0.3 or o["over_w_mm"] > 0.3]
        free = {paper: [round(o["free_mm"], 1) for o in lst] for paper, lst in report.items()}
        print(f"{os.path.basename(out_base)}: {len(self.pages)} pages; overflow={'none' if not bad else bad}; free space mm={free}")
        return {"pages": len(self.pages), "overflow": bad, "free_mm": free}
