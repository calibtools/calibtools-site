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
---
