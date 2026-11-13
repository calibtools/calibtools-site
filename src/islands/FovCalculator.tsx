import { useMemo, useState } from 'react';
import { ScanLine } from '@/lib/icons';
import { calculateFov, convertFov, formatLength, minDistance, recommendBoard, requiredFocal, ASPECT_RATIOS, SENSOR_PRESETS, TARGET_FILL, type FovAxis, type FovResult } from '@/lib/fov';

const PRESET_NAMES = Object.keys(SENSOR_PRESETS);

/** What the calculator shows when it opens. The home page draws its example from the same values. */
export const FOV_DEFAULTS = { preset: '2/3" (IMX174)', sensorW: 8.77, sensorH: 6.60, resW: 1920, resH: 1200, focal: 12, distance: 500 };

export default function FovCalculator({ heading = 'FOV calculator' }: { heading?: string } = {}) {
  const [preset, setPreset] = useState(FOV_DEFAULTS.preset);
  const [sensorW, setSensorW] = useState(FOV_DEFAULTS.sensorW);
  const [sensorH, setSensorH] = useState(FOV_DEFAULTS.sensorH);
  const [resW, setResW] = useState(FOV_DEFAULTS.resW);
  const [resH, setResH] = useState(FOV_DEFAULTS.resH);
  const [focal, setFocal] = useState(FOV_DEFAULTS.focal);
  const [distance, setDistance] = useState(FOV_DEFAULTS.distance);
  const [targetW, setTargetW] = useState(250);
  const [targetH, setTargetH] = useState(175);
  const [wantW, setWantW] = useState(300);
  const [wantH, setWantH] = useState(0);
  const [convAngle, setConvAngle] = useState(90);
  const [convAxis, setConvAxis] = useState<FovAxis>('horizontal');
  const [convRatio, setConvRatio] = useState('16:9');

  const applyPreset = (name: string) => {
    setPreset(name);
    const p = SENSOR_PRESETS[name];
    if (p && name !== 'Custom') {
      setSensorW(p[0]);
      setSensorH(p[1]);
      setResW(p[2]);
      setResH(p[3]);
    }
  };

  const fov = useMemo<FovResult>(
    () => calculateFov(sensorW, sensorH, focal, distance, resW, resH),
    [sensorW, sensorH, focal, distance, resW, resH],
  );

  const recDist = useMemo(
    () => minDistance(targetW, targetH, sensorW, sensorH, focal, 0.8),
    [targetW, targetH, sensorW, sensorH, focal],
  );

  const needFocal = useMemo(
    () => requiredFocal(sensorW, sensorH, distance, wantW, wantH),
    [sensorW, sensorH, distance, wantW, wantH],
  );

  const rec = useMemo(
    () => recommendBoard(fov.hCoverage, fov.vCoverage, fov.gsd),
    [fov],
  );
  const genUrl = `/tools/generator/?type=ChArUco&rows=${rec.board.rows}&cols=${rec.board.cols}&square=${rec.board.square}&marker=${rec.board.marker}&dict=DICT_6X6_250`;

  const conv = useMemo(() => {
    const r = ASPECT_RATIOS.find((a) => a.label === convRatio);
    return r ? convertFov(convAngle, convAxis, r.w, r.h) : convertFov(convAngle, convAxis, sensorW, sensorH);
  }, [convAngle, convAxis, convRatio, sensorW, sensorH]);

  const fmt = (v: number, d = 1) => v.toFixed(d);
  const fmtMm = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(2)} m` : `${v.toFixed(1)} mm`);
  const deg = (v: number) => (Number.isFinite(v) ? `${v.toFixed(1)}°` : '—');

  const field = 'w-full rounded border border-[#CFCFCF] bg-white px-3 py-[11px] text-[15px]';

  return (
    <section className="flex flex-wrap gap-10">
      {/* Input panel */}
      <form className="card flex basis-[380px] flex-col gap-5 self-start p-7" onSubmit={(e) => e.preventDefault()}>
        <h1 className="m-0 flex items-center gap-3 text-[26px] font-extrabold tracking-[-0.02em]"><ScanLine size={24} strokeWidth={1.6} className="text-brand" aria-hidden="true" />{heading}</h1>
        <p className="m-0 text-sm leading-relaxed text-ink-muted">Calculate field of view, coverage and GSD for your camera and lens, find the focal length for a given field, and size a calibration board.</p>

        <label className="rows-2 gap-y-2 text-[13px] font-semibold">Sensor preset
          <select className={field} value={preset} onChange={(e) => applyPreset(e.target.value)}>
            {PRESET_NAMES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="rows-2 gap-y-2 text-[13px] font-semibold">Sensor width (mm)
            <input className={field} type="number" min={0.1} step={0.01} value={sensorW} onChange={(e) => { setSensorW(+e.target.value); setPreset('Custom'); }} />
          </label>
          <label className="rows-2 gap-y-2 text-[13px] font-semibold">Sensor height (mm)
            <input className={field} type="number" min={0.1} step={0.01} value={sensorH} onChange={(e) => { setSensorH(+e.target.value); setPreset('Custom'); }} />
          </label>
          <label className="rows-2 gap-y-2 text-[13px] font-semibold">Resolution W (px)
            <input className={field} type="number" min={1} value={resW} onChange={(e) => { setResW(+e.target.value); setPreset('Custom'); }} />
          </label>
          <label className="rows-2 gap-y-2 text-[13px] font-semibold">Resolution H (px)
            <input className={field} type="number" min={1} value={resH} onChange={(e) => { setResH(+e.target.value); setPreset('Custom'); }} />
          </label>
        </div>

        <label className="rows-2 gap-y-2 text-[13px] font-semibold">Focal length (mm)
          <input className={field} type="number" min={1} step={0.5} value={focal} onChange={(e) => setFocal(+e.target.value)} />
        </label>

        <label className="rows-2 gap-y-2 text-[13px] font-semibold">Working distance (mm)
          <input className={field} type="number" min={1} value={distance} onChange={(e) => setDistance(+e.target.value)} />
        </label>

        <div className="border-t border-line pt-4">
          <span className="text-[13px] font-semibold">Lens finder (optional)</span>
          <p className="m-0 mb-3 text-xs text-ink-muted">Enter the field you need to see at the working distance. Leave height at 0 to size by width only.</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="rows-2 gap-y-2 text-[13px] font-semibold">Field width (mm)
              <input className={field} type="number" min={1} value={wantW} onChange={(e) => setWantW(+e.target.value)} />
            </label>
            <label className="rows-2 gap-y-2 text-[13px] font-semibold">Field height (mm)
              <input className={field} type="number" min={0} value={wantH} onChange={(e) => setWantH(+e.target.value)} />
            </label>
          </div>
        </div>

        <div className="border-t border-line pt-4">
          <span className="text-[13px] font-semibold">Target fill (optional)</span>
          <p className="m-0 mb-3 text-xs text-ink-muted">Enter your calibration target size to get a recommended distance.</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="rows-2 gap-y-2 text-[13px] font-semibold">Target width (mm)
              <input className={field} type="number" min={1} value={targetW} onChange={(e) => setTargetW(+e.target.value)} />
            </label>
            <label className="rows-2 gap-y-2 text-[13px] font-semibold">Target height (mm)
              <input className={field} type="number" min={1} value={targetH} onChange={(e) => setTargetH(+e.target.value)} />
            </label>
          </div>
        </div>
      </form>

      {/* Results panel */}
      <div className="flex min-w-0 flex-1 basis-[420px] flex-col gap-5">
        {/* FOV results */}
        <div className="card p-7">
          <h2 className="m-0 mb-5 text-lg font-bold">Field of view</h2>
          <div className="grid grid-cols-3 gap-4">
            <ResultCard label="Horizontal" value={`${fmt(fov.hFovDeg)}°`} />
            <ResultCard label="Vertical" value={`${fmt(fov.vFovDeg)}°`} />
            <ResultCard label="Diagonal" value={`${fmt(fov.dFovDeg)}°`} />
          </div>
        </div>

        {/* Coverage results */}
        <div className="card p-7">
          <h2 className="m-0 mb-5 text-lg font-bold">Coverage at {fmtMm(distance)}</h2>
          <div className="grid grid-cols-3 gap-4">
            <ResultCard label="Width" value={fmtMm(fov.hCoverage)} />
            <ResultCard label="Height" value={fmtMm(fov.vCoverage)} />
            <ResultCard label="GSD" value={`${fov.gsd.toFixed(3)} mm/px`} />
          </div>
          <p className="m-0 mt-4 font-mono text-[13px] text-ink-muted" data-us-units>
            {formatLength(fov.hCoverage)} × {formatLength(fov.vCoverage)} at {formatLength(distance)}
          </p>
        </div>

        {/* Visual diagram */}
        <div className="card p-7">
          <h2 className="m-0 mb-5 text-lg font-bold">Geometry</h2>
          <FovDiagram fov={fov} distance={distance} focal={focal} />
        </div>

        {/* Target recommendation */}
        <div className="card flex flex-wrap items-center justify-between gap-3 bg-ground-alt px-5 py-4">
          <div>
            <p className="m-0 text-[15px]"><strong>Recommended distance</strong> for {targetW} × {targetH} mm target (80% fill):</p>
            <p className="m-0 mt-1 font-mono text-lg font-bold">{fmtMm(recDist)}</p>
          </div>
          <button
            type="button"
            className="rounded bg-ink px-4 py-2.5 text-sm font-semibold text-white"
            onClick={() => setDistance(Math.round(recDist))}
          >
            Use this distance
          </button>
        </div>

        {/* Lens finder result */}
        <div className="card flex flex-wrap items-center justify-between gap-3 bg-ground-alt px-5 py-4">
          <div>
            <p className="m-0 text-[15px]"><strong>Focal length needed</strong> to see {wantW}{wantH > 0 ? ` × ${wantH}` : ''} mm at {fmtMm(distance)}:</p>
            <p className="m-0 mt-1 font-mono text-lg font-bold">{Number.isFinite(needFocal) && needFocal > 0 ? `${fmt(needFocal)} mm` : '—'}</p>
            <p className="m-0 mt-1 text-xs text-ink-muted">Pick the nearest stock focal length at or below this value.</p>
          </div>
          <button
            type="button"
            className="rounded bg-ink px-4 py-2.5 text-sm font-semibold text-white"
            disabled={!Number.isFinite(needFocal) || needFocal <= 0}
            onClick={() => setFocal(Math.round(needFocal * 10) / 10)}
          >
            Use this focal length
          </button>
        </div>

        {/* Board recommendation */}
        <div className="card p-7">
          <h2 className="m-0 mb-2 text-lg font-bold">Recommended calibration board</h2>
          <p className="m-0 mb-5 text-sm text-ink-muted">For the field at {fmtMm(distance)}, aiming for about {Math.round(TARGET_FILL * 100)} % frame fill.</p>
          <div className="grid grid-cols-3 gap-4">
            <ResultCard label="Board" value={`${rec.board.label} mm`} />
            <ResultCard label="Frame fill" value={`${Math.round(rec.fill * 100)} %`} />
            <ResultCard label="Pixels per square" value={`${fmt(rec.pxPerSquare, 0)} px`} pixel />
          </div>
          <p className="m-0 mt-4 text-sm">
            ChArUco {rec.board.cols} × {rec.board.rows}, {rec.board.square} mm squares, {rec.board.marker} mm markers (DICT_6X6_250): <span className="font-pixel" data-unit="px">{fmt(rec.pxPerBit)} px</span> per marker bit.
            {rec.fill > 0.9 && ' The field is smaller than every stock board; use a printed pattern sized to the field or move the camera back.'}
            {!rec.decodable && ' Markers will be too small to decode reliably at this distance; move closer or use a longer lens.'}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" className="rounded border border-ink px-4 py-2.5 text-sm font-semibold" onClick={() => { setTargetW(rec.boardW); setTargetH(rec.boardH); }}>Use as target</button>
            <a href={genUrl} className="rounded bg-ink px-4 py-2.5 text-sm font-semibold text-white no-underline hover:text-white inline-flex items-center">Print this pattern free</a>
            <a href={rec.productPath} className="rounded border border-ink px-4 py-2.5 text-sm font-semibold text-ink no-underline inline-flex items-center">Rigid board details</a>
          </div>
        </div>

        {/* FOV converter: one angle and an aspect ratio in, the other two angles out */}
        <div className="card p-7" id="fov-converter">
          <h2 className="m-0 mb-2 text-lg font-bold">FOV converter</h2>
          <p className="m-0 mb-5 text-sm text-ink-muted">Know one angle from a datasheet? Convert between horizontal, vertical and diagonal field of view. No sensor or lens data needed.</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="rows-2 gap-y-2 text-[13px] font-semibold">Angle (°)
              <input className={field} type="number" min={1} max={179} step={0.1} value={convAngle} onChange={(e) => setConvAngle(+e.target.value)} />
            </label>
            <label className="rows-2 gap-y-2 text-[13px] font-semibold">It is the
              <select className={field} value={convAxis} onChange={(e) => setConvAxis(e.target.value as FovAxis)}>
                <option value="horizontal">Horizontal FOV</option>
                <option value="vertical">Vertical FOV</option>
                <option value="diagonal">Diagonal FOV</option>
              </select>
            </label>
            <label className="rows-2 gap-y-2 text-[13px] font-semibold">Aspect ratio
              <select className={field} value={convRatio} onChange={(e) => setConvRatio(e.target.value)}>
                {ASPECT_RATIOS.map((a) => <option key={a.label}>{a.label}</option>)}
                <option value="sensor">Sensor above</option>
              </select>
            </label>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-4" data-fov-converter-result>
            <ResultCard label="Horizontal" value={deg(conv.horizontal)} />
            <ResultCard label="Vertical" value={deg(conv.vertical)} />
            <ResultCard label="Diagonal" value={deg(conv.diagonal)} />
          </div>
          <p className="m-0 mt-4 text-xs text-ink-muted">For standard (rectilinear) lenses. Fisheye lenses follow a different projection.</p>
        </div>

        <div className="card flex flex-wrap items-center justify-between gap-3 bg-ground-alt px-5 py-4">
          <span className="text-[15px]"><strong>Need a calibration target?</strong> <span className="text-ink-muted">Print 1:1 patterns with a 100 mm scale bar to check your printer.</span></span>
          <a href="/tools/generator/" className="rounded bg-ink px-4 py-2.5 text-sm font-semibold text-white no-underline hover:text-white min-h-[44px] md:min-h-[24px] inline-flex items-center">Generate pattern</a>
        </div>
      </div>
    </section>
  );
}

/** `pixel`: the value is a count of camera pixels, set in Geist Pixel (DESIGN.md: pixels and millimeters use different faces). */
function ResultCard({ label, value, pixel }: { label: string; value: string; pixel?: boolean }) {
  return (
    <div className="rows-2 gap-y-1 rounded-lg bg-ground-panel p-4">
      <span className="text-xs font-medium text-ink-muted">{label}</span>
      <span className={pixel ? 'font-pixel text-xl' : 'font-mono text-lg font-bold'} data-unit={pixel ? 'px' : undefined}>{value}</span>
    </div>
  );
}

export function FovDiagram({ fov, distance, focal }: { fov: FovResult; distance: number; focal: number }) {
  const w = 320, h = 180;
  const lensX = 40;
  const farX = w - 56; // room for the coverage label right of the cone
  const midY = h / 2;
  const halfAngleRad = (fov.hFovDeg / 2) * (Math.PI / 180);
  const spread = Math.min((farX - lensX) * Math.tan(halfAngleRad) * 0.4, midY - 10);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label={`FOV diagram: ${fov.hFovDeg.toFixed(1)}° horizontal`}>
      {/* FOV cone */}
      <polygon
        points={`${lensX},${midY} ${farX},${midY - spread} ${farX},${midY + spread}`}
        fill="#E60012" fillOpacity="0.08" stroke="#E60012" strokeWidth="1.5"
      />
      {/* Lens */}
      <circle cx={lensX} cy={midY} r="5" fill="#E60012" />
      <text x={lensX} y={midY + 20} textAnchor="middle" fontSize="10" fill="#666">{focal} mm</text>
      {/* Distance line */}
      <line x1={lensX} y1={h - 15} x2={farX} y2={h - 15} stroke="#999" strokeWidth="0.5" strokeDasharray="3,3" />
      <text x={(lensX + farX) / 2} y={h - 5} textAnchor="middle" fontSize="9" fill="#999">
        {distance >= 1000 ? `${(distance / 1000).toFixed(1)} m` : `${distance} mm`}
      </text>
      {/* Coverage labels */}
      <line x1={farX} y1={midY - spread} x2={farX} y2={midY + spread} stroke="#E60012" strokeWidth="1" />
      <text x={farX + 2} y={midY + 3} fontSize="9" fill="#E60012" fontWeight="bold">
        {fov.hCoverage >= 1000 ? `${(fov.hCoverage / 1000).toFixed(2)} m` : `${fov.hCoverage.toFixed(0)} mm`}
      </text>
      {/* Angle arc */}
      <text x={lensX + 30} y={midY - 3} fontSize="10" fill="#333" fontWeight="600">{fov.hFovDeg.toFixed(1)}°</text>
    </svg>
  );
}
