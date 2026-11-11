---
title: "Composite, ceramic or glass substrate"
description: "Flatness, thermal expansion, glare, size and cost of aluminum composite, ceramic and glass calibration targets compared, and how to tell which one you need."
date: 2026-10-22
updated: 2026-11-11
readingTime: "9 min"
keyRule: "Compare the target's tolerance with the size of one pixel on the board. If the tolerance is a fraction of a pixel, composite is enough; if it spans several pixels and you need measurement-grade results, go to ceramic. Choose glass when you need backlighting."
related: ["printed-target-costs-half-a-pixel", "calibration-target-size", "reprojection-error", "charuco-vs-checkerboard-vs-aprilgrid"]
products: ["charuco-composite", "charuco-ceramic"]
sampleFiles: ["datasheet"]
faq:
  - q: "Is a ceramic calibration target worth the price?"
    a: "When one pixel covers less than about a tenth of a millimeter on the board, a composite board's ±0.3 mm tolerance spans several pixels and ceramic's ±2 µm target does not. That is typical of close-range, high-magnification and metrology work. For robot cells and wide fields of view, composite is the better buy."
  - q: "Does thermal expansion of the target affect camera calibration?"
    a: "A uniform expansion only scales the board, which leaves the intrinsics unchanged and scales every distance the camera reports. Aluminum composite grows about 0.07 mm over 300 mm for a 10 °C change, ceramic about a third of that. Let the board reach room temperature, or enter the size at the temperature you calibrate at."
  - q: "Can I use a glass calibration target with flash lighting?"
    a: "Front-lit, the glass surface reflects like a mirror, so a flash near the lens puts a bright spot on the board whenever it faces the camera. Glass targets are at their best backlit. For flash work, use a matte surface and tilt the board or move the light off the lens axis."
  - q: "How flat does a calibration board need to be?"
    a: "Flat enough that its bow is small next to a pixel on the board, and above all stable. A rigid board with a constant small bow can be modeled; a sheet that flexes from one image to the next cannot. In our synthetic test, 0.1 mm of bow on an A4 board cost 0.1 px and 0.2 % focal length with a 5 MP camera."
  - q: "What is the largest ceramic calibration target?"
    a: "Our ceramic ChArUco boards go up to 230 × 140 mm. For a field of view much wider than about 400 mm, use a composite board, which goes to 800 × 600 mm as standard and 1200 × 800 mm on request."
---

All three substrates carry the same patterns; what differs is how accurately the pattern sits on the board, how flat the board is and stays, how it behaves with temperature and light, how big it can be and what it costs. This guide puts the numbers side by side and gives a rule for choosing.

## Side by side

| | Aluminum composite | Ceramic | Glass |
|---|---|---|---|
| How the pattern is made | UV printed, matte black on white | Chrome lithographed on alumina | Chrome lithographed on glass |
| Feature tolerance | ±0.3 mm + 0.2 mm/m | ±2 µm (target) | Quoted per job |
| Flatness | ≤ 0.5 mm per meter (three-point support) | ≤ 20 µm over the pattern area | Quoted per job |
| Thermal expansion | ≈ 24 µm/(m·°C) | ≈ 7.2 µm/(m·°C) | ≈ 9 (soda-lime), 3.3 (borosilicate) µm/(m·°C) |
| Thickness | 6 mm | 3 mm | Quoted per job |
| Sizes | 200 × 150 to 800 × 600 mm; up to 1200 × 800 mm on request | 110 × 85 to 230 × 140 mm | On request |
| Surface | Matte print | Low-gloss blue-black chrome on white | Glossy glass; can be backlit |
| Operating temperature | −50 to +80 °C | −50 to +200 °C | Depends on the glass |
| Price | Lowest per area | Several times a larger composite board; see the product page | Quoted per job |

The composite and ceramic values are our published specifications. Glass expansion values are typical for the material: about 9 µm/(m·°C) for soda-lime glass and 3.3 for borosilicate glass. Glass targets are not in our shop yet; we quote them on request.

## Accuracy: compare the tolerance with one pixel

A target's tolerance only matters relative to what your camera can see. Work out how much of the board one pixel covers: the width of the field of view at the working distance divided by the image width in pixels.

| Setup (5 MP camera, 2448 px wide) | Field of view | One pixel on the board | Composite ±0.3 mm in pixels | Ceramic ±2 µm in pixels |
|---|---|---|---|---|
| Robot cell | 1000 mm | 0.41 mm | 0.7 px | 0.005 px |
| Bench vision | 300 mm | 0.12 mm | 2.4 px | 0.02 px |
| Close range, medical, metrology | 100 mm | 0.04 mm | 7 px | 0.05 px |

The composite tolerance is a bound on any corner, not a typical error, and much of it is a scale error across the board.

A pure scale error leaves the intrinsics and the reprojection error untouched and scales every distance the camera reports, as the [printed target guide](/guides/printed-target-costs-half-a-pixel/) shows; entering the measured board size removes it.

What is left shows up as residual and as bias in the fitted model.

So the rule of thumb: if the composite tolerance is below a pixel on the board, composite is enough. If it spans several pixels and the calibration feeds a measurement, ceramic takes the target out of your error budget.

Ceramic also suits small fields of view for a practical reason: its largest board is 230 × 140 mm, which matches fields of view up to roughly 400 mm (see [choosing the target size](/guides/calibration-target-size/)).

## Flatness: stable matters more than perfect

A board that is not flat is fitted as if it were, and the difference shows up as reprojection error and as a biased focal length. In the synthetic test from the printed target guide (5 MP camera, A4-sized board, 20 views), a cylindrical bow across the board did this:

| Bow at the center | RMS | Focal length error |
|---|---|---|
| 0 (flat) | 0.07 px | 0.00 % |
| 0.02 mm | 0.07 px | −0.05 % |
| 0.1 mm | 0.11 px | −0.23 % |
| 0.15 mm | 0.14 px | −0.34 % |
| 0.5 mm | 0.40 px | −1.1 % |
| 1 mm | 0.79 px | −2.2 % |

A 300 mm composite board within its 0.5 mm per meter specification can bow up to about 0.15 mm; ceramic's 20 µm is down at the noise. The bigger difference between a rigid board and a print, though, is that a rigid board keeps the same shape in every image.

A constant shape can be measured, or estimated during calibration with OpenCV's `calibrateCameraRO`, which in our test recovered the focal length to 0.01 % for bows up to 2 mm. A sheet that flexes as it is moved cannot be corrected either way.

Mounting matters too. A board clamped hard at its edges, or bonded to a frame of a different material, can bend when the temperature changes. Support it at three points or by a single central mount designed for it.

## Temperature and humidity

Every substrate grows with temperature. For a 10 °C change:

| Material | Expansion | Over 300 mm | Over 800 mm |
|---|---|---|---|
| Aluminum composite | ≈ 24 µm/(m·°C) | 0.072 mm | 0.19 mm |
| Soda-lime glass | ≈ 9 µm/(m·°C) | 0.027 mm | 0.072 mm |
| Alumina ceramic | ≈ 7.2 µm/(m·°C) | 0.022 mm | 0.058 mm |
| Borosilicate glass | ≈ 3.3 µm/(m·°C) | 0.010 mm | 0.026 mm |

A uniform expansion is a scale error: it does not change the intrinsics, it changes the distances. On a composite board it reaches the size of the print tolerance only over large boards and large temperature swings.

Two habits take care of it: let the board settle at room temperature before a precise run, and if you calibrate far from 20 °C, scale the board dimensions for the temperature.

None of the three takes up moisture the way paper does, which is the main reason paper drifts between sessions. Ceramic and glass are also inert to common solvents.

## Glare, flash and backlight

Glare is the failure people meet first. A specular reflection lands in the image when the board's surface faces halfway between the light and the camera; with a flash or ring light next to the lens, that means whenever the board faces the camera.

- **Composite** has a matte print, which scatters light instead of mirroring it. It is the easiest of the three under flash and bench lights.
- **Ceramic** has a low-gloss chrome pattern on a white ceramic surface, designed for front lighting. Under a direct flash, tilt the board slightly or move the light off the lens axis.
- **Glass** is glossy. Front-lit, it acts as a mirror for the flash. Its strength is transmitted light: with a backlight, chrome-on-glass gives very high contrast and no surface reflection at all. That is why microscopy and lens-test targets are usually glass.

We do not publish gloss values for our surfaces yet. If your setup has a gloss limit, such as a maximum reading on a 60° or 85° gloss meter, tell us when you ask for a quote.

## Size and weight

Composite boards run from 200 × 150 mm to 800 × 600 mm as standard and up to 1200 × 800 mm on request, at about 6.6 kg/m² (a 300 × 200 mm board weighs about 0.4 kg).

For fields of view beyond about 1.3 m, several boards with distinct marker IDs work better than one huge panel; see the [multi-board guide](/guides/multi-board-marker-ids/).

Ceramic stops at 230 × 140 mm. Glass is quoted per job; at about 2.5 g/cm³, a 3 mm glass plate weighs about 7.6 kg/m², close to composite, but it needs more care in handling and shipping.

## Which one

**Choose composite** for robot cells, ADAS and vehicle stations, depth cameras, multi-camera rigs and most machine-vision work: fields of view from a few hundred millimeters to meters, handling on the shop floor or in the field, and flash or bench lighting.

[ChArUco on composite](/targets/charuco-composite/).

**Choose ceramic** when a pixel covers less than about a tenth of a millimeter on the board: close-range and high-magnification optics, medical imaging, metrology, semiconductor inspection, or work above 80 °C. [ChArUco on ceramic](/targets/charuco-ceramic/).

**Choose glass** when you need backlighting, a transmissive target for a microscope or lens bench, or the low expansion of borosilicate glass. [Glass resolution and scale targets](/targets/resolution-targets-glass/), or [ask for a quote](/quote/) for a glass calibration pattern.

If you are still on a printed sheet, start with the [printed target guide](/guides/printed-target-costs-half-a-pixel/): it shows which of the three failures of a print a rigid board removes.
