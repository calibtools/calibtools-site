---
seoDescription: "Clamp any Calib.Tools board, composite or ceramic, onto your tripod or lab post. Aluminum fixture with a ¼″-20 thread and soft jaws from 2 to 16 mm."
summary: "¼″ fixture that clamps any of our boards onto your tripod or lab post"
decideSpecs:
  - "Material"
  - "Weight"
  - "Mounting"
chips:
  - "¼″-20"
  - "2–16 mm jaws"
  - "≤ 800 × 600"
story: "Your board needs to sit still and square to the camera while you capture. This fixture clamps any of our boards by the edge, composite or ceramic, and mounts on a standard ¼″-20 tripod screw or lab post.\n\nThe soft jaws hold ceramic without chipping it. Our ceramic targets have no mounting holes, so this is how you mount them."
relatedTargets:
  - { label: "ChArUco, aluminum", href: "/targets/charuco-composite/", note: "Boards from 200 × 150 to 800 × 600 mm." }
  - { label: "ChArUco, ceramic", href: "/targets/charuco-ceramic/", note: "No mounting holes; clamp it by the edge." }
  - { label: "Checkerboard, aluminum", href: "/targets/checkerboard-composite/", note: "The simplest pattern, when the whole board stays in view." }
  - { label: "AprilGrid, aluminum", href: "/targets/aprilgrid-composite/", note: "Stands still while the sensor rig moves." }
  - { label: "Hand-eye calibration kit", href: "/targets/hand-eye-calibration-kit/", note: "For a board on a robot flange instead of a tripod." }
relatedGuides:
  - { label: "OpenCV camera calibration", href: "/guides/opencv-camera-calibration/", note: "From images to a camera matrix, step by step." }
  - { label: "Why your board is not detected", href: "/guides/corner-detection-troubleshooting/", note: "Measured limits for blur, tilt and resolution." }
  - { label: "How big should your target be?", href: "/guides/calibration-target-size/", note: "The 60 % fill rule." }
---

## Why mount the board at all

A hand-held board moves during the exposure. Even a small shake smears the corners, and a smeared corner is found a fraction of a pixel away from where it is. The [troubleshooting guide](/guides/corner-detection-troubleshooting/) shows how quickly blur costs you detections.

On a tripod the board is still, so you can use a longer exposure and a smaller aperture. You also get both hands free to move the camera, and you can come back to the same setup the next day.

## What it holds

The jaws open from 2 to 16 mm and are 120 mm wide. That covers every board we make, from a 3 mm [ceramic plate](/targets/charuco-ceramic/) to a 6 mm [aluminum composite board](/targets/charuco-composite/) and thicker honeycomb panels up to 15 mm.

The jaw faces are soft TPU. They grip ceramic and glass without chipping the edge, and because they press along the full 120 mm, a composite board is not loaded at one point.

Our ceramic targets have no mounting holes; drilling ceramic is a risk to the plate. This fixture is how you mount them.

## How large a board it carries

Clamped on its long edge, one fixture carries a composite board up to 800 × 600 mm, which weighs about 3.2 kg. The static load rating is 5 kg with the board vertical.

For boards of 600 mm and larger, a single clamp holds the weight but the far edge can sway when you touch it. Use two fixtures on a cross-bar, or rest the lower edge on a support.

If you carry the board by the fixture, stay at 400 × 300 mm or smaller, and do not carry ceramic or glass this way at all.

## Threads

The base has a ¼″-20 UNC thread, 7 mm deep. That is the screw on photo tripods, light stands and most articulated arms. A 3/8″-16 adapter bushing is in the box for larger tripod heads and microphone-style stands.

On an optical table, a ¼″-20 post screws straight in.

## Mounting a board

1. Open the jaws with the thumb screw and push the board edge in to the stop, at least 15 mm deep.

2. Tighten by hand until the soft jaws compress slightly. Do not use a tool on the thumb screw with ceramic or glass.

3. Screw the fixture onto the tripod head and lock the head before you let go of the board.

4. Push the top of the board gently. If it turns in the jaws, seat it deeper; do not tighten harder.

Center the clamp on the edge, and never clamp across the printed face.

## What is in the box

The fixture, the 3/8″ bushing and a 3 mm hex key. The body is black anodized 6061 aluminum and weighs 180 g, so it adds little to a tripod head. It works from −20 to +60 °C.

Replacement jaws are available; [write to us](/contact/) if yours wear.

## When you need something else

To put a board on a robot flange, the [hand-eye calibration kit](/targets/hand-eye-calibration-kit/) has an adapter plate for that. For a fixed installation with a threaded insert in the back of the board, [ask for a quote](/quote/) and tell us the thread and position.
