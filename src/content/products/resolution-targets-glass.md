---
seoTitle: "USAF 1951, Ronchi and glass scale targets"
seoDescription: "Chrome-on-glass resolution and metrology targets: USAF 1951 positive and negative, Ronchi rulings, glass scales to 1000 mm, microscopy targets. Ask for a quote."
summary: "Chrome-on-glass USAF 1951, Ronchi, scale and microscopy targets for your optical metrology"
decideSpecs:
  - "Pattern"
  - "Polarity"
  - "Size"
chips:
  - "USAF · Ronchi · scale"
  - "Positive or negative"
  - "76 mm to 1000 mm"
story: "These are the small glass targets a measuring microscope, a lens bench or a vision metrology system is set up with. USAF 1951 targets come positive (chrome bars on clear) and negative (clear bars on chrome) for transmitted or reflected light.\n\nRonchi rulings give a single known spatial frequency across the whole field. Glass scales from 100 mm to 1000 mm carry a lithographed line pattern at known pitch for pixel-size and distortion checks along a long axis.\n\nConcentric-circle and multi-pattern targets combine several features on one 64 or 76 mm plate for microscope calibration. The specifications shown are target values — tell us your magnification and field and we will confirm what we can build, and when."
compat:
  - { tool: "Custom pipelines", note: "Line positions and group/element sizes supplied as a table" }
  - { tool: "HALCON / OpenCV", note: "Scale line pitch from the datasheet for pixel-size calibration" }
relatedTargets:
  - { label: "Grid distortion target", href: "/targets/grid-distortion-target/", note: "Cross grids and dot grids on glass." }
  - { label: "Siemens star and focus chart", href: "/targets/focus-siemens-star-chart/", note: "Focus and astigmatism at a glance." }
  - { label: "Line-scan target", href: "/targets/line-scan-target/", note: "Long strips for line-scan cameras." }
  - { label: "ISO 12233 chart", href: "/targets/resolution-chart/", note: "Response curves for whole cameras." }
  - { label: "ChArUco, ceramic", href: "/targets/charuco-ceramic/", note: "Geometric calibration for small fields." }
relatedGuides:
  - { label: "USAF 1951 lp/mm table", href: "/guides/usaf-1951-lp-mm-table/", note: "Every group and element in lp/mm and µm." }
  - { label: "Composite, ceramic or glass", href: "/guides/composite-ceramic-or-glass/", note: "Why small fields need glass." }
---

## What these targets are for

When the field of view is a few millimeters across, a printed target is no use: its dots and fibers are as large as the features you want to image.

Targets for microscopes, lens benches and measuring systems are made like photomasks, as a thin chrome layer on glass with edges sharp enough for the optics to be the limit.

This family covers the common patterns. They answer three questions: how fine a detail the system resolves, how large one pixel is on the object, and whether the image is true to scale across the field.

## USAF 1951: how fine is the detail

The USAF 1951 pattern is a set of bar triplets, horizontal and vertical, that get smaller step by step. They are arranged in groups, and each group has six elements.

Find the smallest element in which you can still count three separate bars in both directions. Its group and element numbers give the resolution in line pairs per millimeter. The [USAF 1951 table](/guides/usaf-1951-lp-mm-table/) lists every value and the bar width that goes with it.

It is a visual test, quick to do and understood everywhere. For a full response curve, use slanted edges as on the [ISO 12233 chart](/targets/resolution-chart/).

## Positive or negative

- **Positive**: chrome bars on clear glass. The usual choice with light from behind; the field is bright and the bars are dark.
- **Negative**: clear bars in a chrome field. Less light reaches the lens, which reduces stray light and suits fluorescence and dark-field setups.

In reflected light the roles swap: chrome is the bright part. Say how you light the target and we advise the polarity.

## Ronchi rulings: one frequency everywhere

A Ronchi ruling is a field of parallel lines, all the same width and spacing. Where the USAF target has many frequencies in a small area, the ruling has one frequency over the whole field.

That makes it the tool for comparing center and edge at a fixed level of detail, and for measuring pixel size: count how many pixels a known number of lines covers.

## Glass scales: size and straightness

A glass scale is a long ruler with lithographed lines at a known pitch. Use it to set the scale of a measuring system in millimeters per pixel, and to check that the scale stays the same along an axis.

For a stage or a line-scan system, a long scale is also the reference for travel. Planned lengths go up to 1000 mm.

## Multi-pattern and concentric circles

Small plates that combine several patterns are convenient on a microscope: a scale, a grid, a resolution pattern and circles on one slide-sized plate. Concentric circles help to center an optical axis and to check that circles stay round.

## Handling

Chrome is thin and scratches. Hold the plate by its edges, keep it in its case, and clean only with lens tissue and a suitable solvent. Never wipe it dry.

These are target values. The target is made to order, and we confirm what we can build, and when, before you order.

## What to tell us

- Field of view and magnification, or pixel size on the object.
- Transmitted or reflected light.
- Pattern, polarity and plate size.

[Ask for a quote](/quote/?product=USAF%201951%2C%20Ronchi%20and%20glass%20scale%20targets) with these and we answer with a specification, a price and a delivery time.
