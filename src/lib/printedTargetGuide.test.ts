import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * Every number in "Is a printed calibration target good enough?" against the saved output of the scripts
 * in docs/content/experiments (printed-target-sim.py, ro-check.py, ro-varying.py; OpenCV 5.0.0).
 * A shown value passes when it equals the saved value rounded to the digits shown.
 */
const md = readFileSync('src/content/guides/printed-target-costs-half-a-pixel.md', 'utf8');
const out = (f: string) => readFileSync(`docs/content/experiments/printed-target-results/${f}`, 'utf8');

/** Rows of a script's table: scenario name -> numbers. */
function simRows(text: string): Map<string, number[]> {
  const rows = new Map<string, number[]>();
  for (const line of text.split('\n')) {
    const m = line.match(/^(.+?)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)$/);
    if (m) rows.set(m[1].trim(), m.slice(2).map(Number));
  }
  return rows;
}
/** "−1.1 %", "0.40", "+4.2 %", "103" -> value and the number of decimals shown. */
function shown(cell: string): { v: number; d: number } {
  const t = cell.replace('−', '-').replace(/[^\d.+-]/g, '');
  return { v: Number(t), d: (t.split('.')[1] ?? '').length };
}
const close = (cell: string, raw: number) => {
  const { v, d } = shown(cell);
  expect(Math.abs(v - raw), `${cell} vs ${raw}`).toBeLessThanOrEqual(0.5 * 10 ** -d + 1e-9);
};
function guideTable(after: string): string[][] {
  const from = md.indexOf(after);
  const lines = md.slice(from).split('\n');
  const start = lines.findIndex((l) => l.startsWith('|'));
  const rows: string[][] = [];
  for (const l of lines.slice(start + 2)) {
    if (!l.startsWith('|')) break;
    rows.push(l.split('|').slice(1, -1).map((c) => c.trim()));
  }
  return rows;
}

const MAIN: Record<string, string> = {
  'Flat and exact (reference)': 'Flat, exact board (reference)',
  'Uniform scale 96 %': 'Uniform scale 96 % (fit to page)',
  'Stretched 0.1 % in one direction': 'One direction +0.1 %',
  'Stretched 0.3 % in one direction': 'One direction +0.3 %',
  'Stretched 0.5 % in one direction': 'One direction +0.5 %',
  'Bowed 0.5 mm': 'Cylindrical bow 0.5 mm',
  'Bowed 1 mm': 'Cylindrical bow 1 mm',
  'Bowed 2 mm': 'Cylindrical bow 2 mm',
  'Domed 1 mm': 'Dome 1 mm',
  'Wavy ±0.2 mm (60 mm pitch)': 'Cockle ±0.2 mm',
  'Wavy ±0.5 mm (60 mm pitch)': 'Cockle ±0.5 mm',
};

describe('printed-target guide: the numbers are the scripts\' output', () => {
  it('saved output is from OpenCV 5.0.0, as the method says', () => {
    expect(out('main.txt')).toMatch(/^OpenCV 5\.0\.0 camera 2448 x 2048/);
    expect(out('lowres.txt')).toMatch(/^OpenCV 5\.0\.0 camera 1280 x 1071/);
    expect(md).toContain('with OpenCV 5.0.0');
  });

  it('main table: RMS, focal length, aspect ratio, edge error and distance of every row', () => {
    const sim = simRows(out('main.txt'));
    const rows = guideTable('| Real board | RMS (px) |');
    expect(rows.map((r) => r[0])).toEqual(Object.keys(MAIN));
    for (const [label, rms, fx, fyfx, edge, dist] of rows) {
      const raw = sim.get(MAIN[label])!;
      [rms, fx, fyfx, edge, dist].forEach((cell, i) => close(cell, raw[i]));
    }
  });

  it('resolution table: RMS at 5 MP and 1.3 MP, focal length the same', () => {
    const hi = simRows(out('main.txt'));
    const lo = simRows(out('lowres.txt'));
    const name: Record<string, string> = { 'Flat and exact': 'Flat, exact board (reference)', 'Bowed 0.5 mm': 'Cylindrical bow 0.5 mm', 'Bowed 1 mm': 'Cylindrical bow 1 mm', 'Wavy ±0.5 mm': 'Cockle ±0.5 mm' };
    const rows = guideTable('| Real board | RMS, 5 MP |');
    expect(rows.map((r) => r[0])).toEqual(Object.keys(name));
    for (const [label, rmsHi, rmsLo, fx] of rows) {
      close(rmsHi, hi.get(name[label])![0]);
      close(rmsLo, lo.get(name[label])![0]);
      close(fx, hi.get(name[label])![1]);
      close(fx, lo.get(name[label])![1]);
    }
  });

  it('object-releasing table against ro-check.py and ro-varying.py', () => {
    const parse = (t: string) => new Map([...t.matchAll(/^(.+?)\s+plain: RMS ([\d.]+) fx ([+-][\d.]+)% edge\s+([\d.]+)px \| RO: RMS ([\d.]+) fx ([+-][\d.]+)% edge\s+([\d.]+)px$/gm)].map((m) => [m[1].trim(), m.slice(2).map(Number)]));
    const ro = new Map([...parse(out('ro-check.txt')), ...parse(out('ro-varying.txt'))]);
    const name: Record<string, string> = { 'Flat and exact': 'None 0', 'Bowed 2 mm': 'bow 2.0', 'Domed 2 mm': 'dome 2.0', 'Stretched 0.3 %': 'aniso 0.003', 'Bowed 0 to 2 mm, different in every view': 'bow 0.0-2.0 mm varying' };
    const rows = guideTable('| Real board | RMS, standard |');
    expect(rows.map((r) => r[0])).toEqual(Object.keys(name));
    for (const [label, rms, fx, rmsRo, fxRo, edgeRo] of rows) {
      const r = ro.get(name[label])!;
      close(rms, r[0]); close(fx, r[1]); close(rmsRo, r[3]); close(fxRo, r[4]); close(edgeRo, r[5]);
    }
    expect(md).toContain('15 sets of views each');
  });

  it('numbers quoted in the text and the questions', () => {
    const sim = simRows(out('main.txt'));
    const bow05 = sim.get('Cylindrical bow 0.5 mm')!, bow1 = sim.get('Cylindrical bow 1 mm')!, flat = sim.get('Flat, exact board (reference)')!;
    expect(sim.get('Uniform scale 96 % (fit to page)')![4].toFixed(1)).toBe('4.2');
    expect(bow1[0].toFixed(1)).toBe('0.8');
    expect(bow1[0].toFixed(2)).toBe('0.79');
    expect((-bow1[1]).toFixed(1)).toBe('2.2');
    expect(bow05[0].toFixed(1)).toBe('0.4');
    expect((-bow05[1]).toFixed(1)).toBe('1.1');
    expect(flat[0].toFixed(2)).toBe('0.07');
    expect(Math.round(bow1[3])).toBe(103);
    expect(sim.get('One direction +0.3 %')![2].toFixed(2)).toBe('0.30');
    expect(Math.round(sim.get('One direction +0.3 %')![3])).toBe(6);
    expect(sim.get('Cockle ±0.5 mm')![0].toFixed(1)).toBe('0.7');
    for (const t of ['put every measured distance 4.2 % off', 'as 0.8 px of RMS, and made the focal length 2.2 % short', 'raised RMS from 0.07 to 0.79 px and made the focal length 2.2 % short', 'A 0.5 mm bow already cost 0.4 px and 1.1 %', 'the board distance came out 4.2 % too long']) expect(md).toContain(t);
    expect((3478 / 750).toFixed(1)).toBe('4.6');
  });

  it('every script the method names exists in the repository', () => {
    for (const f of ['printed-target-sim.py', 'ro-check.py', 'ro-varying.py']) {
      expect(md).toContain(`docs/content/experiments/${f}`);
      expect(readFileSync(`docs/content/experiments/${f}`, 'utf8').length).toBeGreaterThan(100);
    }
  });
});
