---
seoTitle: "11-step gray scale and OECF chart"
seoDescription: "Gray-scale charts for OECF, dynamic range and ISO 15739 noise tests: 11 or 20 neutral steps with measured density, reflective or transmissive. Ask for a quote."
summary: "Neutral step charts with measured densities for your OECF, dynamic-range and noise tests"
decideSpecs:
  - "Steps"
  - "Density range"
  - "Version"
chips:
  - "11 or 20 steps"
  - "Up to 3.0 D"
  - "Reflective or transmissive"
story: "An OECF or noise measurement is only as good as the patch densities you feed into it. These charts carry 11 or 20 neutral steps, each measured after printing so the density in the data file is the density on the chart.\n\nThe reflective A3 version covers about 2.0 D for tone-curve and ISO 15739 noise tests under uniform light. The transmissive version on a lightbox reaches about 3.0 D for dynamic-range and HDR work.\n\nLayouts follow the ISO 14524 and ISO 15739 patch arrangements. The specifications shown are target values — tell us your test and we will confirm what we can build, and when."
compat:
  - { tool: "Imatest / iQ-Analyzer", note: "OECF and noise modules with the supplied density table" }
  - { tool: "Custom pipelines", note: "Patch densities supplied as CSV" }
relatedTargets:
  - { label: "24-patch color chart", href: "/targets/color-chart/", note: "Color reference for ISP tuning." }
  - { label: "ISO 12233 chart", href: "/targets/resolution-chart/", note: "Sharpness of the whole system." }
  - { label: "Backlit target", href: "/targets/backlit-target/", note: "Patterns on a light source." }
  - { label: "Reflectance panels", href: "/targets/reflectance-panel/", note: "Known reflectance at LiDAR wavelengths." }
  - { label: "Siemens star and focus chart", href: "/targets/focus-siemens-star-chart/", note: "Set focus first." }
relatedGuides:
  - { label: "Composite, ceramic or glass", href: "/guides/composite-ceramic-or-glass/", note: "Which substrate for which job." }
  - { label: "Why your board is not detected", href: "/guides/corner-detection-troubleshooting/", note: "How exposure and contrast affect detection." }
---

## What the steps measure

A camera turns light into numbers. The curve that relates the two, from the darkest shadow to the brightest highlight, is its OECF. Tone mapping, exposure control and every later measurement rest on it.

To measure the curve you need patches of known brightness in one image. A gray step chart is a row or ring of neutral patches, each a known amount darker than the last.

From the same image you can read noise: how much the pixel values scatter inside each patch. Signal and noise together give the dynamic range.

## Density, in plain terms

Patch darkness is given as optical density, D. Each step of 1.0 D is ten times less light.

- 2.0 D between lightest and darkest patch is a range of 100 to 1.
- 3.0 D is a range of 1000 to 1.

A print lit from the front cannot go much beyond about 2 D: the paper surface always reflects a little, so the darkest patch never gets truly dark. A transparent chart on a light box can, because its dark patches simply block the light.

## Reflective or transmissive

- **Reflective**: for tone-curve and noise measurements under even front light. It is simple to set up and matches how most scenes are lit.
- **Transmissive**: for dynamic-range and HDR work, where you need a wider range than a print can give. It needs a uniform light box and a dark room.

The planned charts have 11 or 20 steps. More steps give more points on the curve; fewer, larger patches give more pixels per patch for the noise measurement.

## Why each chart is measured

The software needs the true density of every patch. Nominal values are not enough, because print and film vary from batch to batch.

Each chart is measured after it is made, and the densities come with it as a data file. Feed that file to your analysis.

## Stray light is the usual problem

The darkest patches are where measurements go wrong. Light from the bright patches, the surround or the room scatters inside the lens and lifts the dark values. The curve then looks flatter than the sensor really is.

- Work in a dark room and mask everything around the chart in black.
- Keep bright objects out of the field of view.
- Light a reflective chart evenly and check it with a meter across the area.
- Let a light box warm up before measuring.
- Keep the lens clean; a film of dust adds flare.

These are target values. The target is made to order, and we confirm what we can build, and when, before you order.

## What to tell us

- The test you run: tone curve, noise, dynamic range.
- The density range you need.
- Reflective or transmissive, and the size of your light box if you have one.
- The patch layout your software expects.

[Ask for a quote](/quote/?product=Gray%20scale%20and%20OECF%20chart) with these and we answer with a specification, a price and a delivery time.
