# Notes / external facts (customer-document system)
- Spec source: docs/design/customer-docs/客户交付文件内容规范.md (v1, 2026-10-26). Sample data = section 18 (ceramic ChArUco 000311).
- Geist Pixel (Vercel, released 2026-02-06, https://vercel.com/blog/introducing-geist-pixel) ships in geist-font v1.8.2 package;
  using GeistPixel-Square.ttf (OFL) for the stamp centre word INSPECTED.
- OpenCV CharucoBoard.setLegacyPattern doc: legacy (pre-4.6) boards start with a WHITE box top-left when the row count is even,
  otherwise black; OpenCV >= 4.6 boards always start black top-left. Calib.Tools boards = new layout (black top-left).
  => 12-row boards (even) need setLegacyPattern(false) (default) in >= 4.6; older OpenCV / legacy-pattern code will mis-assign IDs.
- Board Y-arrow green used on product artwork: RGB (0,166,81) = #00A651; X arrow = brand red #E60012.
- Spec inconsistencies to report: CSV example row id 0 at (0,0) vs rule "origin = top-left OUTER corner (OpenCV frame)" -> first inner corner is (10,10);
  sample pitch X 10.0012 (+1.2 um/pitch) vs pattern width 170.004 (+4 um over 17 pitches would be +20.4 um) -> define "pitch" (mean vs max single);
  product artwork label line used part no. CT-CHA-C-200150-1007, spec uses CT-CHA-C-200150-6X6.
- QR: segno 1.6.6, error level M, quiet zone 1 module per spec.
- German invoice wording (UStG): intra-EU B2B supply of GOODS = tax-exempt intra-Community supply (§ 4 Nr. 1b, § 6a UStG; invoice note
  required by § 14a (3) UStG, both VAT IDs); B2B SERVICES to EU customers (e.g. ILAC certificate service) = reverse charge, invoice must
  state "Steuerschuldnerschaft des Leistungsempfängers" (§ 14a (5) UStG, § 13b UStG / Art. 196 VAT Directive). Spec says "反向征收句" for EU B2B
  generally -> flag to user; tax advisor to confirm.
- RoHS scope: Directive 2011/65/EU applies to electrical & electronic equipment; a passive ceramic plate is likely out of scope -> wording
  "not in scope / substances below Annex II limits per supplier declaration", to be confirmed.
- DICT_6X6_250 has 250 IDs -> max two 102-marker boards (12x17) per set.
- Chromium print: 100 mm renders 99.963 mm in PDF (A4 and Letter, .true-scale works).
- Plan: parent built system + CT-IR + CT-CSV; 15 docs fanned out via workflow (DS, UM-GEN, UM-CHA-C, AN-004, FM, DN, CoC, CC, RI, BR, QR, DR, PS, QT, INV).
