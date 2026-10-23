---
title: Composite boards
description: "200–1200 mm, rigid aluminium composite, UV-printed matte pattern, outdoor-safe."
sellingPoints:
  - "UV-printed on rigid aluminium composite — flat, lightweight, durable"
  - "Every board ships with an inspection report and config files for OpenCV, Kalibr, ROS 2 and HALCON"
color: brand
pairsWith:
  - mounting-fixture
  - certificate-ilac
specsTable:
  - { label: "Substrate", value: "Aluminium composite (PE core)" }
  - { label: "Thickness", value: "6 mm" }
  - { label: "Print", value: "UV flatbed, matte finish" }
  - { label: "Feature tolerance", value: "±0.3 mm" }
  - { label: "Flatness", value: "< 0.5 mm over 600 mm" }
  - { label: "Operating temperature", value: "-20 to +80 °C" }
  - { label: "Weight (300 × 200)", value: "~250 g" }
founderQuote: "I started Calib.Tools because I kept wasting afternoons printing targets on paper and taping them to foam board. Every board we ship is the one I wish I could have ordered on day one."
---

## Overview

Composite calibration boards are the everyday workhorse for camera calibration. The aluminium composite substrate stays flat across a wide temperature range and survives workshop handling without chipping or warping.

UV flatbed printing delivers crisp edges at ±0.3 mm feature accuracy — more than sufficient for most machine-vision and robotics applications. Each board ships with a dimensional inspection report so you can verify accuracy out of the box.

Available as Checkerboard and ChArUco patterns in sizes from 200 × 150 mm to 800 × 600 mm, with larger custom sizes on request.

## Specifications

General specifications for the composite substrate are shown in the table above. Per-product geometry (grid size, square size, marker size, dictionary) is listed in each product group below.

## Files

Every composite board comes with:

- **Datasheet PDF** — dimensions, tolerances, material properties
- **Inspection report** — measured feature positions from coordinate measurement
- **Config files** — OpenCV JSON, Kalibr YAML, ROS 2 YAML, HALCON description

Config files are generated to match the exact geometry of your board and can be downloaded from the product page.

## Cleaning & care

- Wipe with a soft, dry or lightly damp cloth. Avoid solvents.
- Store flat or hang from the mounting hole. Do not stack heavy objects on the board surface.
- The matte UV print is scratch-resistant but not scratch-proof. Avoid sliding the board across rough surfaces.
- Suitable for indoor and outdoor use. Prolonged UV exposure (months) may cause slight yellowing of the white areas; this does not affect calibration accuracy.

## FAQ

**Can I use composite boards outdoors?**
Yes. The aluminium composite substrate and UV print are weather-resistant. For permanent outdoor installations, consider a protective clear coat.

**What is the largest size available?**
Standard sizes go up to 800 × 600 mm. Custom sizes up to 1200 × 800 mm are available on request — contact us for a quote.

**How does ±0.3 mm compare to ceramic targets?**
Ceramic targets achieve ±1–2 µm (roughly 100× tighter). For most robotics and industrial vision tasks, ±0.3 mm is more than adequate. Choose ceramic when your application demands sub-pixel accuracy or traceable calibration.
