---
title: "USAF 1951 resolution chart: lp/mm table"
description: "Line pairs per millimeter and line width for every group and element of the USAF 1951 target, how to read the chart, and how to convert to sensor resolution."
date: 2026-11-07
updated: 2026-11-07
readingTime: "5 min"
keyRule: "lp/mm = 2^(group + (element − 1) / 6). The smallest element where you can still separate all three bars is your resolution limit."
related: ["opencv-camera-calibration"]
products: ["resolution-chart"]
sampleFiles: []
faq:
  - q: "How do I calculate lp/mm from group and element?"
    a: "Resolution in line pairs per millimeter is 2 to the power of (group + (element − 1) / 6). Group 2, element 3 is 2^(2 + 2/6) = 5.04 lp/mm."
  - q: "What is the line width for an element?"
    a: "One line pair is one dark bar plus one light space, so the width of one bar is 1 / (2 × lp/mm) millimeters. At 5.04 lp/mm a bar is about 99 µm wide."
  - q: "Do the values apply on the sensor or on the chart?"
    a: "The table gives the resolution on the chart itself. To get the resolution at the sensor, multiply by the inverse of the magnification; to compare with pixel size, use the Nyquist limit of 1 / (2 × pixel pitch)."
  - q: "Is a USAF chart enough to measure MTF?"
    a: "It gives a quick limiting-resolution reading by eye. For a full MTF or SFR curve, use a slanted-edge chart such as an ISO 12233 chart."
---

The USAF 1951 target is a pattern of three-bar groups that get smaller in fixed steps. You find the smallest set of bars your system still resolves and read its resolution from the table below.

## How the chart is laid out

Bars are arranged in **groups**, and each group has six **elements**. Each element has three horizontal and three vertical bars, with spaces as wide as the bars.

From one element to the next, the spatial frequency rises by the sixth root of 2 (about 12 %). From one group to the next it doubles. Group numbers on common charts run from −2 to 7; high-resolution glass targets go to group 9.

## Formula

- **Resolution:** lp/mm = 2^(group + (element − 1) / 6)

- **Line width:** width (mm) = 1 / (2 × lp/mm)

- **Line length:** each bar is five times as long as it is wide.

## Line pairs per millimeter (lp/mm)

| Element | Group -2 | Group -1 | Group 0 | Group 1 | Group 2 | Group 3 |
|---|---|---|---|---|---|---|
| 1 | 0.250 | 0.500 | 1.00 | 2.00 | 4.00 | 8.00 |
| 2 | 0.281 | 0.561 | 1.12 | 2.24 | 4.49 | 8.98 |
| 3 | 0.315 | 0.630 | 1.26 | 2.52 | 5.04 | 10.1 |
| 4 | 0.354 | 0.707 | 1.41 | 2.83 | 5.66 | 11.3 |
| 5 | 0.397 | 0.794 | 1.59 | 3.17 | 6.35 | 12.7 |
| 6 | 0.445 | 0.891 | 1.78 | 3.56 | 7.13 | 14.3 |

| Element | Group 4 | Group 5 | Group 6 | Group 7 | Group 8 | Group 9 |
|---|---|---|---|---|---|---|
| 1 | 16.0 | 32.0 | 64.0 | 128 | 256 | 512 |
| 2 | 18.0 | 35.9 | 71.8 | 144 | 287 | 575 |
| 3 | 20.2 | 40.3 | 80.6 | 161 | 323 | 645 |
| 4 | 22.6 | 45.3 | 90.5 | 181 | 362 | 724 |
| 5 | 25.4 | 50.8 | 102 | 203 | 406 | 813 |
| 6 | 28.5 | 57.0 | 114 | 228 | 456 | 912 |

## Line width (µm)

Width of one bar or one space, in micrometers.

| Element | Group -2 | Group -1 | Group 0 | Group 1 | Group 2 | Group 3 |
|---|---|---|---|---|---|---|
| 1 | 2000 | 1000 | 500 | 250 | 125 | 62.5 |
| 2 | 1782 | 891 | 445 | 223 | 111 | 55.7 |
| 3 | 1587 | 794 | 397 | 198 | 99.2 | 49.6 |
| 4 | 1414 | 707 | 354 | 177 | 88.4 | 44.2 |
| 5 | 1260 | 630 | 315 | 157 | 78.7 | 39.4 |
| 6 | 1122 | 561 | 281 | 140 | 70.2 | 35.1 |

| Element | Group 4 | Group 5 | Group 6 | Group 7 | Group 8 | Group 9 |
|---|---|---|---|---|---|---|
| 1 | 31.2 | 15.6 | 7.81 | 3.91 | 1.95 | 0.977 |
| 2 | 27.8 | 13.9 | 6.96 | 3.48 | 1.74 | 0.870 |
| 3 | 24.8 | 12.4 | 6.20 | 3.10 | 1.55 | 0.775 |
| 4 | 22.1 | 11.0 | 5.52 | 2.76 | 1.38 | 0.691 |
| 5 | 19.7 | 9.84 | 4.92 | 2.46 | 1.23 | 0.615 |
| 6 | 17.5 | 8.77 | 4.38 | 2.19 | 1.10 | 0.548 |

## How to read it

Image the chart in focus and evenly lit. Start at the large groups and move to smaller ones. The limit is the smallest element where you can still see all three bars as separate, in both the horizontal and the vertical set.

Check the center and the corners of the field: lenses usually resolve less at the edge. If horizontal and vertical bars stop at different elements, the lens may have astigmatism or the sensor may be sampling unevenly.

## From chart to sensor

The table gives resolution on the chart. With optical magnification M (image size ÷ object size), the frequency on the sensor is the chart value ÷ M.

Compare that with the sensor's Nyquist limit, 1 / (2 × pixel pitch). A 3.45 µm pixel gives 1 / (2 × 0.00345 mm) ≈ 145 lp/mm on the sensor. If the optics resolve more than this, the sensor is the limit.

## Worked example

A 2/3" camera with 3.45 µm pixels views a USAF chart at 0.5× magnification. The finest element where all bars separate is group 5, element 1: 32.0 lp/mm on the chart, bars 15.6 µm wide.

At the sensor that is 32.0 ÷ 0.5 = 64 lp/mm, well under the 145 lp/mm Nyquist limit, so here the lens or focus limits resolution, not the pixels.

## Beyond limiting resolution

A USAF reading is quick but depends on the person looking at it and on contrast.

For a measured MTF or SFR curve across the field, use a slanted-edge chart such as our [ISO 12233 resolution chart](/targets/resolution-chart/). For geometric calibration, see [camera calibration with OpenCV](/guides/opencv-camera-calibration/).
