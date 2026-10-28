# NAV-1 Navigation Tree

**Status:** Untested (tree-test kit built, awaiting 5-8 engineer sessions)

Labels chosen from user vocabulary (evidence table 1b) where a match exists.
Every page reachable in click depth <= 2 from the homepage.
No page appears in more than two groups.

---

## Header (left to right)

```
[Logo]  Targets ▾  Pattern generator  Tools ▾  Guides  Support ▾     [Shop targets] [Request a quote]
```

### Targets ▾ (mega-menu, three columns)

#### Column 1: By pattern
| Label | Path | Live | Notes |
|---|---|---|---|
| ChArUco boards | /targets/charuco-composite/ | Yes | Also in By material |
| Checkerboard targets | /targets/checkerboard-composite/ | Yes | |
| AprilGrid boards | — | No | `live: false` hook |
| Circle grid targets | — | No | Planned |
| HALCON calibration plates | — | No | `live: false` hook |

#### Column 2: By material
| Label | Path | Live | Notes |
|---|---|---|---|
| Composite boards | /targets/collection/composite-boards/ | Yes | |
| Ceramic & glass targets | /targets/collection/ceramic-glass/ | Yes | |
| ChArUco ceramic | /targets/charuco-ceramic/ | Yes | Also in By pattern |
| LiDAR & image quality | /targets/collection/lidar-image-quality/ | Yes | |

#### Column 3: Services & accessories
| Label | Path | Live | Notes |
|---|---|---|---|
| ILAC calibration certificate | /targets/certificate-ilac/ | Yes | |
| Mounting fixture | /targets/mounting-fixture/ | Yes | |
| Mounts & accessories | /targets/collection/mounts-accessories/ | Yes | |
| All targets | /targets/ | Yes | Footer link to index |

### Pattern generator (direct link)
→ /tools/generator/

### Tools ▾ (dropdown)
Six tools other than the generator, with one-line descriptors from tools.ts:

| Label | Path | Descriptor |
|---|---|---|
| FOV & resolution calculator | /tools/fov/ | Sensor, lens and working distance in — field of view, mm per pixel and target size out. |
| Target selection wizard | /tools/wizard/ | Five questions, one recommendation: pattern, size, material. |
| Format converter | /tools/convert/ | OpenCV ↔ ROS camera_info ↔ Kalibr ↔ HALCON ↔ COLMAP intrinsics. |
| Detection check | /tools/check/ | Upload a photo of your board and see what the detector finds. |
| Calibration quality analyzer | /tools/quality/ | Coverage heatmap, reprojection error, parameter correlation — in your browser. |
| Capture assistant | /tools/capture/ | Guided calibration image capture with 15 poses for optimal coverage. |
| All tools | /tools/ | — |

### Guides (direct link)
→ /guides/

### Support ▾ (dropdown)
| Label | Path |
|---|---|
| FAQ | /faq/ |
| Shipping, duties & taxes | /shipping/ |
| Returns | /returns/ |
| Files & downloads | /files/ |
| Verify a report | /verify/ |
| About | /about/ |
| Contact | /contact/ |

### Primary CTA: Shop targets
→ /targets/ (red background button)

### Secondary CTA: Request a quote
→ /quote/ (outlined button, same height, label exactly "Request a quote")

---

## Footer (four groups)

### Targets
| Label | Path |
|---|---|
| All targets | /targets/ |
| Composite boards | /targets/collection/composite-boards/ |
| Ceramic & glass | /targets/collection/ceramic-glass/ |
| LiDAR & image quality | /targets/collection/lidar-image-quality/ |
| Mounts & accessories | /targets/collection/mounts-accessories/ |

### Tools
| Label | Path |
|---|---|
| Pattern generator | /tools/generator/ |
| FOV calculator | /tools/fov/ |
| Target wizard | /tools/wizard/ |
| Format converter | /tools/convert/ |
| Detection check | /tools/check/ |
| Quality analyzer | /tools/quality/ |
| Capture assistant | /tools/capture/ |

### Support
| Label | Path |
|---|---|
| FAQ | /faq/ |
| Shipping, duties & taxes | /shipping/ |
| Returns | /returns/ |
| Files & downloads | /files/ |
| Verify a report | /verify/ |
| Contact | /contact/ |

### Company
| Label | Path |
|---|---|
| About | /about/ |
| Legal notice | /imprint/ |
| Privacy | /privacy/ |
| Reviews policy | /reviews-policy/ |

---

## Mobile

Accordion groups in the same order as desktop header:
1. Targets (same items as mega-menu, flat list)
2. Pattern generator (direct link)
3. Tools (same items as dropdown)
4. Guides (direct link)
5. Support (same items as dropdown)

Floating bottom cluster:
- **Shop targets** (red, primary)
- Cart icon

"Request a quote" appears inside the Support accordion group on mobile.

---

## Click-depth audit

| Depth | Count | Pages |
|---|---|---|
| 0 | 1 | / |
| 1 | 16 | /targets/, /tools/, /tools/generator/, /guides/, /faq/, /shipping/, /returns/, /files/, /verify/, /about/, /contact/, /quote/, /imprint/, /privacy/, /reviews-policy/, /cart/ |
| 2 | 27 | All product pages, collection pages, individual tools, generator sub-pages, guide articles, verify/000311, verify/unknown |

404 and /review/ are not navigation targets (error page and internal submission flow).

Maximum depth for any navigable page: **2** (generator sub-pages: header → Pattern generator → tab).
All 41+2 pages accounted for.

---

## Removed from nav
- "Why us" (homepage section stays, not in header)
- "Free tools" label (replaced with "Tools")
