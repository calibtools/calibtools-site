---
seoTitle: "ISO 12233 chart, reflective or transmissive"
seoDescription: "ISO 12233 and eSFR charts for MTF and SFR: slanted edges and sweeps to 4000 LP/PH, A3 to A1, reflective or transmissive for small fields. Ask for a quote."
summary: "ISO 12233 chart to measure your camera's MTF and SFR, lens to pipeline"
decideSpecs:
  - "Standard"
  - "Chart type"
  - "Resolution"
chips:
  - "ISO 12233"
  - "Up to 4000 LP/PH"
  - "A3–A1"
story: "An ISO 12233 chart tells you how sharp your whole imaging system really is — lens, sensor and processing together. The slanted edges give you SFR; the frequency sweeps show you where MTF falls off.\n\nWe plot the chart fine enough to test sensors up to 4000 line pairs per picture height, in sizes from A3 to A1, so it suits anything from a phone camera to a line-scan system.\n\nFor small fields of view and lens benches, a transmissive version on glass keeps the edges sharp where a printed chart would show its grain. eSFR layouts (ISO 12233:2017) with color and OECF patches suit module lines that read everything from one chart.\n\nThe specifications shown are target values — tell us your working distance and we will set the chart version, size and substrate for you."
compat:
  - { tool: "Imatest / iQ-Analyzer", note: "ISO 12233 SFR and eSFR modules" }
  - { tool: "OpenCV / sfrmat", note: "Slanted-edge SFR on any edge of the chart" }
relatedTargets:
  - { label: "Siemens star and focus chart", href: "/targets/focus-siemens-star-chart/", note: "Focus and astigmatism at a glance." }
  - { label: "USAF 1951 and glass targets", href: "/targets/resolution-targets-glass/", note: "Line pairs for microscopes and lens benches." }
  - { label: "Gray scale and OECF chart", href: "/targets/grayscale-oecf-chart/", note: "Tone curve, dynamic range and noise." }
  - { label: "24-patch color chart", href: "/targets/color-chart/", note: "Color reference for ISP tuning." }
  - { label: "Backlit target", href: "/targets/backlit-target/", note: "Transmissive patterns on a light source." }
relatedGuides:
  - { label: "USAF 1951 lp/mm table", href: "/guides/usaf-1951-lp-mm-table/", note: "Reading resolution from line pairs." }
  - { label: "Composite, ceramic or glass", href: "/guides/composite-ceramic-or-glass/", note: "Which substrate for which job." }
---

## What the chart measures

Resolution is not the pixel count. Two cameras with the same sensor can produce very different detail, because the lens, the focus and the processing all take their share.

An ISO 12233 chart measures what is left at the end: how well the whole system reproduces fine detail. The result is a curve, the spatial frequency response, that shows how contrast falls as detail gets finer.

## Slanted edges and why they are used

The main features are dark squares or bars set at a slight angle to the pixel grid. Because the edge is tilted, each row of pixels crosses it at a slightly different position.

Software combines those rows into one finely sampled profile of the edge, and from that profile it computes the response curve. You get a full curve from a small patch of image, which is why the method is used on production lines.

Common numbers read from the curve are the frequency where contrast has dropped to half, and the frequency where detail is no longer resolved. They are given in line pairs per picture height, so results from different sensor sizes can be compared.

## The chart has to be better than the camera

A chart has its own limits. Print has grain and its edges are not perfectly sharp. If the chart's edge is soft at the scale your camera sees, you measure the chart.

Two things keep you clear of that. Use a chart large enough that its edges cover many pixels at your working distance. For small fields of view, use the transmissive version on glass, where the edge is far sharper than print.

## Reflective or transmissive

- **Reflective**: a matte print lit from the front, from A3 to A1. It suits cameras that look at a scene from a distance.
- **Transmissive**: a pattern on glass or film in front of a light box. It suits small fields, lens benches and stations with no room for front lighting.

Layouts with slanted edges plus color and gray patches let a module line read sharpness, tone and color from one chart.

## Getting a result you can trust

- Light the chart evenly. A gradient across an edge changes the curve.
- Set the chart square to the camera and fill the frame as the layout intends.
- Focus carefully, then leave it; the measurement is very sensitive to focus.
- Switch off sharpening if you want to know what the lens and sensor do. Leave it on if you want to know what the customer sees.
- Measure at the center and in the corners. Lenses are rarely equal across the field.

These are target values. The target is made to order, and we confirm what we can build, and when, before you order.

## What to tell us

- Sensor resolution and lens, and the working distance.
- Reflective or transmissive, and the space you have.
- Which layout your analysis software expects.

[Ask for a quote](/quote/?product=ISO%2012233%20resolution%20chart) with these and we answer with a chart size, a price and a delivery time.
