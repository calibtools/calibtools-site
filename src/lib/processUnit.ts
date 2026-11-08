/**
 * Process units for golden-sample traceability (decision 2026-11-06).
 *
 * One golden sample per process unit = material × process × accuracy grade,
 * shared by every pattern and size made that way. Replaces the 2026-10-26
 * scheme of one golden sample per part number.
 *
 * Inspection reports name the unit and its golden sample; the measuring
 * instrument is checked against that sample before boards are measured.
 * Materials without a defined unit (metal, film, honeycomb, carbon fiber,
 * laminates) return null until their process and inspection method are set.
 */
import { parse, type Material } from './partNumber';

export interface ProcessUnit {
  id: string;
  material: Material;
  process: string;
  grade: string;
  label: string;
  goldenSample: string;
}

function unit(material: Material, process: string, grade: string, label: string): ProcessUnit {
  const id = `PU-${material}-${process}-${grade}`;
  return { id, material, process, grade, label, goldenSample: `GS-${material}-${process}-${grade}-01` };
}

export const PROCESS_UNITS: readonly ProcessUnit[] = [
  unit('P', 'UV', 'A', 'Aluminum composite, UV direct print'),
  unit('C', 'CR', 'A', 'Alumina ceramic, chrome photolithography'),
  unit('G', 'CR', 'A', 'Soda-lime glass, chrome photolithography'),
  unit('W', 'CR', 'A', 'Opal glass, chrome photolithography'),
  unit('F', 'CR', 'A', 'Fused silica, chrome photolithography'),
];

const BY_MATERIAL = new Map<string, ProcessUnit>(PROCESS_UNITS.map((u) => [u.material, u]));

/** Process unit for a part number, or null if none is defined for its material. */
export function processUnitFor(pn: string): ProcessUnit | null {
  const r = parse(pn);
  if (!r.value || !r.value.material) return null;
  const fam = r.value.family;
  if (fam === 'SVC' || fam === 'KIT' || fam === 'ACC') return null;
  return BY_MATERIAL.get(r.value.material) ?? null;
}
