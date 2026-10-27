import { useEffect, useMemo, useState } from 'react';
import { Grid2X2 } from '@/lib/icons';
import { checkerboardSvg, type PatternSpec } from '@/lib/patterns';
import { exportPdf } from '@/lib/exportPdf';
import { exportPng } from '@/lib/exportPng';
import { exportDxf } from '@/lib/exportDxf';
import { kalibrYaml, ros2Yaml, halconDescr, opencvJson } from '@/lib/exportConfig';
import { exportZip } from '@/lib/exportZip';
import { patternSummary } from '@/lib/brand';
import { computeSetBoards, buildSetManifest, setBoardFilename } from '@/lib/exportSet';
import { PAPERS, computeLayout, fitNotice, reductionNotice, smallestFittingPaper, type Orientation } from '@/lib/pageLayout';

/**
 * Pattern generator.
 * Renders calibration patterns as SVG with PDF, PNG, SVG export and
 * config file downloads (OpenCV, Kalibr, ROS 2, HALCON).
 */
const PATTERNS = ['Checkerboard', 'ChArUco', 'AprilGrid (Kalibr)', 'Asymmetric circles', 'Symmetric circles', 'ArUco grid', 'HALCON-style dots', 'Marker sheet'] as const;
const DICTS = [
  'DICT_4X4_50', 'DICT_5X5_100', 'DICT_6X6_250', 'DICT_7X7_1000',
  'DICT_ARUCO_ORIGINAL', 'DICT_ARUCO_MIP_36h12',
  'DICT_APRILTAG_36h11',
];
// PAPERS imported from pageLayout.ts

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

function mmToIn(mm: number): string {
  return (mm / 25.4).toFixed(2);
}

// Product sizes we sell (width x height in mm)
const PRODUCT_SIZES: [number, number][] = [[200,200],[300,200],[300,300],[400,300],[400,400],[500,300],[500,400]];

export default function Generator({ initialSpec }: GeneratorProps = {}) {
  const defaultSpec: PatternSpec = { type: 'ChArUco', rows: 7, cols: 10, square: 25, marker: 18, dict: 'DICT_6X6_250', paper: 'A4', startId: 0, scaleBar: true };
  const [spec, setSpec] = useState<PatternSpec>({ ...defaultSpec, ...initialSpec });
  const [busy, setBusy] = useState<'pdf' | 'png' | null>(null);
  const [boardCount, setBoardCount] = useState(1);
  const [boardStartIds, setBoardStartIds] = useState<number[]>([]);
  const [autoSize, setAutoSize] = useState(false);
  const [compactInfo, setCompactInfo] = useState(false);
  const [orientation, setOrientation] = useState<Orientation>('auto');
  const [urlRead, setUrlRead] = useState(false);
  const [showBeta, setShowBeta] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    setShowBeta(params.get('beta') === 'puzzle');
  }, []);

  const visiblePatterns = showBeta
    ? [...PATTERNS, 'PuzzleBoard' as const]
    : PATTERNS;

  // Read state from URL on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const fromUrl: Partial<PatternSpec> = {};
    const strFields: (keyof PatternSpec)[] = ['type', 'dict', 'paper', 'aprilFamily', 'tagIdList'];
    const numFields: (keyof PatternSpec)[] = ['rows', 'cols', 'square', 'marker', 'startId', 'borderBits', 'tagSpacing', 'circleDiameter', 'circleSpacingX', 'circleSpacingY', 'puzzleOffsetX', 'puzzleOffsetY'];
    const boolFields: (keyof PatternSpec)[] = ['scaleBar', 'finderMarkers', 'radonCheckers', 'invert', 'legacyLayout', 'showTagIds', 'symmetricCorners', 'showAxes', 'monochromeAxes', 'showCornerBadge'];

    for (const k of strFields) {
      const v = params.get(k);
      if (v !== null) (fromUrl as any)[k] = v;
    }
    for (const k of numFields) {
      const v = params.get(k);
      if (v !== null && !isNaN(+v)) (fromUrl as any)[k] = +v;
    }
    for (const k of boolFields) {
      const v = params.get(k);
      if (v !== null) (fromUrl as any)[k] = v === 'true';
    }

    if (Object.keys(fromUrl).length > 0) {
      setSpec(s => ({ ...s, ...fromUrl }));
    }
    setUrlRead(true);
  }, []);

  // Write state to URL on change (only after initial read)
  useEffect(() => {
    if (!urlRead || typeof window === 'undefined') return;
    const params = new URLSearchParams();
    const entries = Object.entries(spec) as [string, unknown][];
    for (const [k, v] of entries) {
      if (v !== undefined && v !== '' && v !== false && v !== null) {
        params.set(k, String(v));
      }
    }
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
  }, [spec, urlRead]);

  const [paperW, paperH] = PAPERS[spec.paper] ?? PAPERS.A4;
  const layout = useMemo(() => computeLayout(spec, paperW, paperH, orientation), [spec, paperW, paperH, orientation]);
  const { pw, ph } = layout;
  const svg = useMemo(() => checkerboardSvg(spec, pw, ph, layout), [spec, pw, ph, layout]);
  const set = <K extends keyof PatternSpec>(k: K, v: PatternSpec[K]) => setSpec((s) => ({ ...s, [k]: v }));
  const boardW = spec.cols * spec.square, boardH = spec.rows * spec.square;
  const productMatch = PRODUCT_SIZES.find(([pw2,ph2]) =>
    Math.abs(boardW - pw2) <= 2 && Math.abs(boardH - ph2) <= 2
  );

  // Auto-size paper: pick smallest standard page that fits (orientation-aware)
  useEffect(() => {
    if (!autoSize) return;
    const isInch = spec.paper === 'Letter' || spec.paper === 'Tabloid';
    const best = smallestFittingPaper(boardW, boardH, spec.square, isInch);
    if (best && best !== spec.paper) {
      set('paper', best);
    }
  }, [autoSize, boardW, boardH, spec.scaleBar]);

  const corners = (spec.rows - 1) * (spec.cols - 1);
  const markers = Math.floor((spec.rows * spec.cols) / 2);
  const fits = layout.fit === 'single';
  const maxSquare = Math.floor(Math.min((pw - 2 * layout.margin) / spec.cols, (ph - 2 * layout.margin - layout.quietZone * 2) / spec.rows) * 10) / 10;

  const download = (name: string, text: string, mime: string) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: mime }));
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const slug = `${spec.type.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${spec.rows}x${spec.cols}-${spec.square}mm`;

  const boards = useMemo(() => {
    if (boardCount <= 1) return null;
    return computeSetBoards(spec, boardCount, boardStartIds.length >= boardCount ? boardStartIds : undefined);
  }, [spec, boardCount, boardStartIds]);

  const field = 'w-full rounded border border-[#CFCFCF] bg-white px-3 py-[11px] text-[15px]';
  return (
    <section className="flex flex-wrap gap-10">
      <form className="card flex basis-[380px] flex-col gap-5 self-start p-7" onSubmit={(e) => e.preventDefault()}>
        <h1 className="m-0 flex items-center gap-3 text-[26px] font-extrabold tracking-[-0.02em]"><Grid2X2 size={24} strokeWidth={1.6} className="text-brand" aria-hidden="true" />Pattern generator</h1>
        <p className="m-0 text-sm leading-relaxed text-ink-muted">Runs in your browser. Nothing is uploaded.</p>

        <label className="flex flex-col gap-2 text-[13px] font-semibold">Pattern
          <select className={field} value={spec.type} onChange={(e) => set('type', e.target.value as PatternSpec['type'])}>
            {visiblePatterns.map((p) => <option key={p}>{p}</option>)}
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
          <label className="flex flex-col gap-2 text-[13px] font-semibold">Orientation
            <select className={field} value={orientation} onChange={(e) => setOrientation(e.target.value as Orientation)}>
              <option value="auto">Auto</option>
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-[13px] font-semibold">Start ID<input className={field} type="number" min={0} value={spec.startId} onChange={(e) => set('startId', +e.target.value)} /></label>
        </div>
        <label className="flex items-center gap-2.5 text-sm font-normal">
          <input type="checkbox" className="h-[18px] w-[18px]"
            checked={autoSize}
            onChange={(e) => setAutoSize(e.target.checked)} />
          Auto board size
        </label>
        <label className="flex items-center gap-2.5 text-sm font-normal"><input type="checkbox" className="h-[18px] w-[18px]" checked={spec.scaleBar} onChange={(e) => set('scaleBar', e.target.checked)} /> Add 100 mm scale bar and config QR</label>
        <label className="flex items-center gap-2.5 text-sm font-normal">
          <input type="checkbox" className="h-[18px] w-[18px]"
            checked={compactInfo}
            onChange={(e) => setCompactInfo(e.target.checked)} />
          Compact info (hide parameter line)
        </label>
        <label className="flex items-center gap-2.5 text-sm font-normal">
          <input type="checkbox" className="h-[18px] w-[18px]"
            checked={spec.showAxes ?? true}
            onChange={(e) => set('showAxes', e.target.checked)} />
          Show coordinate axes
        </label>
        {(spec.showAxes ?? true) && (
          <label className="flex items-center gap-2.5 text-sm font-normal">
            <input type="checkbox" className="h-[18px] w-[18px]"
              checked={spec.monochromeAxes ?? false}
              onChange={(e) => set('monochromeAxes', e.target.checked)} />
            Monochrome axes (for ceramic/glass)
          </label>
        )}
        {(spec.type === 'ChArUco' || spec.type === 'ArUco grid' || spec.type === 'AprilGrid (Kalibr)' || spec.type === 'Marker sheet') && (
          <label className="flex items-center gap-2.5 text-sm font-normal">
            <input type="checkbox" className="h-[18px] w-[18px]"
              checked={spec.showCornerBadge ?? true}
              onChange={(e) => set('showCornerBadge', e.target.checked)} />
            Corner ID badge (when start ID ≠ 0)
          </label>
        )}
        {(spec.type === 'ChArUco' || spec.type === 'ArUco grid') && (
          <label className="flex items-center gap-2.5 text-sm font-normal">
            <input type="checkbox" className="h-[18px] w-[18px]"
              checked={spec.legacyLayout ?? false}
              onChange={(e) => set('legacyLayout', e.target.checked)} />
            OpenCV &le; 4.5 legacy layout
          </label>
        )}

        {spec.type === 'AprilGrid (Kalibr)' && (
          <>
            <label className="flex flex-col gap-2 text-[13px] font-semibold">Tag family
              <select className={field} value={spec.aprilFamily ?? '36h11'}
                onChange={(e) => set('aprilFamily', e.target.value)}>
                <option value="16h5">16h5 (30 tags)</option>
                <option value="25h9">25h9 (35 tags)</option>
                <option value="36h11">36h11 (587 tags)</option>
                <option value="41h12">41h12 (2115 tags)</option>
                <option value="52h13">52h13 (48714 tags)</option>
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-2 text-[13px] font-semibold">Border bits
                <select className={field} value={spec.borderBits ?? 2}
                  onChange={(e) => set('borderBits', +e.target.value)}>
                  <option value={1}>1 (AprilTag 3)</option>
                  <option value={2}>2</option>
                </select>
              </label>
              <label className="flex flex-col gap-2 text-[13px] font-semibold">Tag spacing
                <input className={field} type="number" min={0.05} max={1} step={0.05}
                  value={spec.tagSpacing ?? 0.3}
                  onChange={(e) => set('tagSpacing', +e.target.value)} />
                <span className="text-[11px] font-normal text-ink-muted">{((spec.tagSpacing ?? 0.3) * spec.square).toFixed(1)} mm</span>
              </label>
            </div>
            <label className="flex flex-col gap-2 text-[13px] font-semibold">Specify tag IDs
              <span className="text-[11px] font-normal text-ink-muted">Start ID, or comma/range list (e.g. 0-9,15,20-24)</span>
              <input className={field} type="text" placeholder={String(spec.startId)}
                value={spec.tagIdList ?? ''}
                onChange={(e) => {
                  const v = e.target.value.trim();
                  set('tagIdList', v || undefined);
                  if (/^\d+$/.test(v)) set('startId', +v);
                }} />
            </label>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2.5 text-sm font-normal">
                <input type="checkbox" className="h-[18px] w-[18px]"
                  checked={spec.showTagIds ?? false}
                  onChange={(e) => set('showTagIds', e.target.checked)} />
                Display tag IDs
              </label>
              <label className="flex items-center gap-2.5 text-sm font-normal">
                <input type="checkbox" className="h-[18px] w-[18px]"
                  checked={spec.symmetricCorners ?? false}
                  onChange={(e) => set('symmetricCorners', e.target.checked)} />
                Symmetric corner squares
              </label>
            </div>
            <button type="button"
              className="rounded border border-line bg-ground-panel px-3 py-2 text-sm font-medium"
              onClick={() => setSpec(s => ({
                ...s, aprilFamily: '36h11', borderBits: 2, tagSpacing: 0.3, symmetricCorners: true,
              }))}>
              Kalibr preset
            </button>
          </>
        )}

        {spec.type === 'Marker sheet' && (
          <>
            <label className="flex flex-col gap-2 text-[13px] font-semibold">Tag family (optional)
              <select className={field} value={spec.aprilFamily ?? ''}
                onChange={(e) => set('aprilFamily', e.target.value || undefined)}>
                <option value="">Use ArUco dictionary</option>
                <option value="16h5">16h5 (30 tags)</option>
                <option value="25h9">25h9 (35 tags)</option>
                <option value="36h11">36h11 (587 tags)</option>
                <option value="41h12">41h12 (2115 tags)</option>
                <option value="52h13">52h13 (48714 tags)</option>
              </select>
            </label>
            {spec.aprilFamily && (
              <label className="flex flex-col gap-2 text-[13px] font-semibold">Border bits
                <select className={field} value={spec.borderBits ?? 2}
                  onChange={(e) => set('borderBits', +e.target.value)}>
                  <option value={1}>1 (AprilTag 3)</option>
                  <option value={2}>2</option>
                </select>
              </label>
            )}
            <label className="flex flex-col gap-2 text-[13px] font-semibold">Specify tag IDs
              <span className="text-[11px] font-normal text-ink-muted">Start ID, or comma/range list (e.g. 0-9,15,20-24)</span>
              <input className={field} type="text" placeholder={String(spec.startId)}
                value={spec.tagIdList ?? ''}
                onChange={(e) => {
                  const v = e.target.value.trim();
                  set('tagIdList', v || undefined);
                  if (/^\d+$/.test(v)) set('startId', +v);
                }} />
            </label>
            <label className="flex items-center gap-2.5 text-sm font-normal">
              <input type="checkbox" className="h-[18px] w-[18px]"
                checked={spec.showTagIds ?? false}
                onChange={(e) => set('showTagIds', e.target.checked)} />
              Display tag IDs
            </label>
          </>
        )}

        {(spec.type === 'Symmetric circles' || spec.type === 'Asymmetric circles' || spec.type === 'HALCON-style dots') && (
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-2 text-[13px] font-semibold">Circle diameter (mm)
              <input className={field} type="number" min={1} step={0.5}
                value={spec.circleDiameter ?? +(spec.square * 0.56).toFixed(1)}
                onChange={(e) => set('circleDiameter', +e.target.value)} />
            </label>
            <label className="flex flex-col gap-2 text-[13px] font-semibold">X spacing (mm)
              <input className={field} type="number" min={1}
                value={spec.circleSpacingX ?? spec.square}
                onChange={(e) => set('circleSpacingX', +e.target.value)} />
            </label>
            <label className="flex flex-col gap-2 text-[13px] font-semibold">Y spacing (mm)
              <input className={field} type="number" min={1}
                value={spec.circleSpacingY ?? spec.square}
                onChange={(e) => set('circleSpacingY', +e.target.value)} />
            </label>
          </div>
        )}

        {spec.type === 'Checkerboard' && (
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2.5 text-sm font-normal">
              <input type="checkbox" className="h-[18px] w-[18px]"
                checked={spec.finderMarkers ?? false}
                onChange={(e) => set('finderMarkers', e.target.checked)} />
              Finder markers (CALIB_CB_MARKER)
            </label>
            <label className="flex items-center gap-2.5 text-sm font-normal">
              <input type="checkbox" className="h-[18px] w-[18px]"
                checked={spec.radonCheckers ?? false}
                onChange={(e) => set('radonCheckers', e.target.checked)} />
              Radon (rounded) checkers
            </label>
          </div>
        )}

        {spec.type === 'PuzzleBoard' && (
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-2 text-[13px] font-semibold">Offset X
              <input className={field} type="number" min={0}
                value={spec.puzzleOffsetX ?? 0}
                onChange={(e) => set('puzzleOffsetX', Math.max(0, +e.target.value))} />
            </label>
            <label className="flex flex-col gap-2 text-[13px] font-semibold">Offset Y
              <input className={field} type="number" min={0}
                value={spec.puzzleOffsetY ?? 0}
                onChange={(e) => set('puzzleOffsetY', Math.max(0, +e.target.value))} />
            </label>
          </div>
        )}

        {(spec.type === 'Checkerboard' || spec.type.includes('circles') || spec.type.includes('dots')) && (
          <label className="flex items-center gap-2.5 text-sm font-normal">
            <input type="checkbox" className="h-[18px] w-[18px]"
              checked={spec.invert ?? false}
              onChange={(e) => set('invert', e.target.checked)} />
            Invert (swap black / white)
          </label>
        )}

        {(spec.type === 'ChArUco' || spec.type === 'ArUco grid' || spec.type === 'AprilGrid (Kalibr)') && (
          <div className="flex flex-col gap-3 border-t border-line pt-4">
            <label className="flex flex-col gap-2 text-[13px] font-semibold">Number of boards
              <input className={field} type="number" min={1} max={16}
                value={boardCount}
                onChange={(e) => {
                  const n = Math.max(1, Math.min(16, +e.target.value));
                  setBoardCount(n);
                  setBoardStartIds([]);
                }} />
            </label>
            {boards && boards.length >= 2 && (
              <div className="rounded border border-line bg-ground-panel p-3">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-[12px] text-ink-muted">
                    <th className="pb-1 pr-2">Board</th>
                    <th className="pb-1 pr-2">Start ID</th>
                    <th className="pb-1">ID Range</th>
                  </tr></thead>
                  <tbody>{boards.map(b => (
                    <tr key={b.index}>
                      <td className="py-0.5 pr-2">{b.index + 1}</td>
                      <td className="pr-2">
                        <input type="number" min={0}
                          className="w-20 rounded border border-line bg-white px-2 py-1 text-sm font-mono"
                          value={b.startId}
                          onChange={(e) => {
                            const ids = boards.map(bb => bb.startId);
                            ids[b.index] = Math.max(0, +e.target.value);
                            setBoardStartIds(ids);
                          }} />
                      </td>
                      <td className="font-mono text-ink-muted">{b.idRange.min}&#x2013;{b.idRange.max}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
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
                  const pdfBytes = await exportPdf({ spec, pw, ph, layout });
                  const pngBlob = await exportPng({ svg, pw, ph });
                  const dxf = exportDxf({ spec, pw, ph, layout });
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
            {boards && boards.length >= 2 && (
              <button type="button"
                className="col-span-2 rounded bg-brand px-3 py-[11px] text-sm font-semibold text-white disabled:opacity-50"
                disabled={busy !== null}
                onClick={async () => {
                  setBusy('pdf');
                  try {
                    const JSZip = (await import('jszip')).default;
                    const zip = new JSZip();
                    for (const board of boards) {
                      const boardLayout = computeLayout(board.spec, paperW, paperH, orientation);
                      const bytes = await exportPdf({ spec: board.spec, pw: boardLayout.pw, ph: boardLayout.ph, layout: boardLayout });
                      zip.file(setBoardFilename(spec, board.startId), bytes);
                    }
                    zip.file('set-manifest.json', buildSetManifest(spec, boards));
                    const blob = await zip.generateAsync({ type: 'blob' });
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = `${slug}-set-${boardCount}boards.zip`;
                    a.click();
                    URL.revokeObjectURL(a.href);
                  } finally { setBusy(null); }
                }}>
                Export set ({boardCount} boards .zip)
              </button>
            )}
            <button type="button" className="rounded bg-brand px-3 py-[11px] text-sm font-semibold text-white disabled:opacity-50" disabled={busy !== null} onClick={async () => {
              setBusy('pdf');
              try {
                const bytes = await exportPdf({ spec, pw, ph, layout });
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
            <button type="button" className="rounded border border-ink bg-white px-3 py-[11px] text-sm font-medium" onClick={() => download(`${slug}.dxf`, exportDxf({ spec, pw, ph, layout }), 'application/dxf')}>DXF</button>
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
          {!compactInfo && (
            <span>Preview · {spec.paper} {layout.orientation} · {spec.rows} × {spec.cols} {spec.type}, {spec.square} mm squares{layout.usableGrid ? ` · ${layout.usableGrid}` : ''}</span>
          )}
          <span className="font-mono">Board {boardW} × {boardH} mm <span className="text-ink-soft">({mmToIn(boardW)} × {mmToIn(boardH)} in)</span> · {corners} corners · {markers} markers</span>
          {productMatch && (
            <span className="text-sm font-medium text-green-700">Matches product size {productMatch[0]} × {productMatch[1]} mm</span>
          )}
        </div>
        {!fits && (
          <div role="alert" className="rounded border border-brand bg-brand-tint px-4 py-3 text-sm text-brand-dark">
            <p className="m-0 mb-2 font-semibold">{fitNotice(boardW, boardH, spec.paper)}</p>
            <ul className="m-0 list-none space-y-1 pl-0 text-[13px]">
              <li>(a) <strong>Tile</strong> across {layout.tiling ? `${layout.tiling.cols} \u00D7 ${layout.tiling.rows} = ${layout.tiling.totalPages}` : ''} {spec.paper} sheets at 100 % scale with 10 mm overlap and crop marks.</li>
              {layout.reducedSpec && (
                <li>(b) <strong>Reduce grid</strong>: {reductionNotice(spec.rows, spec.cols, layout.reducedSpec.rows, layout.reducedSpec.cols, spec.square, layout.reducedSpec.orientation)}.{' '}
                  <button type="button" className="font-semibold underline" onClick={() => { set('rows', layout.reducedSpec!.rows); set('cols', layout.reducedSpec!.cols); }}>Apply</button>
                </li>
              )}
              {layout.upsizePaper && (
                <li>(c) <strong>Switch to {layout.upsizePaper}</strong>.{' '}
                  <button type="button" className="font-semibold underline" onClick={() => set('paper', layout.upsizePaper!)}>Switch</button>
                </li>
              )}
            </ul>
            <p className="m-0 mt-2 text-[12px] text-ink-muted">Or use squares ≤ {maxSquare} mm.{' '}
              <button type="button" className="font-semibold underline" onClick={() => set('square', maxSquare)}>Set {maxSquare} mm</button>
            </p>
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
