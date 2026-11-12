import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { generatorFields } from './generatorFields';

describe('generator form fields by pattern type', () => {
  it('a checkerboard shows a square size and nothing about markers', () => {
    expect(generatorFields('Checkerboard')).toEqual({ sizeLabel: 'Square size (mm)', marker: false, dictionary: false, startId: false });
  });

  it('ChArUco shows everything', () => {
    expect(generatorFields('ChArUco')).toEqual({ sizeLabel: 'Square size (mm)', marker: true, dictionary: true, startId: true });
  });

  it('a marker sheet has no square size; the dictionary gives way to an AprilTag family', () => {
    expect(generatorFields('Marker sheet')).toEqual({ sizeLabel: null, marker: true, dictionary: true, startId: true });
    expect(generatorFields('Marker sheet', '36h11').dictionary).toBe(false);
  });

  it('AprilGrid calls its size a tag size and has no ArUco marker size or dictionary', () => {
    expect(generatorFields('AprilGrid (Kalibr)')).toEqual({ sizeLabel: 'Tag size (mm)', marker: false, dictionary: false, startId: true });
  });

  it('circle grids call it spacing', () => {
    for (const t of ['Asymmetric circles', 'Symmetric circles', 'HALCON-style dots'] as const) expect(generatorFields(t).sizeLabel).toBe('Spacing (mm)');
  });

  it('ArUco grid calls it marker pitch', () => {
    expect(generatorFields('ArUco grid').sizeLabel).toBe('Marker pitch (mm)');
  });

  it('the generator form takes its fields from here', () => {
    const src = readFileSync('src/islands/Generator.tsx', 'utf8');
    expect(src).toContain('generatorFields(spec.type, spec.aprilFamily)');
    for (const f of ['fields.sizeLabel &&', 'fields.marker &&', 'fields.dictionary &&', 'fields.startId &&']) expect(src).toContain(f);
    expect(src).not.toContain("'Square size (mm)'");
  });

  it('the page texts use the names the form shows', () => {
    const md = (f: string) => readFileSync(`src/content/tools/${f}.md`, 'utf8');
    expect(md('generator-apriltag')).toContain('**Marker size**');
    expect(md('generator-aruco')).toContain('**Marker size**');
    expect(md('generator-checkerboard')).toContain('**Square size**');
  });
});
