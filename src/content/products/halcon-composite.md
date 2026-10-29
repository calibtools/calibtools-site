---
summary: "HALCON calibration plate with MVTec mark layout for industrial machine vision"
decideSpecs:
  - "Feature position tolerance"
  - "Substrate"
  - "Mark layout"
chips:
  - "±0.3 mm + 0.2 mm/m"
  - "6 mm"
  - "200–800 mm"
story: "The MVTec HALCON calibration plate uses a precise mark layout: a central reference circle surrounded by a regular grid of smaller dots. This layout is recognised directly by HALCON's find_caltab operator, and the full camera model — including lens distortion — is solved with calibrate_cameras.\n\nEach board ships with a matching .descr descriptor file containing the exact mark coordinates, so no manual measurement or data entry is required before running calibration."
---
