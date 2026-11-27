import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { imageCountFigureSvg, imageCountRowsFromGuide, IMAGE_COUNT_FIGURE_COUNTS, IMAGE_COUNT_FIGURE_MIDDLE } from './guideFigures';

/**
 * Every number in the image-count guide comes from the saved runs in docs/content/experiments/image-count/.
 * The tables, the figure and the numbers quoted in the text are recomputed here from the per-session results,
 * so a number changed by hand in the guide fails.
 */
const DIR = 'docs/content/experiments/image-count';
const md = readFileSync('src/content/guides/how-many-calibration-images.md', 'utf8');
const front = md.slice(0, md.indexOf('---', 4));
const body = md.slice(md.indexOf('---', 4) + 3);
const flat = body.replace(/\s+/g, ' ');

type Session = { failed?: boolean; rms: number; model_mean: number; model_worst: number; fx: number; k3: number; held_out_rms: number };
type Case = { views: 'good' | 'lazy'; n: number; flags: 'default' | 'fixed_k3_no_tangential'; sessions: Session[] };
const data = JSON.parse(readFileSync(`${DIR}/results/sessions.json`, 'utf8')) as { opencv: string; held_out_views: number; cases: Case[] };
const pool = JSON.parse(readFileSync(`${DIR}/results/pool_summary.json`, 'utf8')) as { views: { good: number; lazy: number }; worst_corner_px: number; share_of_views_within_0_2: number; share_of_views_within_0_3: number; tilt_deg: { good: [number, number]; lazy: [number, number] } };

const median = (v: number[]) => { const s = [...v].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const kase = (views: Case['views'], n: number, flags: Case['flags'] = 'default') => {
  const c = data.cases.find((x) => x.views === views && x.n === n && x.flags === flags);
  expect(c, `${views} ${n} ${flags}`).toBeDefined();
  expect(c!.sessions).toHaveLength(20);
  expect(c!.sessions.every((s) => !s.failed)).toBe(true);
  return c!;
};
const med = (c: Case, key: keyof Session) => median(c.sessions.map((s) => s[key] as number));
const worseThan1 = (c: Case) => c.sessions.filter((s) => s.model_worst > 1).length;
const middleFx = (c: Case) => { const fx = c.sessions.map((s) => s.fx).sort((a, b) => a - b); return `${fx[5].toFixed(0)} to ${fx[14].toFixed(0)}`; };

/** Rows of the markdown table whose header starts with the given cell. */
function table(firstHeader: string): string[][] {
  const lines = body.split('\n'); const i = lines.findIndex((l) => l.startsWith(`| ${firstHeader} |`));
  expect(i, firstHeader).toBeGreaterThan(0);
  const rows: string[][] = [];
  for (let j = i + 2; j < lines.length && lines[j].startsWith('|'); j++) rows.push(lines[j].split('|').slice(1, -1).map((c) => c.trim()));
  return rows;
}

describe('the numbers: spread views, default flags', () => {
  const rows = table('Images');
  it('twelve counts from 3 to 60', () => {
    expect(rows.map((r) => +r[0])).toEqual([3, 4, 5, 6, 8, 10, 12, 15, 20, 30, 40, 60]);
  });
  for (const r of rows) {
    it(`${r[0]} images`, () => {
      const c = kase('good', +r[0]);
      expect(r[1]).toBe(med(c, 'rms').toFixed(3));
      expect(r[2]).toBe(med(c, 'model_mean').toFixed(2));
      expect(r[3]).toBe(med(c, 'model_worst').toFixed(2));
      expect(r[4]).toBe(`${worseThan1(c)} of 20`);
      expect(r[5]).toBe(middleFx(c));
    });
  }
  it('text: ten images about 1 px, twenty under 0.5, thirty 0.3, sixty the same', () => {
    expect(med(kase('good', 10), 'model_worst')).toBeCloseTo(1.0, 0);
    expect(med(kase('good', 20), 'model_worst')).toBeLessThan(0.5);
    expect(+med(kase('good', 30), 'model_worst').toFixed(1)).toBe(0.3);
    expect(+med(kase('good', 60), 'model_worst').toFixed(1)).toBe(0.3);
  });
  it('text: RMS 0.103 at three images and 0.102 at sixty, 0.09 to 0.10 over all counts', () => {
    expect(flat).toContain('With 3 images it is 0.103 px, with 60 it is 0.102 px');
    expect(med(kase('good', 3), 'rms').toFixed(3)).toBe('0.103');
    expect(med(kase('good', 60), 'rms').toFixed(3)).toBe('0.102');
    for (const c of data.cases) { const m = med(c, 'rms'); expect(m).toBeGreaterThanOrEqual(0.085); expect(m).toBeLessThan(0.11); }
    expect(+(med(kase('good', 3), 'model_worst') / med(kase('good', 60), 'model_worst')).toFixed(0)).toBe(20);
  });
  it('text: focal length within 1 px of 1500 for the middle sessions at ten images', () => {
    expect(middleFx(kase('good', 10))).toBe('1499 to 1501');
    expect(flat).toContain('At ten images the middle sessions are within 1 px of the truth');
  });
  it('text: held-out RMS 0.112 at 5 images and 0.110 at 60', () => {
    expect(flat).toContain(`We reprojected the ${data.held_out_views} held-out views with every solved camera: ${med(kase('good', 5), 'held_out_rms').toFixed(3)} px at 5 images, ${med(kase('good', 60), 'held_out_rms').toFixed(3)} px at 60.`);
  });
  it('text: 162 corners at most in three images, 9 camera unknowns', () => {
    expect(flat).toContain('With three images there are at most 162 corners and 9 unknowns in the camera, plus 6 per view.');
    expect(3 * 9 * 6).toBe(162);
  });
});

describe('fewer parameters: default beside k3 and tangential fixed', () => {
  const rows = table('Images', );
  const rows2 = (() => { const lines = body.split('\n'); const i = lines.findIndex((l) => l.startsWith('| Images | Worst model error, default')); const out: string[][] = []; for (let j = i + 2; j < lines.length && lines[j].startsWith('|'); j++) out.push(lines[j].split('|').slice(1, -1).map((c) => c.trim())); return out; })();
  it('eight counts', () => { expect(rows.length).toBe(12); expect(rows2.map((r) => +r[0])).toEqual([3, 4, 6, 8, 10, 12, 20, 60]); });
  for (const r of rows2) {
    it(`${r[0]} images`, () => {
      const a = kase('good', +r[0]), b = kase('good', +r[0], 'fixed_k3_no_tangential');
      expect(r[1]).toBe(med(a, 'model_worst').toFixed(2));
      expect(r[2]).toBe(med(b, 'model_worst').toFixed(2));
      expect(r[3]).toBe(`${worseThan1(a)} of 20`);
      expect(r[4]).toBe(`${worseThan1(b)} of 20`);
      expect(b.sessions.every((s) => s.k3 === 0)).toBe(true);
    });
  }
  it('text: four of the twenty three-image sessions have |k3| above 1', () => {
    expect(kase('good', 3).sessions.filter((s) => Math.abs(s.k3) > 1)).toHaveLength(4);
    expect(flat).toContain('in four of the 20 three-image sessions |k3| came out above 1');
  });
  it('text: a third to a half better up to twelve images, the same from twenty', () => {
    for (const n of [3, 4, 6, 8, 10, 12]) {
      const ratio = med(kase('good', n, 'fixed_k3_no_tangential'), 'model_worst') / med(kase('good', n), 'model_worst');
      expect(ratio).toBeGreaterThan(0.4); expect(ratio).toBeLessThan(0.8);
    }
    for (const n of [20, 60]) expect(Math.abs(med(kase('good', n, 'fixed_k3_no_tangential'), 'model_worst') - med(kase('good', n), 'model_worst'))).toBeLessThan(0.11);
  });
});

describe('more of the same image: views near the middle', () => {
  const rows = table('Images, all near the middle');
  it('10, 20 and 60 images', () => expect(rows.map((r) => +r[0])).toEqual([10, 20, 60]));
  for (const r of rows) {
    it(`${r[0]} images`, () => {
      const c = kase('lazy', +r[0]);
      expect(r[1]).toBe(med(c, 'rms').toFixed(3));
      expect(r[2]).toBe(med(c, 'model_worst').toFixed(2));
      expect(r[3]).toBe(med(c, 'held_out_rms').toFixed(3));
    });
  }
  it('text: sixty middle images worse than three spread ones; 32 px; 77 to 32; held-out 0.4 to 0.9', () => {
    expect(med(kase('lazy', 60), 'model_worst')).toBeGreaterThan(med(kase('good', 3), 'model_worst'));
    expect(med(kase('lazy', 60), 'model_worst').toFixed(0)).toBe('32');
    expect(med(kase('lazy', 20), 'model_worst').toFixed(0)).toBe('77');
    expect(flat).toContain('wrong by 32 px at the image corners');
    expect(flat).toContain('from 77 to 32 px worst');
    const held = [10, 20, 60].map((n) => med(kase('lazy', n), 'held_out_rms'));
    expect(Math.min(...held).toFixed(1)).toBe('0.4'); expect(Math.max(...held).toFixed(1)).toBe('0.9');
    expect(front).toContain('wrong by 30 to 77 px at the image corners');
    expect(Math.min(...[10, 20, 60].map((n) => med(kase('lazy', n), 'model_worst')))).toBeGreaterThan(30);
  });
});

describe('the pool and the setup', () => {
  it('400 spread and 120 middle views, 60 held out', () => {
    expect(pool.views).toEqual({ good: 400, lazy: 120 });
    expect(data.held_out_views).toBe(60);
    expect(flat).toContain('400 "spread" views');
    expect(flat).toContain('120 "middle" views');
    expect(flat).toContain('60 spread views are never drawn; they are the held-out set.');
  });
  it('corner error: worst 0.57 px, half the views within 0.2 px, 90 % within 0.3 px', () => {
    expect(flat).toContain(`the worst corner was ${pool.worst_corner_px.toFixed(2)} px from the truth; in half the views all corners were within 0.2 px, in ${(pool.share_of_views_within_0_3 * 100).toFixed(0)} % within 0.3 px.`);
    expect(pool.share_of_views_within_0_2).toBeGreaterThan(0.5);
    expect(pool.share_of_views_within_0_2).toBeLessThan(0.55);
  });
  it('tilts: 10 to 40° spread, 0 to 8° middle', () => {
    expect(pool.tilt_deg.good[0]).toBeGreaterThanOrEqual(10); expect(pool.tilt_deg.good[1]).toBeLessThanOrEqual(40.1);
    expect(pool.tilt_deg.lazy[1]).toBeLessThanOrEqual(8);
  });
});

describe('the script and its output', () => {
  const codeBlocks = [...body.matchAll(/```(\w+)\n([\s\S]*?)```/g)].map((m) => ({ lang: m[1], text: m[2] }));
  it('the printed script is the file in the experiment folder', () => {
    const file = readFileSync(`${DIR}/enough_images.py`, 'utf8');
    const afterDocstring = file.slice(file.indexOf('"""', 3) + 4);
    expect(codeBlocks.filter((b) => b.lang === 'python')).toHaveLength(1);
    expect(codeBlocks.find((b) => b.lang === 'python')!.text).toBe(afterDocstring);
  });
  it('the two outputs are the saved runs', () => {
    const out = codeBlocks.filter((b) => b.lang === 'text').map((b) => b.text);
    expect(out).toEqual([readFileSync(`${DIR}/results/enough_images_24.txt`, 'utf8'), readFileSync(`${DIR}/results/enough_images_8.txt`, 'utf8')]);
  });
  it('text: the spreads quoted from the outputs', () => {
    const fx = (t: string) => t.match(/fx ([\d.]+) to ([\d.]+), undistortion map moved by up to ([\d.]+) px/)!.slice(1).map(Number);
    const [a24, a8] = [readFileSync(`${DIR}/results/enough_images_24.txt`, 'utf8'), readFileSync(`${DIR}/results/enough_images_8.txt`, 'utf8')].map(fx);
    expect((a8[1] - a8[0]).toFixed(0)).toBe('10'); expect(a8[2].toFixed(0)).toBe('5');
    expect((a24[1] - a24[0]).toFixed(1)).toBe('3.5'); expect(a24[2].toFixed(1)).toBe('2.5');
    expect(flat).toContain('with 8 images they disagree on the focal length by 10 px and on the map by 5 px; with 24, by 3.5 px and 2.5 px.');
    expect(front).toContain('halves disagreed on the focal length by 3.5 px and on the undistortion map by up to 2.5 px; with 8 images, by 10 px and 5 px');
  });
});

describe('figure', () => {
  const rows = imageCountRowsFromGuide(md);
  it('five spread counts and the middle row, from the tables', () => {
    expect(rows.map((r) => r.label)).toEqual([...IMAGE_COUNT_FIGURE_COUNTS.map((n) => `${n} images, spread over the frame`), `${IMAGE_COUNT_FIGURE_MIDDLE} images, all near the middle`]);
    for (const n of IMAGE_COUNT_FIGURE_COUNTS) expect(rows.find((r) => r.label.startsWith(`${n} images, spread`))!.lensMax).toBe(+med(kase('good', n), 'model_worst').toFixed(2));
    expect(rows[5].lensMax).toBe(+med(kase('lazy', IMAGE_COUNT_FIGURE_MIDDLE), 'model_worst').toFixed(2));
  });
  it('the SVG file is what the code draws from the guide', () => {
    expect(readFileSync('src/assets/guides/image-count-rms-vs-model-error.svg', 'utf8')).toBe(imageCountFigureSvg(rows));
  });
});

describe('house rules', () => {
  it('no dashes, paragraphs under 300 characters, OpenCV version named', () => {
    expect(/[–—]/.test(body)).toBe(false);
    const prose = body.replace(/```[\s\S]*?```/g, '').split(/\n\n+/).filter((p) => !p.startsWith('|') && !p.startsWith('!') && !p.startsWith('- ') && !p.startsWith('#'));
    for (const p of prose) expect(p.length, p.slice(0, 50)).toBeLessThanOrEqual(300);
    expect(data.opencv.startsWith('4.')).toBe(true);
  });
});
