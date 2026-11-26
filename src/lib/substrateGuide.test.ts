import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { substrateFigureSvg, substrateRowsFromGuide, SUBSTRATE_SCALE } from './guideFigures';
import { COMPOSITE_TOLERANCE, COMPOSITE_FLATNESS, CERAMIC_ACCURACY, CERAMIC_FLATNESS, COMPOSITE_CTE_UM_PER_M_K, CERAMIC_CTE_UM_PER_M_K } from './claims';
import { COMPOSITE_SIZES, CERAMIC_SIZES } from './boardSizes';

/**
 * Every number in the substrate guide comes from the saved sessions in docs/content/experiments/substrate/.
 * The tables are read from the guide and recomputed here from the per-session results, so a number changed
 * by hand in either place fails. The limits the test ran at are checked against the published specifications.
 */
const DIR = 'docs/content/experiments/substrate';
const md = readFileSync('src/content/guides/composite-ceramic-or-glass.md', 'utf8');
/** The text under the front matter. In table cells a number is tied to its unit with a no-break space; compared here as a plain space. */
const body = md.slice(md.indexOf('---', 4) + 3).replace(/\u00a0/g, ' ');
const front = md.slice(0, md.indexOf('---', 4));

type Session = { rms: number; fx_pct: number; aspect_pct: number; model_mean: number; model_max: number; distance_pct: number };
type Row = { id: string; board: string; kind: string | null; amount: number; release: boolean; views: number; sessions: Session[] };
const saved = JSON.parse(readFileSync(`${DIR}/results/substrate.json`, 'utf8')) as { opencv: string; noise_px: number; sessions: number; rows: Row[] };
const row = (id: string) => { const r = saved.rows.find((x) => x.id === id); if (!r) throw new Error(`no row ${id}`); return r; };
const median = (v: number[]) => { const s = [...v].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const med = (id: string, k: keyof Session = 'model_max') => median(row(id).sessions.map((s) => s[k]));
const px2 = (id: string, k: keyof Session = 'model_max') => med(id, k).toFixed(2);
const px3 = (id: string) => med(id, 'rms').toFixed(3);
const pct = (id: string, k: keyof Session = 'fx_pct', n = 2) => {
  const v = +med(id, k).toFixed(n);
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(n)} %`;
};

/** Rows of the markdown table whose header starts with the given cell. */
function table(firstHeader: string): string[][] {
  const lines = body.split('\n');
  const i = lines.findIndex((l) => l.startsWith(`| ${firstHeader} |`));
  if (i < 0) throw new Error(`no table "${firstHeader}"`);
  const rows: string[][] = [];
  for (let j = i + 2; j < lines.length && lines[j].startsWith('|'); j++) rows.push(lines[j].split('|').slice(1, -1).map((c) => c.trim()));
  return rows;
}

const BOARDS: [label: string, id: string, plate: number, material: 'composite' | 'ceramic'][] = [
  ['Composite 200 × 150', 'composite-200', 200, 'composite'], ['Composite 300 × 200', 'composite-300', 300, 'composite'],
  ['Composite 800 × 600', 'composite-800', 800, 'composite'], ['Ceramic 230 × 140', 'ceramic-230', 230, 'ceramic'],
];
const KINDS: [label: string, kind: string][] = [
  ['The whole pattern larger', 'scale'], ['Longer in one direction', 'stretch'], ['Rows not square to columns', 'skew'],
  ['Spacing growing toward one end', 'curve'], ['Every corner off on its own', 'random'],
];

// The published limits, read from the specification strings.
const tol = COMPOSITE_TOLERANCE.match(/([\d.]+) mm \+ ([\d.]+) mm\/m/)!;
const positionLimit = (plate: number, m: string) => (m === 'composite' ? +tol[1] + (+tol[2] * plate) / 1000 : +CERAMIC_ACCURACY.match(/([\d.]+) µm/)![1] / 1000);
const flatnessLimit = (plate: number, m: string) => (m === 'composite' ? (+COMPOSITE_FLATNESS.match(/([\d.]+) mm per meter/)![1] * plate) / 1000 : +CERAMIC_FLATNESS.match(/([\d.]+) µm/)![1] / 1000);

describe('the saved runs', () => {
  it('20 sessions behind every row, made with OpenCV 5.1 and 0.05 px of noise', () => {
    expect(saved.rows).toHaveLength(69);
    for (const r of saved.rows) expect(r.sessions, r.id).toHaveLength(20);
    expect(saved.opencv).toMatch(/^5\.1\./);
    expect(saved.noise_px).toBe(0.05);
    expect(body).toContain('`cv2.calibrateCamera`, OpenCV 5.1.');
    expect(body).toContain('Each corner gets 0.05 px of noise.');
  });

  it('ran at the published limits', () => {
    for (const [, id, plate, m] of BOARDS) {
      for (const [, k] of KINDS) expect(row(`${id}/${k}/limit`).amount, `${id} ${k}`).toBeCloseTo(positionLimit(plate, m), 9);
      for (const k of ['bow', 'dome', 'twist']) expect(row(`${id}/${k}/limit`).amount, `${id} ${k}`).toBeCloseTo(flatnessLimit(plate, m), 9);
    }
    expect(body).toContain('any corner within 0.3 mm + 0.2 mm per meter of board length of its nominal place, and flat to 0.5 mm per meter. Ceramic: 2 µm and 20 µm.');
  });

  it('used the boards from the shop', () => {
    const lab = readFileSync(`${DIR}/lab.py`, 'utf8');
    for (const [, id, plate, m] of BOARDS) {
      const d = lab.match(new RegExp(`"${id}": dict\\(material="${m}", plate=\\((\\d+), (\\d+)\\), squares=\\((\\d+), (\\d+)\\), square=([\\d.]+)\\)`))!;
      const size = [...COMPOSITE_SIZES, ...CERAMIC_SIZES].find((s) => s.label === `${d[1]} × ${d[2]}`)!;
      expect(+d[1]).toBe(plate);
      expect([+d[3], +d[4], +d[5]], id).toEqual([size.cols, size.rows, size.square]);
      expect(body).toContain(`${(size.cols - 1) * (size.rows - 1)}`);
    }
    expect(body).toContain('Composite: 200 × 150 mm (24 inner corners), 300 × 200 mm (54) and 800 × 600 mm (140). Ceramic: 230 × 140 mm (91).');
  });
});

describe('tables: each cell is the median of the 20 saved sessions', () => {
  it('the short answer', () => {
    const ids = ['composite-300/exact', 'composite-300/bow/limit', 'composite-300/stretch/limit', 'ceramic-230/bow/limit', 'composite-300/bow/limit/ro'];
    const t = table('Board in the test');
    expect(t.map((r) => r[0])).toEqual(['Exact board', 'Composite, bowed to its flatness limit', 'Composite, pattern stretched to its limit', 'Ceramic, bowed to its flatness limit', 'Composite, bowed, board solved for']);
    t.forEach((r, i) => expect(r.slice(1), r[0]).toEqual([px3(ids[i]), pct(ids[i]), px2(ids[i])]));
  });

  it('flatness, four boards', () => {
    const t = table('Board');
    expect(t).toHaveLength(4);
    BOARDS.forEach(([label, id, plate, m], i) => expect(t[i]).toEqual([
      label, `${flatnessLimit(plate, m).toFixed(2)} mm`, px2(`${id}/exact`), px2(`${id}/bow/limit`), px2(`${id}/dome/limit`), px2(`${id}/twist/limit`), px3(`${id}/bow/limit`), pct(`${id}/bow/limit`),
    ]));
  });

  it('five ways the pattern can be off, 300 mm composite board', () => {
    const t = table('The pattern is off by');
    KINDS.forEach(([label, k], i) => {
      const id = `composite-300/${k}/limit`;
      expect(t[i]).toEqual([label, px3(id), pct(id), pct(id, 'aspect_pct'), px2(id), pct(id, 'distance_pct')]);
    });
    expect(t).toHaveLength(5);
  });

  it('the same five for every board', () => {
    const lines = body.split('\n'); const i = lines.findIndex((l) => l.startsWith('| Board | Position limit |'));
    const t = lines.slice(i + 2, i + 6).map((l) => l.split('|').slice(1, -1).map((c) => c.trim()));
    BOARDS.forEach(([label, id, plate, m], n) => {
      const lim = positionLimit(plate, m);
      expect(t[n]).toEqual([label, `${m === 'ceramic' ? lim.toFixed(3) : lim.toFixed(2)} mm`, ...KINDS.map(([, k]) => px2(`${id}/${k}/limit`))]);
    });
  });

  it('solving for the board', () => {
    const t = table('The board');
    const cases: [string, string][] = [['Exact board', 'exact'], ...KINDS.map(([l, k]): [string, string] => [l, `${k}/limit`]), ['Bowed', 'bow/limit'], ['Domed', 'dome/limit'], ['Twisted', 'twist/limit']];
    expect(t).toHaveLength(cases.length);
    cases.forEach(([label, k], i) => expect(t[i]).toEqual([label, px2(`composite-300/${k}`), px2(`composite-300/${k}/ro`), pct(`composite-300/${k}/ro`, 'distance_pct')]));
    for (const r of saved.rows.filter((x) => x.release)) expect(r.board === 'composite-300' || r.board === 'ceramic-230').toBe(true);
  });

  it('fewer views', () => {
    const t = table('Views');
    [8, 12, 20].forEach((n, i) => {
      const v = n === 20 ? '' : `/${n}views`;
      expect(row(`composite-300/exact${v}`).views).toBe(n);
      expect(t[i]).toEqual([String(n), px2(`composite-300/exact${v}`), px2(`composite-300/exact/ro${v}`), px2(`composite-300/bow/limit${v}`), px2(`composite-300/bow/limit/ro${v}`)]);
    });
  });

  it('temperature: the bow is expansion x degrees / thickness x length squared / 8', () => {
    const lines = body.split('\n'); const i = lines.findIndex((l) => l.startsWith('| Board | 10 °C warmer: distance |'));
    const t = lines.slice(i + 2, i + 5).map((l) => l.split('|').slice(1, -1).map((c) => c.trim()));
    const cases: [string, string, number, number, number][] = [
      ['Composite 300 × 200', 'composite-300', 300, COMPOSITE_CTE_UM_PER_M_K, 6], ['Composite 800 × 600', 'composite-800', 800, COMPOSITE_CTE_UM_PER_M_K, 6],
      ['Ceramic 230 × 140', 'ceramic-230', 230, CERAMIC_CTE_UM_PER_M_K, 3],
    ];
    cases.forEach(([label, id, L, cte, thick], n) => {
      const bow = (cte * 1e-6 / thick) * L * L / 8; // mm, for 1 degree between the faces
      expect(row(`${id}/warm/10C`).amount).toBe(10);
      expect(row(`${id}/gradient/1C`).amount).toBe(1);
      expect(t[n]).toEqual([label, pct(`${id}/warm/10C`, 'distance_pct', 3), px2(`${id}/warm/10C`), `${bow < 0.1 ? bow.toFixed(3) : bow.toFixed(2)} mm`, pct(`${id}/gradient/1C`), px2(`${id}/gradient/1C`)]);
    });
    const lab = readFileSync(`${DIR}/lab.py`, 'utf8');
    expect(lab).toContain(`EXPANSION = {"composite": ${COMPOSITE_CTE_UM_PER_M_K}e-6, "ceramic": ${CERAMIC_CTE_UM_PER_M_K}e-6}`);
    expect(lab).toContain('THICKNESS = {"composite": 6.0, "ceramic": 3.0}');
    expect(lab).toContain('return EXPANSION[m] * degrees / THICKNESS[m] * L * L / 8');
    expect(body).toContain('| Thickness | 6 mm | 3 mm |');
  });
});

describe('numbers in the text', () => {
  const d = (a: string, b: string) => med(a) - med(b);
  const said: [string, string][] = [
    ['ceramic at its limit, short answer', `the 230 × 140 mm board gave ${px2('ceramic-230/bow/limit')} px, against ${px2('ceramic-230/exact')} px for an exact board`],
    ['growing spacing, short answer', `cost ${px2('composite-300/curve/limit')} px on the 300 mm board at the composite limit`],
    ['solved board, short answer', `gave the same model as an exact board, ${px2('composite-300/bow/limit/ro')} px`],
    ['floor', `With an exact board the worst pixel is ${px2('composite-300/exact')} to ${px2('composite-200/exact')} px`],
    ['ceramic a quarter', `the cost is about a quarter: ${px2('ceramic-230/bow/limit')} px. That is above the floor of ${px2('ceramic-230/exact')} px`],
    ['rms looks as good', `A session at ${px3('composite-300/bow/limit')} px looks as good as one at ${px3('composite-300/exact')} px`],
    ['focal length off', `the focal length is ${pct('composite-300/bow/limit').slice(1)} off, which is 1.6 mm on a distance of one meter`],
    ['scale goes to distance', `is off by the same ${pct('composite-300/scale/limit', 'distance_pct').slice(1)}.`],
    ['growing spacing', `${px2('composite-300/curve/limit')} px at the worst pixel with an RMS of ${px3('composite-300/curve/limit')} px`],
    ['random raises rms', `raise the RMS to ${px3('composite-300/random/limit')} px`],
    ['stretch in proportion', `cost ${px2('composite-300/stretch/x0.25')}, ${px2('composite-300/stretch/x0.5')} and ${px2('composite-300/stretch/limit')} px`],
    ['bow in proportion', `A bow cost ${px2('composite-300/bow/x0.25')}, ${px2('composite-300/bow/x0.5')} and ${px2('composite-300/bow/limit')} px`],
    ['ceramic solved', `went from ${px2('ceramic-230/bow/limit')} to ${px2('ceramic-230/bow/limit/ro')} px the same way`],
    ['8 views', `With 8 views, solving for the board costs ${d('composite-300/exact/ro/8views', 'composite-300/exact/8views').toFixed(1)} px on a perfect board and saves ${d('composite-300/bow/limit/8views', 'composite-300/bow/limit/ro/8views').toFixed(1)} px on a bowed one`],
    ['gradient on the large board', `the 800 mm composite board costs ${px2('composite-800/gradient/1C')} px`],
    ['wrong: ceramic', `the ceramic board cost ${px2('ceramic-230/bow/limit')} px at the worst pixel, four times the ${px2('ceramic-230/exact')} px of an exact board`],
    ['wrong: the pixel rule', `a spacing growing by that much cost ${px2('composite-800/curve/limit')} px`],
    ['wrong: flatness left out', `which cost ${px2('composite-800/bow/limit')} px on that board and the same on the small ones`],
    ['wrong: random', `On the 300 mm board they cost ${px2('composite-300/random/limit')} px`],
    ['wrong: cost of solving', `At 20 views it cost ${d('composite-300/exact/ro', 'composite-300/exact').toFixed(2)} px, less than we feared. At 8 views it cost ${d('composite-300/exact/ro/8views', 'composite-300/exact/8views').toFixed(1)} px`],
    ['alt text', `${px2('composite-300/exact')} px for an exact board, ${px2('composite-300/bow/limit')} and ${px2('composite-300/stretch/limit')} px for composite at its limits, ${px2('ceramic-230/bow/limit')} px for ceramic, ${px2('composite-300/bow/limit/ro')} px with the board solved for`],
  ];
  it.each(said)('%s', (_n, text) => expect(body).toContain(text));

  it('round statements hold', () => {
    // "about 3 px ... at every size", "from 0.07 to 0.09 px", "about four times better", "0.066 to 0.128 px for all"
    for (const b of ['composite-200', 'composite-300', 'composite-800']) { expect(med(`${b}/bow/limit`)).toBeGreaterThan(2.85); expect(med(`${b}/bow/limit`)).toBeLessThan(3.05); }
    expect(med('composite-300/exact', 'rms').toFixed(2)).toBe('0.07');
    expect(med('composite-300/bow/limit', 'rms').toFixed(2)).toBe('0.09');
    expect(med('composite-300/bow/limit') / med('ceramic-230/bow/limit')).toBeGreaterThan(3.5);
    expect(med('composite-300/bow/limit') / med('ceramic-230/bow/limit')).toBeLessThan(4.5);
    expect(med('ceramic-230/bow/limit') / med('ceramic-230/exact')).toBeGreaterThan(3.5);
    const rms = substrateRowsFromGuide(md).map((r) => r.rms);
    expect([Math.min(...rms), Math.max(...rms)]).toEqual([0.066, 0.128]);
    // a pattern that is larger as a whole leaves the model where an exact board leaves it
    for (const [, id] of BOARDS) expect(Math.abs(med(`${id}/scale/limit`) - med(`${id}/exact`))).toBeLessThan(0.02);
    // ten degrees on the whole board: the distance error is the expansion itself, the model is the exact board's
    expect(med('composite-300/warm/10C', 'distance_pct')).toBeCloseTo(-COMPOSITE_CTE_UM_PER_M_K * 10 / 1e4, 2);
    expect(Math.abs(med('composite-800/warm/10C') - med('composite-800/exact'))).toBeLessThan(0.02);
    // every solved-for row is at the level of the solved-for exact board
    for (const r of saved.rows.filter((x) => x.release && x.views === 20 && x.board === 'composite-300')) expect(med(r.id), r.id).toBeLessThan(0.35);
  });

  it('answers under the page', () => {
    expect(front).toContain(`a ceramic board at its 20 µm flatness limit cost ${px2('ceramic-230/bow/limit')} px at the worst pixel`);
    expect(front).toContain(`put distances off by ${pct('composite-300/warm/10C', 'distance_pct', 3).slice(1)}`);
    expect(front).toContain(`about 3 px at the worst pixel and ${pct('composite-300/bow/limit').slice(1)} of focal length at every board size`);
    expect(front).toContain(`A bow of 20 µm on a 230 mm board cost ${px2('ceramic-230/bow/limit')} px`);
    expect(front).toContain('1 °C across a 6 mm composite board 800 mm long bows it 0.32 mm');
  });
});

describe('the script printed in the guide', () => {
  const script = readFileSync(`${DIR}/solve_for_the_board.py`, 'utf8').trimEnd();
  const output = readFileSync(`${DIR}/results/solve_for_the_board.txt`, 'utf8').trimEnd();
  it('is the file in the repository, with the output it gave', () => {
    expect(body).toContain('```python\n' + script + '\n```');
    expect(body).toContain('```text\n' + output + '\n```');
    expect(body).toContain(`This is the bowed composite board in ${script.split('\n').length} lines.`);
  });
  it('shows what the guide says it shows', () => {
    const fx = [...output.matchAll(/focal length ([+-][\d.]+) %/g)].map((m) => Math.abs(+m[1]));
    expect(fx[0]).toBeGreaterThan(0.1);
    expect(fx[1]).toBeLessThan(0.05);
    const found = output.match(/bow of ([\d.]+) mm between the corners \(([\d.]+) mm in truth\)/)!;
    expect(Math.abs(+found[1] - +found[2])).toBeLessThan(0.02);
  });
});

describe('figure', () => {
  const rows = substrateRowsFromGuide(md);
  it('is the file this code writes, from the five rows of the short answer', () => {
    expect(rows).toHaveLength(5);
    expect(readFileSync('src/assets/guides/substrate-rms-vs-model-error.svg', 'utf8')).toBe(substrateFigureSvg(rows));
  });
  it('no bar is clipped by the scale', () => {
    for (const r of rows) { expect(r.rms).toBeLessThanOrEqual(SUBSTRATE_SCALE.rmsMax); expect(r.lensMax).toBeLessThanOrEqual(SUBSTRATE_SCALE.lensMax); }
  });
});
