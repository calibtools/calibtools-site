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
relatedTargets:
  - { label: "NIR calibration target", href: "/targets/nir-calibration-target/", note: "Boards that keep contrast at 850 and 940 nm." }
  - { label: "ChArUco, aluminum", href: "/targets/charuco-composite/", note: "For the intrinsics of the color camera." }
  - { label: "LiDAR-camera target", href: "/targets/lidar-camera-target/", note: "Markers and holes for a LiDAR and a camera." }
  - { label: "Reflectance panels", href: "/targets/reflectance-panel/", note: "Known reflectance to test range against brightness." }
  - { label: "Hand-eye calibration kit", href: "/targets/hand-eye-calibration-kit/", note: "When the depth camera rides on a robot." }
relatedGuides:
  - { label: "OpenCV camera calibration", href: "/guides/opencv-camera-calibration/", note: "From images to a camera matrix." }
  - { label: "Composite, ceramic or glass", href: "/guides/composite-ceramic-or-glass/", note: "Which substrate for which accuracy." }
  - { label: "What reprojection error tells you", href: "/guides/reprojection-error/", note: "And what a low value can hide." }
---

## Two different questions

A depth camera can be wrong in two ways. Its image geometry can be off, like any camera: focal length, distortion, and where it sits relative to a color camera. And the distances it reports can be off.

A flat calibration board answers the first question. It says little about the second, because a board at an unknown distance gives you nothing to compare the reported depth with. For that you need known distances built into the target.

## Step block: checking depth

A step block is a set of flat, parallel surfaces at known height differences. Point the camera at it and you get several planes in one capture.

Fit a plane to each step in the point cloud and measure the distance between neighboring planes. Compare that with the step height. The comparison does not depend on where the camera is, only on the block.

The same capture shows two more things: how noisy each plane is, and whether a flat step comes out flat or bowed.

Planned versions have three or five steps, in metal or ceramic. Step heights and surface finish are set to your camera's range and resolution.

## ToF board: geometry in the infrared

A time-of-flight camera lights the scene itself, in the near infrared, and builds its image from the returned light. Two things go wrong with an ordinary board.

The print may fade at that wavelength, as described for the [NIR target](/targets/nir-calibration-target/). And many ToF cameras report slightly different distances for dark and bright surfaces, so a black-and-white pattern is not flat in the depth image.

The ToF board is a ChArUco pattern made for the infrared image. Detect the corners in the amplitude or IR image, as you would in a color image, and use them for intrinsics and for the alignment to a color camera.

## Which sensor you have matters

- **Time of flight**: both targets apply. Avoid shiny surroundings; light that bounces twice makes corners and steps look further away than they are.
- **Structured light and active stereo**: the projector gives the surface its texture, so plain steps work.
- **Passive stereo**: a plain, even surface has nothing to match. Tell us, and the steps get a fine texture.

## Using a step block well

- Look at it square-on first, then tilted, and compare.
- Use the central part of each step. Pixels on an edge mix near and far.
- Repeat at the near and far ends of your working range; errors often grow with distance.
- Let the camera warm up. Depth readings drift in the first minutes.

These are target values. The target is made to order, and we confirm what we can build, and when, before you order.

## What to tell us

- Camera model, or its principle: time of flight, structured light or stereo.
- Working range and the depth accuracy you want to verify.
- Field of view at that range.

[Ask for a quote](/quote/?product=Depth%20and%20ToF%20camera%20calibration%20target) with these and we answer with a design, a price and a delivery time.
