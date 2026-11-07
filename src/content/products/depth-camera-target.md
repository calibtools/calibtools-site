---
seoTitle: "Depth and ToF camera calibration targets"
seoDescription: "Step blocks with known heights and NIR-uniform ChArUco boards to check ToF, structured-light and stereo depth cameras. Built to your range — ask for a quote."
summary: "Known depth steps and NIR-uniform boards to check your depth camera"
decideSpecs:
  - "Type"
  - "Steps"
  - "Material"
chips:
  - "Step block or ToF board"
  - "3 or 5 steps"
  - "Metal or ceramic"
story: "A depth camera has two things to get right: the image geometry and the distances it reports. A step block gives you flat surfaces at known height differences, so you can check depth accuracy and flatness in one capture. A ToF board is a ChArUco target with uniform reflectance in the near infrared, so the camera's own illumination does not bias the corners.\n\nStep blocks come in metal or ceramic with three or five steps; ToF boards in 300 × 200 and 600 × 400 mm. We set the step heights and finish to your range. The specifications shown are target values — tell us about your camera and we will confirm what we can build, and when."
compat:
  - { tool: "OpenCV", note: "CharucoDetector on the amplitude / IR image" }
  - { tool: "Open3D / PCL", note: "Plane fitting on each step for depth checks" }
  - { tool: "Vendor SDKs", note: "Use the step heights from the datasheet as reference" }
---
