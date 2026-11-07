---
title: "Robot cell and system integration calibration"
seoTitle: "Robot cell calibration targets"
seoDescription: "Calibration targets for robot cells and system integrators: ceramic ChArUco and HALCON plates, hand-eye kits and mounts for repeatable station calibration."
code: "ROB-CELL"
order: 4
audience: "For system integrators, automation builders and robot-cell engineers."
summary: "In a cell, calibration is repeated at commissioning and after every crash or camera swap. The target has to be easy to mount and stay the same."
products:
  - "halcon-composite"
  - "charuco-ceramic"
  - "hand-eye-calibration-kit"
  - "circlegrid-composite"
  - "mounting-fixture"
links:
  - { label: "Format converter", href: "/tools/convert/" }
  - { label: "Pattern generator", href: "/tools/generator/" }
  - { label: "Request a quote", href: "/quote/" }
selection:
  - { scenario: "HALCON-based cell", pattern: "HALCON calibration plate", size: "200 × 150 to 400 × 300 mm", material: "Aluminium composite" }
  - { scenario: "OpenCV / ROS-based cell", pattern: "ChArUco", size: "110 × 85 to 230 × 140 mm", material: "Alumina ceramic" }
  - { scenario: "Hand-eye in the cell", pattern: "ChArUco with flange adapter", size: "200 × 150 mm", material: "Ceramic" }
  - { scenario: "2D measurement station", pattern: "Circle grid", size: "Sized to the field", material: "Composite" }
faq:
  - { q: "Can I use a HALCON plate instead of my 3D camera vendor’s board?", a: "That depends on the vendor’s software: some workflows only accept their own board. Check the vendor’s documentation; for HALCON workflows our HALCON plates come with the matching .descr file." }
  - { q: "Why ceramic for a cell?", a: "Ceramic is very stable with temperature and does not bend, so a board that sits in the cell for years keeps its geometry." }
  - { q: "Do you supply mounts?", a: "Yes: a ¼″ mounting fixture today, and flange adapters with the hand-eye kit. Tell us your mounting and we can quote a custom bracket." }
---

## What you calibrate

- **Camera intrinsics** at commissioning.

- **Hand-eye** between the robot and fixed or arm-mounted cameras.

- **Recalibration** after a camera swap, lens change or collision.

## What matters in a cell

Integrators need a target that is quick to mount in the same place every time and keeps its geometry for the life of the cell. Ceramic and composite boards stay flat; HALCON plates come with their .descr file so HALCON's plate finder works straight away.

Many questions in this field are about software fit, for example whether a HALCON plate can replace a 3D camera vendor's board. Tell us which software runs the cell and we will tell you which target fits, or say plainly if it does not.
