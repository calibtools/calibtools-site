"""Brand-styled matplotlib charts for customer documents -> inline SVG sized in mm.

    import ctplot as CPL
    fig, ax = CPL.figure(120, 55)           # width, height in mm
    ax.plot(x, y, color=CPL.BLACK, lw=0.8)
    CPL.limit(ax, 2.0); CPL.limit(ax, -2.0) # tolerance lines (dashed Grey 60)
    svg = CPL.svg(fig)                      # string, embed directly in the page HTML

Rules: black for data, greys for secondary series / fills, NO red in charts (red is reserved for the
wordmark square and the X-axis arrow). Text in Geist / Geist Mono, 7-8 pt. Thin axes, no top/right spines.
"""
import io, re, glob
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager as fm

KIT = "/home/ubuntu/work/brandkit/calibtools-brand-kit/07-fonts"
for f in glob.glob(f"{KIT}/**/*.otf", recursive=True):
    try:
        fm.fontManager.addfont(f)
    except Exception:
        pass

BLACK, G80, G60, G30, G10, G05 = "#000000", "#333333", "#666666", "#B3B3B3", "#E6E6E6", "#F2F2F2"
GREYS = [BLACK, G60, G30, G80, G10]
# sequential colormap for heatmaps: white -> black (never red)
from matplotlib.colors import LinearSegmentedColormap
CMAP = LinearSegmentedColormap.from_list("ct_grey", ["#FFFFFF", "#E6E6E6", "#B3B3B3", "#666666", "#000000"])
CMAP_DIV = LinearSegmentedColormap.from_list("ct_div", ["#000000", "#666666", "#FFFFFF", "#666666", "#000000"])

plt.rcParams.update({
    "font.family": "Geist", "font.size": 7.5, "axes.labelsize": 7.5, "axes.titlesize": 8,
    "xtick.labelsize": 7, "ytick.labelsize": 7, "legend.fontsize": 7, "axes.linewidth": 0.5,
    "axes.edgecolor": G60, "axes.labelcolor": G80, "xtick.color": G60, "ytick.color": G60,
    "xtick.major.width": 0.5, "ytick.major.width": 0.5, "xtick.major.size": 2.5, "ytick.major.size": 2.5,
    "axes.spines.top": False, "axes.spines.right": False, "axes.grid": True, "grid.color": G10, "grid.linewidth": 0.5,
    "lines.linewidth": 0.9, "svg.fonttype": "path", "figure.dpi": 100, "legend.frameon": False,
    "axes.prop_cycle": matplotlib.cycler(color=GREYS), "axes.titleweight": 600, "axes.titlelocation": "left",
})
MONO = {"family": "Geist Mono"}


def figure(w_mm, h_mm, **kw):
    fig, ax = plt.subplots(figsize=(w_mm / 25.4, h_mm / 25.4), **kw)
    return fig, ax


def limit(ax, y, label=None, axis="y"):
    """Dashed tolerance / spec-limit line."""
    if axis == "y":
        ax.axhline(y, color=G60, lw=0.6, ls=(0, (3, 2)))
        if label:
            ax.annotate(label, xy=(1, y), xycoords=("axes fraction", "data"), xytext=(2, 0), textcoords="offset points",
                        va="center", fontsize=6.5, color=G60, fontfamily="Geist Mono")
    else:
        ax.axvline(y, color=G60, lw=0.6, ls=(0, (3, 2)))


def svg(fig, w_mm=None):
    """Return the figure as an inline SVG string with physical size in mm (counter-scaled on Letter like QR/stamp:
    no - charts follow the page zoom; they are not dimensional)."""
    buf = io.StringIO()
    fig.savefig(buf, format="svg", bbox_inches=None, transparent=True)
    plt.close(fig)
    s = buf.getvalue()
    s = s[s.find("<svg"):]
    # replace pt sizes with mm so the chart is exactly the requested size
    m = re.search(r'width="([\d.]+)pt" height="([\d.]+)pt"', s)
    if m:
        wpt, hpt = float(m.group(1)), float(m.group(2))
        s = s.replace(m.group(0), f'width="{wpt / 72 * 25.4:.2f}mm" height="{hpt / 72 * 25.4:.2f}mm"', 1)
    return s
