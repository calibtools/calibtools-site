---
seoTitle: "Grid distortion target, chrome on glass"
seoDescription: "Cross-grid and dot-grid distortion targets on glass: known pitch across the whole field for lens distortion mapping and 2D measurement checks. Ask for a quote."
summary: "Glass cross-grid targets with known pitch for mapping your lens distortion"
decideSpecs:
  - "Pattern"
  - "Pitch"
  - "Size"
chips:
  - "Cross grid or dots"
  - "0.5 to 10 mm"
  - "50 to 300 mm"
story: "A grid target turns distortion into something you can see and measure: every line should be straight and every intersection should sit at a known position. Fit the detected intersections against the nominal grid and the residual map is your distortion field.\n\nThe grid is lithographed chrome on glass so the pitch holds across the field, and the plate works in transmitted light on a lightbox or in reflection. Choose a cross grid for line-based fits or a dot grid for OpenCV and HALCON point detectors.\n\nThe specifications shown are target values — tell us your field of view and pixel size and we will confirm what we can build, and when."
compat:
  - { tool: "OpenCV", note: "findCirclesGrid on the dot version; line fitting on the cross grid" }
  - { tool: "HALCON", note: "Grid intersections as a point tuple for set_calib_data_calib_object" }
  - { tool: "MATLAB", note: "detectCircleGridPoints on the dot version" }
---
