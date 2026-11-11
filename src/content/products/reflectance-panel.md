---
seoTitle: "LiDAR reflectance panels, 905 and 1550 nm"
seoDescription: "Diffuse Lambertian panels at 10, 50 and 90 % reflectance for 905 and 1550 nm LiDAR: normalize intensity across range and angle, or run range tests. Ask us."
summary: "Lambertian reflectance panels for your LiDAR intensity calibration"
decideSpecs:
  - "Reflectance"
  - "Size"
  - "Calibration"
chips:
  - "R10/R50/R90"
  - "300 × 300 mm"
  - "±2 %"
story: "Your LiDAR reports an intensity that depends on what it hits. To make those numbers comparable across range, angle and sensor, you need a surface with a known, uniform reflectance. That is this panel.\n\nChoose 10 %, 50 % or 90 % nominal reflectance. Put two or three in the same scan and you have a multi-point intensity calibration. We set size and mounting to your test setup.\n\nReflectance is stated at your LiDAR wavelength, 905 or 1550 nm, not only in the visible. For range and detection tests, a 5- or 9-step panel puts several reflectances side by side on one 200 × 150 mm target.\n\nThe specifications shown are target values — tell us what you are testing and we will confirm availability and lead time."
compat:
  - { tool: "ROS / ROS 2", note: "Intensity normalization from the stated reflectance in your own pipeline" }
  - { tool: "Custom pipelines", note: "Reflectance at your wavelength supplied in the datasheet" }
relatedTargets:
  - { label: "LiDAR-camera target", href: "/targets/lidar-camera-target/", note: "For the position of the LiDAR relative to a camera." }
  - { label: "Depth and ToF targets", href: "/targets/depth-camera-target/", note: "Step blocks to check reported distances." }
  - { label: "Gray scale and OECF chart", href: "/targets/grayscale-oecf-chart/", note: "Neutral steps for cameras." }
  - { label: "NIR calibration target", href: "/targets/nir-calibration-target/", note: "Patterns that keep contrast at 850 and 940 nm." }
  - { label: "Radar-camera target", href: "/targets/radar-camera-target/", note: "Corner reflectors for radar." }
relatedGuides:
  - { label: "LiDAR-camera calibration", href: "/guides/lidar-camera-calibration/", note: "Where intensity and geometry meet." }
  - { label: "How big should your target be?", href: "/guides/calibration-target-size/", note: "Size against field of view." }
---

## What the panel is for

A LiDAR measures distance from the time a light pulse takes to return. How much light returns decides whether it detects a surface at all, and it is what the sensor reports as intensity.

That amount depends on the surface. A white wall sends back far more than a black car. To test a LiDAR, or to compare two of them, you need a surface whose reflectance you know. That is this panel.

## Why "Lambertian" matters

A mirror sends light in one direction. A Lambertian surface scatters it evenly, so the amount that returns to the sensor depends on the angle in a simple, known way and not on small changes in how the panel is aimed.

With such a surface, a change in the reading means a change in the sensor, the distance or the angle. It does not mean the panel happened to glint.

## Why the wavelength matters

Reflectance is not one number for a material. A surface that reflects half the visible light may reflect much more or much less in the infrared.

LiDARs work at 905 nm or 1550 nm, depending on the type. A panel described only by its visible gray level tells you little about what your LiDAR sees. The reflectance of this panel is stated at your LiDAR's wavelength.

## Choosing the reflectance

Range figures for LiDARs are usually given for a dark target, often 10 % reflectance, because dark objects are the hard case. A bright panel near 90 % shows the other end: the strongest return, where receivers can saturate.

- One dark panel: detection range tests.
- Dark and bright together: two-point check of the intensity scale.
- Dark, middle and bright in one scan: a three-point intensity calibration.

A step panel with several reflectances side by side does the same on one small target, for bench work at short range.

## Choosing the size

The laser spot grows with distance. For a clean measurement the whole spot has to land on the panel; if part of it misses, the reading mixes panel and background.

So the panel size follows from your sensor's beam divergence and the longest distance in your test. Tell us both. The planned standard size is 300 × 300 mm.

## Using it

- Face the panel square to the sensor for the reference measurement, then repeat at known angles if angle matters to you.
- Keep the surface clean and dry. Dust, fingerprints and water change the reflectance.
- Do not touch the face; handle it by the edges or the frame.
- Outdoors, note the sunlight. It adds background light the sensor has to work against.

These are target values. The target is made to order, and we confirm what we can build, and when, before you order.

## What to tell us

- LiDAR wavelength, and beam divergence if you know it.
- Test distances.
- Which reflectances, and how many panels.
- Indoor or outdoor use, and how the panel will be mounted.

[Ask for a quote](/quote/?product=LiDAR%20reflectance%20panel) with these and we answer with a design, a price and a delivery time.
