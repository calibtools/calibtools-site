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
relatedTargets:
  - { label: "ChArUco, ceramic", href: "/targets/charuco-ceramic/", note: "Full camera calibration for small fields." }
  - { label: "USAF 1951 and glass targets", href: "/targets/resolution-targets-glass/", note: "Resolution and scale on glass." }
  - { label: "Line-scan target", href: "/targets/line-scan-target/", note: "Long strips for line-scan cameras." }
  - { label: "Backlit target", href: "/targets/backlit-target/", note: "Calibration patterns on a light source." }
  - { label: "Circle grid, aluminum", href: "/targets/circlegrid-composite/", note: "Dot grids for larger fields." }
relatedGuides:
  - { label: "Composite, ceramic or glass", href: "/guides/composite-ceramic-or-glass/", note: "Compare the tolerance with one pixel on the target." }
  - { label: "What reprojection error tells you", href: "/guides/reprojection-error/", note: "Reading residuals." }
  - { label: "OpenCV camera calibration", href: "/guides/opencv-camera-calibration/", note: "When you need the full camera model." }
---

## What distortion is, and how a grid shows it

A lens with distortion images a straight line as a slight curve, and it magnifies the edge of the field a little more or less than the center. For inspection that is harmless. For measurement it is an error that grows toward the corners.

A grid makes it visible. Every intersection or dot sits at a known position on the plate. Find them in the image, compare where they are with where they should be, and the differences across the field are the distortion.

## A map, or a camera model

There are two ways to use those differences.

- **A correction map**: store the measured offsets and correct every image with them. This is the usual way for telecentric lenses and fixed measuring stations, where the object is always at the same distance.
- **A camera model**: fit distortion coefficients together with the other camera parameters, as OpenCV and HALCON do. For that, a [ChArUco plate](/targets/charuco-ceramic/) at several tilts is the better target.

The grid target is made for the first use, with one image, square to the lens, in the plane where you measure.

## Cross grid or dots

- **Cross grid**: fine lines in both directions. Line-fitting software locates intersections very precisely, and you can see curvature by eye.
- **Dot grid**: round dots. Point detectors such as OpenCV's circle-grid finder and HALCON's operators expect dots, and a dot's center is found reliably even when the image is slightly soft.

Choose the one your software reads.

## Choosing the pitch

Two things pull in opposite directions. Each line or dot has to cover several pixels to be located well. And you want many points across the field, or the map between them is only a guess.

Work from the pixel size on the object: your field of view divided by the number of pixels. Pick a pitch that puts a comfortable number of pixels on each feature and still gives a few dozen points across the field. The planned range of pitches runs from 0.5 to 10 mm.

The plate should cover the whole field with a margin. Distortion is largest in the corners, and that is where you most need points.

## Why glass

On a small field, a few micrometers on the target are a visible fraction of a pixel. Lithographed chrome on glass places features far more exactly than print and keeps its size as the temperature changes.

Glass also works with light from behind, which is how most telecentric measuring stations are lit. The [substrate guide](/guides/composite-ceramic-or-glass/) shows where print stops being good enough.

## Using it

- Put the plate in the measuring plane, square to the optical axis.
- Use the same lighting, aperture and focus as in production. Distortion changes with focus.
- Keep the plate clean; a speck of dust near a dot shifts its center.
- Repeat the map after any change to the lens or its mount.

These are target values. The target is made to order, and we confirm what we can build, and when, before you order.

## What to tell us

- Field of view and sensor resolution.
- Lens type: telecentric or standard.
- Cross grid or dots, and the light you use.

[Ask for a quote](/quote/?product=Grid%20distortion%20target) with these and we answer with a pitch, a plate size, a price and a delivery time.
