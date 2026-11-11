---
seoTitle: "24-patch color chart for ISP tuning"
seoDescription: "A 24-patch color chart for camera module and ISP work: matte patches with measured reflectance and L*a*b* data, A3, reflective or backlit. Ask for a quote."
summary: "A 24-patch color chart with measured patch data for your ISP and camera module tuning"
decideSpecs:
  - "Patches"
  - "Data"
  - "Size"
chips:
  - "24 patches"
  - "Measured L*a*b*"
  - "A3"
story: "Tuning an ISP or qualifying a camera module needs a color reference whose patch values you actually know. This chart has 24 matte patches: six neutral steps and eighteen chromatic patches spanning skin, foliage, sky and saturated primaries.\n\nEach chart ships with the measured reflectance and L*a*b* values of its own patches, so your color-correction matrix is fitted to the chart in front of the camera, not to a published nominal.\n\nA3 reflective is standard; a backlit version for darkroom benches is available on request. The specifications shown are target values — tell us your illuminant and bench and we will confirm what we can build, and when."
compat:
  - { tool: "Imatest / iQ-Analyzer", note: "Load the supplied patch values as a custom reference" }
  - { tool: "OpenCV", note: "mcc module detects the 24-patch layout; use the supplied values for the CCM fit" }
  - { tool: "Custom pipelines", note: "Patch values supplied as CSV" }
relatedTargets:
  - { label: "Gray scale and OECF chart", href: "/targets/grayscale-oecf-chart/", note: "Tone curve and noise before color." }
  - { label: "ISO 12233 chart", href: "/targets/resolution-chart/", note: "Sharpness of the whole system." }
  - { label: "Backlit target", href: "/targets/backlit-target/", note: "When there is no room for front lighting." }
  - { label: "Siemens star and focus chart", href: "/targets/focus-siemens-star-chart/", note: "Set focus before you measure color." }
  - { label: "Reflectance panels", href: "/targets/reflectance-panel/", note: "Known reflectance in the infrared." }
relatedGuides:
  - { label: "OpenCV camera calibration", href: "/guides/opencv-camera-calibration/", note: "Geometry, the other half of calibration." }
  - { label: "Composite, ceramic or glass", href: "/guides/composite-ceramic-or-glass/", note: "Which substrate for which job." }
---

## What a color chart is for

A sensor does not see color the way people do. Its red, green and blue channels have their own sensitivities, and the raw values have to be converted before a face looks like a face.

That conversion is tuned against a reference: a set of colored patches whose true values are known. Photograph the patches, compare what the camera recorded with what they are, and compute the correction that brings one to the other.

## The 24 patches

The layout has six neutral patches from white to black and eighteen colored ones. The colored patches include skin tones, foliage, sky, and saturated red, green, blue, cyan, magenta and yellow.

The neutral row sets white balance and checks the tone curve. The colored patches are what the color-correction matrix is fitted to. The same shot afterwards tells you how far each patch still is from its true value.

## Why measured data comes with each chart

Published values for a chart design are averages. Every print run differs a little, and prints change with age.

This chart comes with the measured values of its own patches: reflectance over wavelength and L\*a\*b\* values. Your correction is fitted to the chart in front of your camera. With the spectral data you can also compute the patch colors under your own light source.

## Lighting decides the result

Patch values describe the surface. What the camera sees also depends on the light.

- Use the light you tune for, and note what it is. A correction fitted under daylight does not hold under warm LED light.
- Light the chart evenly, typically with two lamps at about 45° from either side.
- Keep reflections off the surface. The patches are matte, but a lamp near the camera axis still lifts the dark patches.
- Expose so that the white patch is not clipped. A clipped channel makes the fit wrong.
- Keep colored walls and clothing away; they tint the light that reaches the chart.

## Looking after it

Pigments fade in light. Store the chart in its sleeve, in the dark, and do not leave it under the lamps between sessions. Do not touch the patches; skin oil changes them.

If the chart is used daily, re-measure it from time to time or replace it. A reference you no longer trust is worse than none.

## Versions

The planned standard is a reflective A3 chart. A backlit version for darkroom benches is possible; say so in your request.

These are target values. The target is made to order, and we confirm what we can build, and when, before you order.

## What to tell us

- Your light source or sources.
- Field of view and working distance, so the patches are large enough in the image.
- The data format your tuning software reads.

[Ask for a quote](/quote/?product=24-patch%20color%20chart) with these and we answer with a specification, a price and a delivery time.
