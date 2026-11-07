---
title: "Research and education"
seoTitle: "Calibration targets for research and teaching"
seoDescription: "Calibration targets and free tools for research groups, courses and individual developers: rigid ChArUco, checkerboard and AprilGrid boards, free generator."
code: "EDU"
order: 11
audience: "For university research groups, lab courses and individual developers."
summary: "Start with the free tools and a printed pattern. When results need to be repeatable, move to a rigid board made to known dimensions."
products:
  - "charuco-composite"
  - "checkerboard-composite"
  - "aprilgrid-composite"
  - "charuco-ceramic"
links:
  - { label: "Camera calibration with OpenCV", href: "/guides/opencv-camera-calibration/" }
  - { label: "Pattern generator", href: "/tools/generator/" }
  - { label: "FOV calculator", href: "/tools/fov/" }
  - { label: "Detection check", href: "/tools/check/" }
selection:
  - { scenario: "First experiments", pattern: "Printed ChArUco from the generator", size: "A4 / A3", material: "Paper on a flat board" }
  - { scenario: "Repeatable lab results", pattern: "ChArUco or checkerboard", size: "300 × 200 mm", material: "Aluminium composite" }
  - { scenario: "Camera–IMU (Kalibr)", pattern: "AprilGrid", size: "400 × 300 mm", material: "Aluminium composite" }
  - { scenario: "Small-scale precision work", pattern: "ChArUco", size: "110 × 85 to 230 × 140 mm", material: "Alumina ceramic" }
faq:
  - { q: "Why does findChessboardCorners never find my board?", a: "Common causes: the pattern size is given in squares instead of inner corners, the board has no white border, or it is too small or blurred in the image. Our OpenCV guide covers each case." }
  - { q: "Can I calibrate with a pattern on a screen?", a: "For quick tests, yes, but screens reflect and you cannot tilt them freely. For real calibration use a printed or rigid board you can move." }
  - { q: "Which ChArUco dictionary should I use?", a: "DICT_6X6_250 is a robust default. Small dictionaries like 4×4 decode at lower resolution but are more prone to false detections." }
---

## Where to start

Generate a pattern with the free [pattern generator](/tools/generator/), print it at 100 %, glue it to something flat and follow the [OpenCV calibration guide](/guides/opencv-camera-calibration/). That is enough to learn the method and get a working calibration.

## When to move to a rigid board

Paper bends and printers scale slightly. When you need results that repeat between sessions, or you publish numbers, a rigid board with known dimensions removes the target as a source of error.

## Common problems

Most beginner problems are detection failures: the wrong pattern size, a missing white border, the wrong dictionary or a board that is too small in the image. The free [detection check](/tools/check/) shows whether a pattern is detected before you collect a full data set.
