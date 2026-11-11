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
relatedTargets:
  - { label: "NIR calibration target", href: "/targets/nir-calibration-target/", note: "Reflective boards for 850 and 940 nm." }
  - { label: "ChArUco, aluminum", href: "/targets/charuco-composite/", note: "The standard front-lit board." }
  - { label: "ChArUco, ceramic", href: "/targets/charuco-ceramic/", note: "Lithographed plate for small fields." }
  - { label: "Depth and ToF targets", href: "/targets/depth-camera-target/", note: "Boards and step blocks for depth cameras." }
  - { label: "Grid distortion target", href: "/targets/grid-distortion-target/", note: "Glass grids, often used on a back light." }
relatedGuides:
  - { label: "Why your board is not detected", href: "/guides/corner-detection-troubleshooting/", note: "Contrast, blur and exposure limits." }
  - { label: "ChArUco vs checkerboard vs AprilGrid", href: "/guides/charuco-vs-checkerboard-vs-aprilgrid/", note: "Which pattern for which job." }
  - { label: "OpenCV camera calibration", href: "/guides/opencv-camera-calibration/", note: "From images to a camera matrix." }
---

## When front lighting is the problem

An ordinary calibration board only reflects the light that falls on it. That is fine on a bench with good lamps. It fails in a few common places.

- A camera behind a narrow infrared filter sees almost none of the room light.
- In a dark test cell or an end-of-line station there is no room for lamps.
- Front light on a board near the lens produces glare right where the pattern is.
- With little light, exposure times get long and every vibration blurs the corners.

A backlit target avoids all four. It does not depend on light from the room; it is the light source.

## How it works

The pattern is chrome on glass, placed over an even light panel. Where there is chrome, no light comes through. Where the glass is clear, the camera looks straight at the panel.

Dark areas are dark whatever the room does, and bright areas are as bright as you set them. The contrast does not change with the viewing angle the way a reflection does, and there is no glare, because nothing is being reflected.

## What that gives you

- **Short exposures.** The bright areas are bright enough to freeze motion and vibration.
- **The same image every time.** Stations in different rooms, or on different days, see the same contrast.
- **Clean edges.** The chrome edge is sharp, so corner positions are well defined.

## White or infrared

Match the light to the camera. For a visible-light camera, white. For a camera with an 850 or 940 nm filter, a panel that emits in that band, so the image is as bright as it will be in operation.

If one station serves both kinds of camera, say so. A light that covers both bands can be considered.

## Pattern and size

The pattern is a checkerboard or a ChArUco layout, in planned sizes from A4 to A2. Choose as you would for a front-lit board: [ChArUco](/targets/charuco-composite/) if the target is sometimes cut off by the image edge, checkerboard if it is always fully in view.

The plate should fill a good part of the image at your working distance. The [FOV calculator](/tools/fov/) gives the field for your lens.

## Using it well

- Set the brightness so the clear areas are just below saturation. Overexposed bright areas spread into the dark ones and move the edges.
- Let the panel warm up; its brightness settles after a few minutes.
- Check that the light is even across the plate. A dim corner lowers contrast there.
- Tilt the plate between captures as with any board. The calibration needs different views.
- Keep the glass clean. On a back light, every speck shows.

These are target values. The target is made to order, and we confirm what we can build, and when, before you order.

## What to tell us

- Camera, lens and working distance.
- Band: white, 850 nm or 940 nm, and any filter on the camera.
- Pattern and size.
- How the target will be mounted in your station, and the power available.

[Ask for a quote](/quote/?product=Backlit%20calibration%20target) with these and we answer with a design, a price and a delivery time.
