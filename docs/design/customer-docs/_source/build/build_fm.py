"""CT-FM · File manifest for order CT-1047, line 1.

Builds the sample delivery archive first, then computes the manifest rows from the
actual archive files before rendering the one-page PDF and its Letter counterpart.
"""
import hashlib
import json
import shutil
import sys
from pathlib import Path

sys.path.insert(0, "/home/ubuntu/work/docs/system")
from ctdoc import Doc, esc, kv, p, section, table


ROOT = Path("/home/ubuntu/work/docs")
OUT = ROOT / "out" / "CT-FM"
BUNDLE_NAME = "CT-1047-01"
BUNDLE = OUT / BUNDLE_NAME
DOC_NO = "CT-FM-1047-01"
REV = "A"
GENERATED = "2026-11-05"

S = json.loads((ROOT / "system" / "sample.json").read_text())
PRODUCT = S["product"]
ORDER = S["order"]
LINE = next(line for line in ORDER["lines"] if line["pos"] == 1)
PART = LINE["part"]
SERIALS = LINE["serials"]


def write_text(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text.rstrip() + "\n", encoding="utf-8")


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def size_label(path):
    n = path.stat().st_size
    if n < 1024:
        return f"{n} B"
    if n < 1024 * 1024:
        return f"{n / 1024:.1f} KiB"
    return f"{n / (1024 * 1024):.2f} MiB"


def file_type(path):
    name = path.name.lower()
    if name.endswith(".pdf"):
        return "PDF"
    if name.endswith(".csv"):
        return "CSV"
    if name.endswith(".json"):
        return "JSON"
    if name.endswith((".yaml", ".yml")):
        return "YAML"
    if name.endswith(".dxf"):
        return "DXF"
    if name.endswith(".descr"):
        return "DESCR"
    if name.endswith(".txt"):
        return "TXT"
    return "FILE"


def placeholder(dest_dir, expected_name, expected_source):
    """Make a clearly named plain-text placeholder for a source not yet available."""
    name = f"PLACEHOLDER-{expected_name}.txt"
    dest = dest_dir / name
    write_text(
        dest,
        f"SAMPLE PLACEHOLDER\n\n"
        f"Expected delivery file: {expected_name}\n"
        f"Expected source: {expected_source}\n\n"
        "This file was unavailable when the CT-FM sample archive was assembled. "
        "Replace this placeholder with the delivered file and re-run build_fm.py.\n",
    )
    return dest


def copy_or_placeholder(dest_dir, expected_name, source):
    source = Path(source)
    dest_dir.mkdir(parents=True, exist_ok=True)
    if source.is_file():
        destination = dest_dir / expected_name
        shutil.copy2(source, destination)
        return destination
    return placeholder(dest_dir, expected_name, source)


def opencv_json(start_id, serial):
    return {
        "sample": True,
        "target_type": "charuco",
        "part_number": PART,
        "serial_number": serial,
        "board": {
            "rows": 12,
            "cols": 17,
            "square_length_m": 0.010,
            "marker_length_m": 0.007,
            "dictionary": "DICT_6X6_250",
            "start_id": start_id,
            "legacy_pattern": False,
        },
        "coordinate_frame": {
            "origin": "top-left outer corner of the pattern",
            "x_axis": "right",
            "y_axis": "down",
        },
    }


def ros2_yaml(start_id, serial):
    return f"""# SAMPLE ROS 2 ChArUco target description\ntarget_type: charuco\npart_number: {PART}\nserial_number: \"{serial}\"\nrows: 12\ncols: 17\nsquare_length_m: 0.010\nmarker_length_m: 0.007\ndictionary: DICT_6X6_250\nstart_id: {start_id}\nlegacy_pattern: false\nframe: opencv_top_left_x_right_y_down\n"""


def kalibr_yaml(start_id, serial):
    return f"""# SAMPLE Kalibr-compatible ChArUco target description\ntarget_type: charuco\npart_number: {PART}\nserial_number: \"{serial}\"\nrows: 12\ncols: 17\nsquare_length: 0.010\nmarker_length: 0.007\ndictionary: DICT_6X6_250\nstart_id: {start_id}\nlegacy_pattern: false\ncoordinate_frame: opencv_top_left_x_right_y_down\n"""


def halcon_descr(start_id, serial):
    return f"""# SAMPLE HALCON target description\n# ChArUco board parameters. Units are metres unless stated.\nTargetType = ChArUco\nPartNumber = {PART}\nSerialNumber = {serial}\nRows = 12\nColumns = 17\nSquareLength = 0.010\nMarkerLength = 0.007\nDictionary = DICT_6X6_250\nStartID = {start_id}\nLegacyPattern = false\nCoordinateFrame = OpenCV_top_left_X_right_Y_down\n"""


def r12_line(layer, x1, y1, x2, y2):
    return f"0\nLINE\n8\n{layer}\n10\n{x1}\n20\n{y1}\n30\n0.0\n11\n{x2}\n21\n{y2}\n31\n0.0\n"


def dxf_outline(start_id, serial):
    """Minimal ASCII DXF R12: 200 × 150 board outline and 170 × 120 pattern area."""
    lines = [
        "999\nSAMPLE DXF R12 outline for Calib.Tools ChArUco target\n",
        f"999\nPart {PART}; serial {serial}; start ID {start_id}\n",
        "0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1009\n0\nENDSEC\n",
        "0\nSECTION\n2\nTABLES\n0\nENDSEC\n",
        "0\nSECTION\n2\nENTITIES\n",
    ]
    # Board rectangle: 200 × 150 mm.
    for a, b in [((0, 0), (200, 0)), ((200, 0), (200, 150)), ((200, 150), (0, 150)), ((0, 150), (0, 0))]:
        lines.append(r12_line("BOARD_OUTLINE", *a, *b))
    # Pattern rectangle: 170 × 120 mm, located with 15 mm margins.
    for a, b in [((15, 15), (185, 15)), ((185, 15), (185, 135)), ((185, 135), (15, 135)), ((15, 135), (15, 15))]:
        lines.append(r12_line("PATTERN_AREA", *a, *b))
    lines.append("0\nENDSEC\n0\nEOF\n")
    return "".join(lines)


def build_archive():
    """Create only the requested archive tree and return the ordered asset paths."""
    if BUNDLE.exists():
        shutil.rmtree(BUNDLE)
    BUNDLE.mkdir(parents=True)

    # Per-board assets. Configuration / drawing files deliberately incorporate each board's start ID.
    for item in SERIALS:
        serial, start_id = item["sn"], item["start_id"]
        board_dir = BUNDLE / serial
        board_dir.mkdir()
        copy_or_placeholder(
            board_dir,
            f"CT-IR-{serial}.pdf",
            ROOT / "out" / "CT-IR" / f"CT-IR-{serial}.pdf",
        )
        copy_or_placeholder(
            board_dir,
            f"CT-CSV-{serial}.csv",
            ROOT / "out" / "CT-CSV" / f"CT-CSV-{serial}.csv",
        )
        write_text(board_dir / f"{PART}.opencv.json", json.dumps(opencv_json(start_id, serial), indent=2))
        write_text(board_dir / f"{PART}.ros2.yaml", ros2_yaml(start_id, serial))
        write_text(board_dir / f"{PART}.kalibr.yaml", kalibr_yaml(start_id, serial))
        write_text(board_dir / f"{PART}.halcon.descr", halcon_descr(start_id, serial))
        write_text(board_dir / f"CT-DWG-{PART}.dxf", dxf_outline(start_id, serial))

    # Shared documents are copied at the moment of the build when available.
    shared = BUNDLE / "shared"
    shared.mkdir()
    copy_or_placeholder(shared, "CT-DS-CHA-C.pdf", ROOT / "out" / "CT-DS" / "CT-DS-CHA-C.pdf")
    copy_or_placeholder(shared, "CT-UM-GEN.pdf", ROOT / "out" / "CT-UM-GEN" / "CT-UM-GEN.pdf")
    copy_or_placeholder(shared, "CT-UM-CHA-C.pdf", ROOT / "out" / "CT-UM-CHA-C" / "CT-UM-CHA-C.pdf")
    copy_or_placeholder(shared, "CT-AN-001.pdf", ROOT / "out" / "CT-AN" / "CT-AN-001.pdf")


def delivered_path(directory, expected_name):
    """Find a delivered file or its intentionally named fallback placeholder."""
    direct = directory / expected_name
    fallback = directory / f"PLACEHOLDER-{expected_name}.txt"
    if direct.is_file():
        return direct
    if fallback.is_file():
        return fallback
    raise FileNotFoundError(f"No delivery file or placeholder for {expected_name}")


def archive_assets(include_readme=False):
    """Return archive files in the sequence required by CT-FM specification §6."""
    paths = []
    board_files = [
        "CT-IR-{serial}.pdf",
        "CT-CSV-{serial}.csv",
        f"{PART}.opencv.json",
        f"{PART}.kalibr.yaml",
        f"{PART}.ros2.yaml",
        f"{PART}.halcon.descr",
        f"CT-DWG-{PART}.dxf",
    ]
    for item in SERIALS:
        directory = BUNDLE / item["sn"]
        for template in board_files:
            paths.append(delivered_path(directory, template.format(serial=item["sn"])))
    shared = BUNDLE / "shared"
    for name in ("CT-DS-CHA-C.pdf", "CT-UM-GEN.pdf", "CT-UM-CHA-C.pdf", "CT-AN-001.pdf"):
        paths.append(delivered_path(shared, name))
    if include_readme:
        paths.append(BUNDLE / "README.txt")
    return paths


def readme_entry_lines(relative_name, typ, size, checksum=None):
    """An 80-column-friendly text manifest record; hashes are deliberately split."""
    if len(relative_name) > 48:
        # All expected names fit, but preserve a clear, readable continuation if a future name does not.
        first, second = relative_name[:48], relative_name[48:]
        lines = [f"{first:<48}  {typ:<10} {size:>10}", f"  {second}"]
    else:
        lines = [f"{relative_name:<48}  {typ:<10} {size:>10}"]
    if checksum:
        lines.extend([f"  SHA-256  {checksum[:32]}", f"            {checksum[32:]}"])
    else:
        lines.append("  SHA-256  — (this text manifest)")
    return lines


def render_readme():
    """Write an 80-column plaintext view; it intentionally omits its own SHA-256."""
    base = archive_assets(include_readme=False)
    readme = BUNDLE / "README.txt"

    # The entry needs the final size. Size stabilises because its field width and digit count are fixed.
    previous_size = None
    for _ in range(5):
        own_size = readme.stat().st_size if readme.exists() else 0
        records = [(path, sha256(path)) for path in base]
        lines = [
            "CT-FM-1047-01 · REV A · 2026-11-05",
            "FILE MANIFEST",
            "=" * 80,
            "Order no.       CT-1047",
            "Line            1",
            f"Part number     {PART}",
            "Serial(s)       000311 · 000312",
            "Generated date  2026-11-05",
            "",
            "FILE NAME                                          TYPE             SIZE",
            "-" * 80,
        ]
        for path, digest in records:
            rel = path.relative_to(BUNDLE).as_posix()
            lines.extend(readme_entry_lines(rel, file_type(path), size_label(path), digest))
        lines.extend(readme_entry_lines("README.txt", "TXT", f"{own_size} B", None))
        lines.extend([
            "",
            "Footnote: This text manifest cannot list its own SHA-256.",
            "Files named PLACEHOLDER-* identify source documents unavailable at build time.",
            "",
            "Verify any file against the checksum above.",
            "Report and coordinates are also at calib.tools/verify/000311.",
            "Verify any file against the checksum above.",
            "Report and coordinates are also at calib.tools/verify/000312.",
        ])
        content = "\n".join(lines) + "\n"
        write_text(readme, content)
        current_size = readme.stat().st_size
        if current_size == own_size or current_size == previous_size:
            break
        previous_size = current_size
    assert max(len(line) for line in readme.read_text(encoding="utf-8").splitlines()) <= 80


def manifest_rows():
    rows = []
    for path in archive_assets(include_readme=True):
        rel = path.relative_to(BUNDLE).as_posix()
        filename = esc(rel).replace("/", "/<wbr>")
        digest = sha256(path)
        checksum = f'<span class="hash">{digest[:32]}<br>{digest[32:]}</span>'
        rows.append([filename, file_type(path), size_label(path), checksum])
    return rows


def build_pdf():
    d = Doc(
        DOC_NO,
        REV,
        GENERATED,
        eyebrow="File manifest",
        title="Order CT-1047 · line 1",
        sn=None,
    )
    custom_css = """
<style>
table.t.manifest { font-size:7.3pt; line-height:1.16; }
table.t.manifest th { font-size:6.9pt; padding:0.6mm 1.25mm 0.7mm; }
table.t.manifest td { padding:0.52mm 1.25mm; }
table.t.manifest td:first-child { font-family:'Geist Mono'; font-size:7.15pt; line-height:1.14; overflow-wrap:anywhere; }
table.t.manifest td.m, table.t.manifest td.n { font-size:7.15pt; }
table.t.manifest .hash { font-family:'Geist Mono'; font-size:7pt; letter-spacing:-0.025em; line-height:1.12; white-space:nowrap; }
.manifest-foot { font-size:8.1pt; line-height:1.32; color:#666; margin:0; }
.manifest-close { font-size:8.8pt; line-height:1.28; color:#000; margin:0 0 0.8mm; }
</style>
"""
    identity = kv(
        [
            ("Order no.", ORDER["no"]),
            ("Line", str(LINE["pos"])),
            ("Part number", PART),
            ("Serial(s)", "000311 · 000312"),
            ("Generated date", GENERATED),
        ],
        mono_keys=("Order no.", "Line", "Part number", "Serial(s)", "Generated date"),
        style="grid-template-columns:29mm 1fr;",
    )
    columns = [("File name", "t"), ("Type", "m"), ("Size", "n"), ("SHA-256", "m")]
    files = table(
        columns,
        manifest_rows(),
        cls="manifest rawhead",
        widths=["34%", "8%", "11%", "47%"],
    )
    foot = (
        '<div class="push">'
        '<p class="manifest-foot">Footnote — This PDF manifest is not in the delivery archive and cannot list its own SHA-256. '
        'README.txt omits its own checksum in its text view.</p>'
        '<p class="manifest-foot">Files named <span class="mono">PLACEHOLDER-*</span> identify source documents unavailable at build time.</p>'
        '<div style="height:2.0mm"></div>'
        '<p class="manifest-close">Verify any file against the checksum above. Report and coordinates are also at '
        'calib.tools/verify/000311.</p>'
        '<p class="manifest-close">Verify any file against the checksum above. Report and coordinates are also at '
        'calib.tools/verify/000312.</p>'
        '</div>'
    )
    body = custom_css + identity + section(1, "Delivery archive", "SHA-256 · generated at build time") + files + foot
    d.add_page(body)
    return d.render(str(OUT / DOC_NO))


def zip_bundle():
    archive = OUT / BUNDLE_NAME
    zip_path = Path(shutil.make_archive(str(archive), "zip", root_dir=OUT, base_dir=BUNDLE_NAME))
    return zip_path


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    build_archive()
    render_readme()
    report = build_pdf()
    zip_path = zip_bundle()
    placeholders = [p.relative_to(BUNDLE).as_posix() for p in archive_assets(True) if p.name.startswith("PLACEHOLDER-")]
    print(f"archive: {zip_path}")
    print("placeholders: " + (", ".join(placeholders) if placeholders else "none"))
    return report


if __name__ == "__main__":
    main()
