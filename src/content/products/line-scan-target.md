---
seoTitle: "Line-scan camera calibration target"
seoDescription: "Long chrome-on-glass strip targets for aligning and calibrating line-scan cameras: straight, sharp features along the whole scan line. Ask for a quote."
summary: "Long glass strip targets to align and calibrate your line-scan camera"
decideSpecs:
  - "Length"
  - "Pattern"
  - "Substrate"
chips:
  - "300 to 800 mm"
  - "Lines or dots"
  - "Chrome on glass"
story: "A line-scan camera sees one line at a time, so its calibration needs features that run straight and sharp along the full width of the scan. These strip targets are lithographed chrome on glass, with line or dot patterns at known pitch along their length.\n\nUse them to set focus and tilt, to measure the pixel size across the line, and to correct lens distortion along the scan. Lengths start at 300 mm and go up to 800 mm. The specifications shown are target values — tell us your field of view and resolution and we will confirm what we can build, and when."
compat:
  - { tool: "HALCON / MVTec", note: "Use the feature pitch from the datasheet for line-scan calibration" }
  - { tool: "Custom pipelines", note: "Feature positions supplied as a table" }
relatedTargets:
  - { label: "Grid distortion target", href: "/targets/grid-distortion-target/", note: "Chrome-on-glass dot grid for area cameras." }
  - { label: "Glass resolution and scale targets", href: "/targets/resolution-targets-glass/", note: "Line pairs and scales for lens benches." }
  - { label: "Backlit target", href: "/targets/backlit-target/", note: "Transmissive patterns on a light source." }
  - { label: "ChArUco, ceramic", href: "/targets/charuco-ceramic/", note: "Lithographed plate for small fields of view." }
  - { label: "HALCON plate, aluminum", href: "/targets/halcon-composite/", note: "For area cameras on the same line." }
relatedGuides:
  - { label: "Composite, ceramic or glass", href: "/guides/composite-ceramic-or-glass/", note: "Compare the tolerance with one pixel on the target." }
  - { label: "USAF 1951 lp/mm table", href: "/guides/usaf-1951-lp-mm-table/", note: "Reading resolution from line pairs." }
  - { label: "How big should your target be?", href: "/guides/calibration-target-size/", note: "Size against field of view." }
---

## What is different about a line-scan camera

A line-scan camera has a single row of pixels. The second dimension of the image comes from motion: the part moves past the camera, or the camera moves over the part, and the rows are stacked in time.

That splits calibration in two. Across the line, the camera behaves like one row of an ordinary camera, with a lens that has distortion. Along the motion, the scale is set by the transport speed and the line rate, not by the lens.

A board with a 2D pattern does not fit this well. What you need first is a row of sharp features at known positions, along the full width of the line.

## What the strip target gives you

The target is a long strip of glass with a chrome pattern: lines or dots at a known pitch. Lay it across the field so the scan line runs along it.

- **Focus and alignment**: line edges should be equally sharp from one end of the line to the other. If one end is soft, the sensor is tilted relative to the object plane.
- **Scale across the line**: count pixels between features of known spacing to get millimeters per pixel, at the center and toward the ends.
- **Distortion**: if the spacing in pixels changes along the line, that change is the lens distortion to correct.

With the strip moving through the field at production speed, the same features show whether the scale along the motion matches the scale across the line.

## Why chrome on glass

A line-scan system often resolves a few hundredths of a millimeter per pixel over a wide field. The features have to be placed more exactly than that, over the whole length.

Lithographed chrome on glass has sharp edges and holds its dimensions with temperature far better than a printed board. It also works in transmission, on a back light, which is how many web and glass inspection lines are lit.

The [substrate guide](/guides/composite-ceramic-or-glass/) compares the options with numbers.

## Choosing length and pitch

The strip should span the whole scan line, with a little to spare at both ends. Planned lengths run from 300 to 800 mm.

Choose the pitch so that each line or dot covers several pixels and there are many features along the line. A few pixels per feature is too few to place an edge well; too coarse a pitch leaves gaps in the distortion curve.

If your field is wider than the longest strip, a shorter strip can be stepped across the field, at the cost of more captures.

## Handling

Glass strips are long and thin. Support them along their length, never by the ends alone. Clean with a lens cloth and isopropyl alcohol; chrome scratches.

These are target values. The target is made to order, and we confirm what we can build, and when, before you order.

## What to tell us

- Width of the field of view and number of pixels in the line.
- Reflected or transmitted light.
- Lines or dots, and the pitch if you already have one in mind.
- How the strip will sit in your machine.

[Ask for a quote](/quote/?product=Line-scan%20camera%20calibration%20target) with these and we answer with a layout, a price and a delivery time.
