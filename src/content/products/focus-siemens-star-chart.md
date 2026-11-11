---
seoTitle: "Siemens star and focus test chart, glass"
seoDescription: "Siemens star targets and focus charts for lens alignment and autofocus work: chrome on glass or printed A3, single star or multi-star fields. Ask for a quote."
summary: "Siemens stars and focus charts to set, check and automate your lens focus"
decideSpecs:
  - "Pattern"
  - "Substrate"
  - "Size"
chips:
  - "Star or multi-star"
  - "Chrome on glass"
  - "76 mm to A3"
story: "A Siemens star shows focus and astigmatism in one glance: the blur circle in the middle shrinks as focus improves, and it goes oval when the lens is tilted. A field of stars at the center and corners shows field curvature the same way.\n\nChrome-on-glass stars give the sharpest edges for high-resolution and macro lenses. Printed A3 charts suit module lines and autofocus development, where many stations need the same chart.\n\nThe specifications shown are target values — tell us your lens and working distance and we will confirm what we can build, and when."
compat:
  - { tool: "Imatest / iQ-Analyzer", note: "Star chart MTF and focus modules" }
  - { tool: "OpenCV", note: "Focus measure on the star region (Laplacian variance or Tenengrad)" }
relatedTargets:
  - { label: "ISO 12233 chart", href: "/targets/resolution-chart/", note: "A full response curve from slanted edges." }
  - { label: "USAF 1951 and glass targets", href: "/targets/resolution-targets-glass/", note: "Line pairs for microscopes and lens benches." }
  - { label: "Grid distortion target", href: "/targets/grid-distortion-target/", note: "Map distortion once focus is set." }
  - { label: "Backlit target", href: "/targets/backlit-target/", note: "Patterns on a light source." }
  - { label: "ChArUco, ceramic", href: "/targets/charuco-ceramic/", note: "Geometric calibration for small fields." }
relatedGuides:
  - { label: "USAF 1951 lp/mm table", href: "/guides/usaf-1951-lp-mm-table/", note: "Reading resolution from line pairs." }
  - { label: "Why your board is not detected", href: "/guides/corner-detection-troubleshooting/", note: "What blur does to detection." }
---

## What a Siemens star shows

A Siemens star is a disc of alternating dark and bright wedges that meet in the center. Toward the center the wedges get narrower, so the pattern contains every level of detail from coarse at the rim to very fine in the middle.

At some radius the camera can no longer separate the wedges and the center turns into an even gray disc. The size of that disc is a direct picture of the resolution: the smaller it is, the finer the detail the system resolves.

## Reading focus from it

Turn the focus and watch the gray disc. It shrinks as focus improves and grows again when you pass the best point. No software is needed; you can see it on a live image.

For automatic focus, the same star gives a number. The contrast along a circle of fixed radius peaks at best focus, which makes a clean signal for a focus search.

## Reading the lens from it

The star has detail in every direction at once, and that is what sets it apart from a line chart.

- If the gray disc is round, the lens is equally sharp in all directions.
- If it is oval, detail in one direction is softer than in the other. That is astigmatism, or a tilted lens or sensor.
- Dark and bright wedges that swap places inside the disc show the image is out of focus, not just at its limit.

## One star or many

A single star in the center tells you about the center. A lens that is sharp there can still be soft in the corners.

A chart with stars at the center and toward the corners shows the whole field in one image. If the corners reach best focus at a different setting than the center, the field is curved. If one side is sharp and the other soft, something is tilted.

## Glass or print

- **Chrome on glass**: the wedges stay clean right into the center. Use it for high-resolution lenses, macro work and small fields, where a print would run out of detail before the lens does.
- **Printed chart**: larger and inexpensive to replace. It suits module lines and autofocus development at normal working distances.

Whichever you choose, the star has to be finer than your camera at the working distance. If the print's own limit shows up first, the gray disc you see belongs to the chart.

## Using it

- Set the chart square to the optical axis; a tilted chart looks like a tilted lens.
- Light it evenly, or use it on a back light.
- Expose so that the bright wedges are not clipped.
- Compare like with like: same distance, same aperture, same light.

These are target values. The target is made to order, and we confirm what we can build, and when, before you order.

## What to tell us

- Lens, sensor resolution and working distance.
- Single star or a field of stars, and the size of your field of view.
- Glass or print, front light or back light.

[Ask for a quote](/quote/?product=Siemens%20star%20and%20focus%20chart) with these and we answer with a layout, a price and a delivery time.
