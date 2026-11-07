---
seoTitle: "Backlit calibration target, visible and IR"
seoDescription: "Glass calibration patterns over a uniform LED backlight, white or 850/940 nm: high contrast for dark cells, ToF and NIR cameras and EOL stations. Ask us."
summary: "A backlit glass pattern that stays high-contrast where front lighting fails"
decideSpecs:
  - "Pattern"
  - "Backlight"
  - "Size"
chips:
  - "Checkerboard or ChArUco"
  - "White or 850/940 nm"
  - "A4 to A2"
story: "Some cameras never get good front lighting: NIR cameras behind filters, ToF sensors, cameras in dark test cells or end-of-line stations. A backlit target emits the pattern instead of reflecting it.\n\nChrome on glass sits over a uniform LED panel, so black stays black and white stays bright at any angle. The backlight is white or a single band at 850 or 940 nm, and the pattern edges are lithographed for sharp corner detection.\n\nThe specifications shown are target values — tell us your camera, band and station layout and we will confirm what we can build, and when."
compat:
  - { tool: "OpenCV", note: "findChessboardCornersSB or CharucoDetector on the emitted pattern" }
  - { tool: "HALCON", note: "Corner point tuple for set_calib_data_calib_object" }
---
