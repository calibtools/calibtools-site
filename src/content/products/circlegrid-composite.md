---
summary: "Symmetric and asymmetric circle grid calibration targets for OpenCV and HALCON"
decideSpecs:
  - "Feature position tolerance"
  - "Substrate"
  - "Grid layout"
chips:
  - "±0.3 mm + 0.2 mm/m"
  - "6 mm"
  - "200–800 mm"
story: "Circle grid targets detect features from the centroid of each dot. Centroids are computed by fitting an ellipse to the projected circle, making them robust under defocus, mild motion blur, and low-contrast lighting where corner detectors struggle.\n\nBoth symmetric and asymmetric layouts are supported natively by OpenCV's findCirclesGrid and by MVTec HALCON, covering the full range of monocular, stereo, and structured-light setups."
---
