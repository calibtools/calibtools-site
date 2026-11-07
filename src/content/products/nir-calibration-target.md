---
seoTitle: "NIR calibration target, 850 / 940 nm"
seoDescription: "ChArUco and checkerboard targets that keep their contrast at 850 and 940 nm, for in-cabin DMS/OMS, ToF and industrial NIR cameras. Ask for a quote."
summary: "Calibration targets that keep their contrast under your 850 or 940 nm lighting"
decideSpecs:
  - "Wavelength"
  - "Pattern"
  - "Size"
chips:
  - "850 / 940 nm"
  - "ChArUco or checkerboard"
  - "300 × 200 to 600 × 400 mm"
story: "Many inks that look black to your eye are almost transparent in the near infrared. Under 850 or 940 nm illumination a normal board can fade until the detector loses corners. These targets use a pattern that stays dark in the NIR, so in-cabin driver and occupant monitoring cameras, ToF cameras and industrial NIR cameras see the same sharp pattern a visible camera does.\n\nWe confirm the contrast at your wavelength before production. The specifications shown are target values — tell us your wavelength, camera and working distance and we will confirm what we can deliver, and when."
compat:
  - { tool: "OpenCV", note: "≥ 4.6 · cv.aruco.CharucoBoard / findChessboardCornersSB" }
  - { tool: "ROS 2", note: "camera_calibration" }
  - { tool: "MATLAB", note: "Camera Calibrator app; detectCharucoBoardPoints (R2024a or later)" }
---
