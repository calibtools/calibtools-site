# Product specs metafield schema

Namespace: `specs`. All keys live under `specs.*` in Shopify product metafields.

## Keys

| Key                | Shopify type                  | Unit / format      | Vocabulary / notes                                                              | Required |
|--------------------|-------------------------------|--------------------|---------------------------------------------------------------------------------|----------|
| `material`         | `single_line_text_field`      | —                  | `Aluminium/LDPE composite`, `Alumina ceramic`, `Borosilicate glass`, `Aluminium` | yes      |
| `thickness_mm`     | `number_integer`              | mm (implicit)      | Whole millimetres                                                                | yes      |
| `size_mm`          | `single_line_text_field`      | `W × H` mm        | Use ` × ` (thin space + ×) between dims                                         | no       |
| `pattern`          | `single_line_text_field`      | —                  | `Checkerboard`, `ChArUco`, `AprilGrid`, `Circles`                                | no       |
| `squares`          | `single_line_text_field`      | `R × C`           | Rows × Columns, e.g. `7 × 10`                                                   | no       |
| `square_size_mm`   | `number_integer`              | mm (implicit)      | Whole millimetres                                                                | no       |
| `marker_size_mm`   | `number_integer`              | mm (implicit)      | Whole millimetres; only for ChArUco / AprilGrid                                  | no       |
| `dictionary`       | `single_line_text_field`      | —                  | OpenCV enum name, e.g. `DICT_6X6_250`, `DICT_4X4_50`, `AprilTag 36h11`          | no       |
| `start_id`         | `number_integer`              | —                  | First marker ID in the board                                                     | no       |
| `feature_tolerance`| `single_line_text_field`      | free text          | e.g. `±0.3 mm + 0.2 mm/m`, `±2 µm`                                              | yes      |
| `flatness`         | `single_line_text_field`      | free text          | e.g. `≤ 0.5 mm / m`                                                              | no       |
| `cte`              | `single_line_text_field`      | free text          | e.g. `24 µm/(m·°C)`                                                              | no       |
| `operating_temp`   | `single_line_text_field`      | free text          | e.g. `−50 to +80 °C`                                                             | no       |
| `weight_g`         | `number_integer`              | g (implicit)       | Whole grams                                                                      | no       |
| `finish`           | `single_line_text_field`      | —                  | e.g. `UV-printed; matte`, `Lithographed blue chrome`                              | no       |
| `corner_radius_mm` | `number_integer`              | mm (implicit)      | Whole millimetres                                                                | no       |
| `lead_time`        | `single_line_text_field`      | —                  | `In stock · ships in 1–2 days`, `Made to order · 3–4 weeks`                      | yes      |
| `files_included`   | `single_line_text_field`      | comma-separated    | e.g. `Inspection report, datasheet PDF, DXF, OpenCV JSON, Kalibr YAML`           | yes      |
| `datasheet_url`    | `url`                         | full URL           | Link to the datasheet PDF (public CDN)                                            | warn     |
| `datasheet_rev`    | `single_line_text_field`      | —                  | e.g. `Rev A · 2026-10`                                                           | no       |
| `hs_code`          | `single_line_text_field`      | —                  | Harmonized System code, e.g. `9031 80`                                            | no       |
| `origin`           | `single_line_text_field`      | ISO 3166-1 alpha-2 | e.g. `CN`, `DE`                                                                  | no       |

## Display rules

1. The product page **hides rows** whose metafield value is empty — never render an empty table cell.
2. Numeric-with-unit keys (`thickness_mm`, `square_size_mm`, `marker_size_mm`, `weight_g`, `corner_radius_mm`) **always** display with their unit suffix (` mm` or ` g`). The unit is appended in `src/pages/targets/[handle].astro` via the `SPEC_UNITS` map; it must never be stored inside the metafield value itself.
3. `feature_tolerance` is free text because it varies by material family (mm for composite, µm for ceramic).

## CSV header format

Shopify product CSV import uses headers of the form:

```
Metafield: specs.<key> [<shopify_type>]
```

Example: `Metafield: specs.material [single_line_text_field]`

The export template script (`scripts/export-metafield-template.mjs`) generates a CSV with these headers pre-filled from live Storefront data so values can be reviewed and bulk-imported back.

## Required keys

The postbuild check (`scripts/check-specs.mjs`) fails the build if any product page is missing these required keys in its rendered spec table:

- `material`
- `thickness_mm`
- `feature_tolerance`
- `lead_time`
- `files_included`

It warns (but does not fail) if `datasheet_url` is missing.

Bypass with `SKIP_SPECS_CHECK=1` while metafields are still being populated.
