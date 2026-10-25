import { useMemo, useState } from 'react';
import { ScanLine } from '@/lib/icons';
import { calculateFov, minDistance, SENSOR_PRESETS, type FovResult } from '@/lib/fov';

const PRESET_NAMES = Object.keys(SENSOR_PRESETS);

export default function FovCalculator() {
  const [preset, setPreset] = useState('2/3" (IMX174)');
  const [sensorW, setSensorW] = useState(8.77);
  const [sensorH, setSensorH] = useState(6.60);
  const [resW, setResW] = useState(1920);
  const [resH, setResH] = useState(1200);
  const [focal, setFocal] = useState(12);
  const [distance, setDistance] = useState(500);
  const [targetW, setTargetW] = useState(250);
  const [targetH, setTargetH] = useState(175);

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

  const fmt = (v: number, d = 1) => v.toFixed(d);
  const fmtMm = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(2)} m` : `${v.toFixed(1)} mm`);

  const field = 'w-full rounded border border-[#CFCFCF] bg-white px-3 py-[11px] text-[15px]';

  return (
    <section className="flex flex-wrap gap-10">
      {/* Input panel */}
      <form className="card flex basis-[380px] flex-col gap-5 self-start p-7" onSubmit={(e) => e.preventDefault()}>
        <h1 className="m-0 flex items-center gap-3 text-[26px] font-extrabold tracking-[-0.02em]"><ScanLine size={24} strokeWidth={1.6} className="text-brand" aria-hidden="true" />FOV calculator</h1>
        <p className="m-0 text-sm leading-relaxed text-ink-muted">Calculate field of view, coverage and GSD for your camera + lens setup.</p>

        <label className="flex flex-col gap-2 text-[13px] font-semibold">Sensor preset
          <select className={field} value={preset} onChange={(e) => applyPreset(e.target.value)}>
            {PRESET_NAMES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-2 text-[13px] font-semibold">Sensor width (mm)
            <input className={field} type="number" min={0.1} step={0.01} value={sensorW} onChange={(e) => { setSensorW(+e.target.value); setPreset('Custom'); }} />
          </label>
          <label className="flex flex-col gap-2 text-[13px] font-semibold">Sensor height (mm)
            <input className={field} type="number" min={0.1} step={0.01} value={sensorH} onChange={(e) => { setSensorH(+e.target.value); setPreset('Custom'); }} />
          </label>
          <label className="flex flex-col gap-2 text-[13px] font-semibold">Resolution W (px)
            <input className={field} type="number" min={1} value={resW} onChange={(e) => { setResW(+e.target.value); setPreset('Custom'); }} />
          </label>
          <label className="flex flex-col gap-2 text-[13px] font-semibold">Resolution H (px)
            <input className={field} type="number" min={1} value={resH} onChange={(e) => { setResH(+e.target.value); setPreset('Custom'); }} />
          </label>
        </div>

        <label className="flex flex-col gap-2 text-[13px] font-semibold">Focal length (mm)
          <input className={field} type="number" min={1} step={0.5} value={focal} onChange={(e) => setFocal(+e.target.value)} />
        </label>

        <label className="flex flex-col gap-2 text-[13px] font-semibold">Working distance (mm)
          <input className={field} type="number" min={1} value={distance} onChange={(e) => setDistance(+e.target.value)} />
        </label>

        <div className="border-t border-line pt-4">
          <span className="text-[13px] font-semibold">Target fill (optional)</span>
          <p className="m-0 mb-3 text-xs text-ink-muted">Enter your calibration target size to get a recommended distance.</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-2 text-[13px] font-semibold">Target width (mm)
              <input className={field} type="number" min={1} value={targetW} onChange={(e) => setTargetW(+e.target.value)} />
            </label>
            <label className="flex flex-col gap-2 text-[13px] font-semibold">Target height (mm)
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

        <div className="card flex flex-wrap items-center justify-between gap-3 bg-ground-alt px-5 py-4">
          <span className="text-[15px]"><strong>Need a calibration target?</strong> <span className="text-ink-muted">Print-exact patterns with 0.3 mm tolerance.</span></span>
          <a href="/tools/generator/" className="rounded bg-ink px-4 py-2.5 text-sm font-semibold text-white no-underline hover:text-white">Generate pattern</a>
        </div>
      </div>
    </section>
  );
}

function ResultCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-ground-panel p-4">
      <span className="text-xs font-medium text-ink-muted">{label}</span>
      <span className="font-mono text-lg font-bold">{value}</span>
    </div>
  );
}

function FovDiagram({ fov, distance, focal }: { fov: FovResult; distance: number; focal: number }) {
  const w = 320, h = 180;
  const lensX = 40;
  const farX = w - 20;
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
