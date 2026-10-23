import { useMemo, useState } from 'react';
import { checkerboardSvg, type PatternSpec } from '@/lib/patterns';
import { exportPdf } from '@/lib/exportPdf';
import { exportPng } from '@/lib/exportPng';
import { exportDxf } from '@/lib/exportDxf';
import { kalibrYaml, ros2Yaml, halconDescr, opencvJson } from '@/lib/exportConfig';
import { exportZip } from '@/lib/exportZip';
import { patternSummary } from '@/lib/brand';

/**
 * Pattern generator.
 * Renders calibration patterns as SVG with PDF, PNG, SVG export and
 * config file downloads (OpenCV, Kalibr, ROS 2, HALCON).
 */
const PATTERNS = ['Checkerboard', 'ChArUco', 'AprilGrid (Kalibr)', 'Asymmetric circles', 'Symmetric circles', 'ArUco grid', 'HALCON-style dots'] as const;
const DICTS = [
  'DICT_4X4_50', 'DICT_5X5_100', 'DICT_6X6_250', 'DICT_7X7_1000',
  'DICT_ARUCO_ORIGINAL', 'DICT_ARUCO_MIP_36h12',
  'DICT_APRILTAG_36h11',
];
const PAPERS: Record<string, [number, number]> = { A4: [210, 297], A3: [297, 420], Letter: [215.9, 279.4] };

/** Build a product URL with query params to preselect the variant. */
function productCtaUrl(spec: PatternSpec): string {
  const isCharuco = spec.type === 'ChArUco' || spec.type === 'ArUco grid';
  const handle = isCharuco ? 'charuco-composite' : 'checkerboard-composite';
  const params = new URLSearchParams();
  // Map board dimensions to the closest available size
  const bw = spec.cols * spec.square;
  const bh = spec.rows * spec.square;
  params.set('size', `${bw}x${bh}`);
  if (isCharuco && spec.dict) params.set('dictionary', spec.dict);
  return `/targets/${handle}/?${params.toString()}`;
}

interface GeneratorProps {
  /** Override the default pattern state for preset landing pages. */
  initialSpec?: Partial<PatternSpec>;
}

export default function Generator({ initialSpec }: GeneratorProps = {}) {
  const defaultSpec: PatternSpec = { type: 'ChArUco', rows: 7, cols: 10, square: 25, marker: 18, dict: 'DICT_6X6_250', paper: 'A4', startId: 0, scaleBar: true };
  const [spec, setSpec] = useState<PatternSpec>({ ...defaultSpec, ...initialSpec });
  const [busy, setBusy] = useState<'pdf' | 'png' | null>(null);
  const [pw, ph] = PAPERS[spec.paper] ?? PAPERS.A4;
  const svg = useMemo(() => checkerboardSvg(spec, pw, ph), [spec, pw, ph]);
  const set = <K extends keyof PatternSpec>(k: K, v: PatternSpec[K]) => setSpec((s) => ({ ...s, [k]: v }));
  const boardW = spec.cols * spec.square, boardH = spec.rows * spec.square;
  const corners = (spec.rows - 1) * (spec.cols - 1);
  const markers = Math.floor((spec.rows * spec.cols) / 2);
  const margin = 10;
  const fits = boardW + 2 * margin <= pw && boardH + 2 * margin + (spec.scaleBar ? 12 : 0) <= ph;
  const maxSquare = Math.floor(Math.min((pw - 2 * margin) / spec.cols, (ph - 2 * margin - 12) / spec.rows) * 10) / 10;

  const download = (name: string, text: string, mime: string) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: mime }));
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const slug = `${spec.type.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${spec.rows}x${spec.cols}-${spec.square}mm`;

  const field = 'w-full rounded border border-[#CFCFCF] bg-white px-3 py-[11px] text-[15px]';
  return (
    <section className="flex flex-wrap gap-10">
      <form className="card flex basis-[380px] flex-col gap-5 self-start p-7" onSubmit={(e) => e.preventDefault()}>
        <h1 className="m-0 text-[26px] font-extrabold tracking-[-0.02em]">Pattern generator</h1>
        <p className="m-0 text-sm leading-relaxed text-ink-muted">Runs in your browser. Nothing is uploaded.</p>

        <label className="flex flex-col gap-2 text-[13px] font-semibold">Pattern
          <select className={field} value={spec.type} onChange={(e) => set('type', e.target.value as PatternSpec['type'])}>
            {PATTERNS.map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-2 text-[13px] font-semibold">Rows<input className={field} type="number" min={2} value={spec.rows} onChange={(e) => set('rows', +e.target.value)} /></label>
          <label className="flex flex-col gap-2 text-[13px] font-semibold">Columns<input className={field} type="number" min={2} value={spec.cols} onChange={(e) => set('cols', +e.target.value)} /></label>
          <label className="flex flex-col gap-2 text-[13px] font-semibold">Square size (mm)<input className={field} type="number" min={1} value={spec.square} onChange={(e) => set('square', +e.target.value)} /></label>
          <label className="flex flex-col gap-2 text-[13px] font-semibold">Marker size (mm)<input className={field} type="number" min={1} value={spec.marker} onChange={(e) => set('marker', +e.target.value)} /></label>
        </div>
        <label className="flex flex-col gap-2 text-[13px] font-semibold">Dictionary
          <select className={field} value={spec.dict} onChange={(e) => set('dict', e.target.value)}>{DICTS.map((d) => <option key={d}>{d}</option>)}</select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-2 text-[13px] font-semibold">Page / board
            <select className={field} value={spec.paper} onChange={(e) => set('paper', e.target.value)}>{Object.keys(PAPERS).map((p) => <option key={p}>{p}</option>)}</select>
          </label>
          <label className="flex flex-col gap-2 text-[13px] font-semibold">Start ID<input className={field} type="number" min={0} value={spec.startId} onChange={(e) => set('startId', +e.target.value)} /></label>
        </div>
        <label className="flex items-center gap-2.5 text-sm font-normal"><input type="checkbox" className="h-[18px] w-[18px]" checked={spec.scaleBar} onChange={(e) => set('scaleBar', e.target.checked)} /> Add 100 mm scale bar and config QR</label>
        {(spec.type === 'ChArUco' || spec.type === 'ArUco grid') && (
          <label className="flex items-center gap-2.5 text-sm font-normal">
            <input type="checkbox" className="h-[18px] w-[18px]"
              checked={spec.legacyLayout ?? false}
              onChange={(e) => set('legacyLayout', e.target.checked)} />
            OpenCV &le; 4.5 legacy layout
          </label>
        )}

        <div className="flex flex-col gap-2.5 border-t border-line pt-4">
          <span className="text-[13px] font-semibold">Download</span>
          <div className="grid grid-cols-2 gap-2">
            <button type="button"
              className="col-span-2 rounded bg-ink px-3 py-[11px] text-sm font-semibold text-white disabled:opacity-50"
              disabled={busy !== null}
              onClick={async () => {
                setBusy('pdf');
                try {
                  const summary = patternSummary(spec);
                  const pdfBytes = await exportPdf({ spec, pw, ph });
                  const pngBlob = await exportPng({ svg, pw, ph });
                  const dxf = exportDxf({ spec, pw, ph });
                  const files = [
                    { name: `${slug}.pdf`, desc: 'PDF pattern (1:1 mm scale)', data: pdfBytes },
                    { name: `${slug}.svg`, desc: 'SVG vector pattern', data: svg },
                    { name: `${slug}.png`, desc: 'PNG raster (300 dpi)', data: pngBlob },
                    { name: `${slug}.dxf`, desc: 'DXF for CNC/laser fabrication', data: dxf },
                    { name: `${slug}.opencv.json`, desc: 'OpenCV config', data: opencvJson(spec) },
                    { name: `${slug}.kalibr.yaml`, desc: 'Kalibr config', data: kalibrYaml(spec) },
                    { name: `${slug}.ros2.yaml`, desc: 'ROS 2 camera_calibration config', data: ros2Yaml(spec) },
                    { name: `${slug}.halcon.descr`, desc: 'HALCON plate description', data: halconDescr(spec) },
                  ];
                  const blob = await exportZip({ slug, summary, files });
                  const a = document.createElement('a');
                  a.href = URL.createObjectURL(blob);
                  a.download = `${slug}-calibtools.zip`;
                  a.click();
                  URL.revokeObjectURL(a.href);
                } finally { setBusy(null); }
              }}
            >Download all (.zip)</button>
            <button type="button" className="rounded bg-brand px-3 py-[11px] text-sm font-semibold text-white disabled:opacity-50" disabled={busy !== null} onClick={async () => {
              setBusy('pdf');
              try {
                const bytes = await exportPdf({ spec, pw, ph });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' }));
                a.download = `${slug}.pdf`;
                a.click();
                URL.revokeObjectURL(a.href);
              } finally { setBusy(null); }
            }}>{busy === 'pdf' ? 'Generating…' : 'PDF (1:1)'}</button>
            <button type="button" className="rounded border border-ink bg-white px-3 py-[11px] text-sm font-medium" onClick={() => download(`${slug}.svg`, svg, 'image/svg+xml')}>SVG</button>
            <button type="button" className="rounded border border-ink bg-white px-3 py-[11px] text-sm font-medium disabled:opacity-50" disabled={busy !== null} onClick={async () => {
              setBusy('png');
              try {
                const blob = await exportPng({ svg, pw, ph });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `${slug}.png`;
                a.click();
                URL.revokeObjectURL(a.href);
              } finally { setBusy(null); }
            }}>{busy === 'png' ? 'Generating…' : 'PNG (300 dpi)'}</button>
            <button type="button" className="rounded border border-ink bg-white px-3 py-[11px] text-sm font-medium" onClick={() => download(`${slug}.dxf`, exportDxf({ spec, pw, ph }), 'application/dxf')}>DXF</button>
          </div>
          <span className="pt-1.5 text-[13px] font-semibold">Config files</span>
          <div className="flex flex-wrap gap-2 font-mono text-[13px]">
            <button type="button" className="rounded bg-ground-panel px-2.5 py-1.5" onClick={() => download(`${slug}.opencv.json`, opencvJson(spec), 'application/json')}>opencv.json</button>
            <button type="button" className="rounded bg-ground-panel px-2.5 py-1.5" onClick={() => download(`${slug}.kalibr.yaml`, kalibrYaml(spec), 'text/yaml')}>kalibr.yaml</button>
            <button type="button" className="rounded bg-ground-panel px-2.5 py-1.5" onClick={() => download(`${slug}.ros2.yaml`, ros2Yaml(spec), 'text/yaml')}>ros2.yaml</button>
            <button type="button" className="rounded bg-ground-panel px-2.5 py-1.5" onClick={() => download(`${slug}.halcon.descr`, halconDescr(spec), 'text/plain')}>halcon.descr</button>
          </div>
        </div>
      </form>

      <div className="flex min-w-0 flex-1 basis-[520px] flex-col gap-4">
        <div className="flex flex-wrap justify-between gap-3 text-sm text-ink-muted">
          <span>Preview · {spec.paper} · {spec.rows} × {spec.cols} {spec.type}, {spec.square} mm squares</span>
          <span className="font-mono">Board {boardW} × {boardH} mm · {corners} corners · {markers} markers</span>
        </div>
        {!fits && (
          <div role="alert" className="rounded border border-brand bg-brand-tint px-4 py-3 text-sm text-brand-dark">
            Board {boardW} × {boardH} mm does not fit on {spec.paper} with a 10 mm margin. Use squares ≤ {maxSquare} mm, fewer rows/columns, or a larger page.{' '}
            <button type="button" className="font-semibold underline" onClick={() => set('square', maxSquare)}>Set {maxSquare} mm</button>
          </div>
        )}
        <div className="flex justify-center overflow-hidden rounded-xl bg-ground-panel p-6 md:p-10">
          <div className="w-full max-w-[560px] overflow-hidden bg-white shadow-[0_12px_40px_rgba(0,0,0,0.12)] [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
        </div>
        <div className="card flex flex-wrap items-center justify-between gap-3 bg-ground-alt px-5 py-4">
          <span className="text-[15px]"><strong>Want this exact pattern on a rigid board?</strong> <span className="text-ink-muted">Same geometry, 0.3 mm tolerance, ships in 2–4 days.</span></span>
          <a href={productCtaUrl(spec)} className="rounded bg-ink px-4 py-2.5 text-sm font-semibold text-white no-underline hover:text-white">Order as composite board</a>
        </div>
      </div>
    </section>
  );
}
