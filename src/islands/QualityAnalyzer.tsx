import { useState } from 'react';
import { BarChart3 } from '@/lib/icons';
import { parseCalibrationData, analyzeQuality, type QualityReport, type CalibrationData } from '@/lib/quality';

const EXAMPLE = JSON.stringify({
  camera_matrix: [[1000, 0, 960], [0, 1000, 540], [0, 0, 1]],
  dist_coeffs: [-0.1, 0.05, 0.001, -0.001, 0.002],
  image_width: 1920,
  image_height: 1080,
  per_view_errors: [0.15, 0.18, 0.12, 0.20, 0.14, 0.16, 0.13, 0.19, 0.11, 0.17, 0.15, 0.14, 0.16, 0.18, 0.13],
  rms_error: 0.155,
  image_count: 15,
}, null, 2);

export default function QualityAnalyzer() {
  const [input, setInput] = useState('');
  const [report, setReport] = useState<QualityReport | null>(null);
  const [data, setData] = useState<CalibrationData | null>(null);
  const [error, setError] = useState('');

  const analyze = (text?: string) => {
    const src = text ?? input;
    setError('');
    setReport(null);
    setData(null);
    if (!src.trim()) return;

    try {
      const d = parseCalibrationData(src);
      setData(d);
      const r = analyzeQuality(d);
      setReport(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Parse error');
    }
  };

  const loadExample = () => { setInput(EXAMPLE); analyze(EXAMPLE); };

  const gradeColors: Record<string, string> = {
    excellent: 'text-green-700 bg-green-50 border-green-300',
    good: 'text-blue-700 bg-blue-50 border-blue-300',
    fair: 'text-yellow-700 bg-yellow-50 border-yellow-300',
    poor: 'text-red-700 bg-red-50 border-red-300',
  };

  const severityColors: Record<string, string> = {
    info: 'text-blue-700',
    warning: 'text-yellow-700',
    error: 'text-red-700',
  };

  return (
    <section className="flex flex-wrap gap-8">
      {/* Input */}
      <div className="flex min-w-0 flex-1 basis-[400px] flex-col gap-4">
        <div className="card p-7">
          <h1 className="m-0 mb-1 flex items-center gap-3 text-[26px] font-extrabold tracking-[-0.02em]"><BarChart3 size={24} strokeWidth={1.6} className="text-brand" aria-hidden="true" />Quality analyzer</h1>
          <p className="m-0 mb-5 text-sm text-ink-muted">Paste your calibration results (OpenCV JSON) to get a quality report with actionable findings.</p>

          <div className="mb-3 flex items-center justify-between">
            <label htmlFor="calib-input" className="text-[13px] font-semibold">Calibration data</label>
            <button type="button" className="text-xs text-brand underline" onClick={loadExample}>Load example</button>
          </div>
          <textarea
            id="calib-input"
            className="w-full rounded border border-[#CFCFCF] bg-white p-3 font-mono text-[13px] leading-relaxed"
            rows={12}
            placeholder='Paste JSON with camera_matrix, dist_coeffs, per_view_errors, rms_error...'
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          {error && <p className="m-0 mt-2 text-sm text-brand">{error}</p>}

          <button
            type="button"
            className="mt-3 rounded bg-brand px-5 py-3 text-sm font-semibold text-white"
            onClick={() => analyze()}
          >
            Analyze
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="flex min-w-0 flex-1 basis-[440px] flex-col gap-4">
        {report && (
          <>
            {/* Score */}
            <div className={`card flex items-center gap-5 border p-7 ${gradeColors[report.grade]}`}>
              <div className="text-center">
                <div className="text-4xl font-extrabold">{report.score}</div>
                <div className="text-xs font-semibold uppercase">{report.grade}</div>
              </div>
              <div className="text-sm">
                <p className="m-0">RMS reprojection error: <strong>{report.reprojection.rms.toFixed(4)} px</strong></p>
                <p className="m-0 mt-1">{data?.imageCount} images analyzed</p>
              </div>
            </div>

            {/* Intrinsics */}
            <div className="card p-6">
              <h2 className="m-0 mb-4 text-base font-bold">Camera intrinsics</h2>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <Stat label="fx" value={report.intrinsics.fx.toFixed(2)} />
                <Stat label="fy" value={report.intrinsics.fy.toFixed(2)} />
                <Stat label="cx" value={report.intrinsics.cx.toFixed(2)} />
                <Stat label="cy" value={report.intrinsics.cy.toFixed(2)} />
                <Stat label="fx/fy ratio" value={report.intrinsics.focalRatio.toFixed(4)} />
                <Stat label="PP offset" value={`${report.intrinsics.ppOffsetX.toFixed(1)}, ${report.intrinsics.ppOffsetY.toFixed(1)} px`} />
              </div>
            </div>

            {/* Distortion */}
            <div className="card p-6">
              <h2 className="m-0 mb-4 text-base font-bold">Distortion ({report.distortion.type})</h2>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <Stat label="k1" value={report.distortion.k1.toExponential(3)} />
                <Stat label="k2" value={report.distortion.k2.toExponential(3)} />
                <Stat label="k3" value={report.distortion.k3.toExponential(3)} />
                <Stat label="p1" value={report.distortion.p1.toExponential(3)} />
                <Stat label="p2" value={report.distortion.p2.toExponential(3)} />
                <Stat label="Max radial" value={`${report.distortion.maxRadialPx.toFixed(1)} px`} />
              </div>
            </div>

            {/* Reprojection errors */}
            <div className="card p-6">
              <h2 className="m-0 mb-4 text-base font-bold">Reprojection errors</h2>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <Stat label="RMS" value={`${report.reprojection.rms.toFixed(4)} px`} />
                <Stat label="Mean" value={`${report.reprojection.mean.toFixed(4)} px`} />
                <Stat label="Median" value={`${report.reprojection.median.toFixed(4)} px`} />
                <Stat label="Std dev" value={`${report.reprojection.stdDev.toFixed(4)} px`} />
                <Stat label="Min" value={`${report.reprojection.min.toFixed(4)} px`} />
                <Stat label="Max" value={`${report.reprojection.max.toFixed(4)} px`} />
              </div>
              {data && data.perViewErrors.length > 1 && (
                <div className="mt-4">
                  <h3 className="m-0 mb-2 text-xs font-semibold text-ink-muted">Per-image error</h3>
                  <div className="flex items-end gap-[2px]" style={{ height: 60 }}>
                    {data.perViewErrors.map((e, i) => {
                      const maxE = report.reprojection.max || 1;
                      const h = Math.max(2, (e / maxE) * 56);
                      const isOutlier = report.reprojection.outlierIndices.includes(i);
                      return (
                        <div
                          key={i}
                          className={`flex-1 rounded-t ${isOutlier ? 'bg-brand' : 'bg-brand/30'}`}
                          style={{ height: `${h}px` }}
                          title={`Image ${i}: ${e.toFixed(4)} px${isOutlier ? ' (outlier)' : ''}`}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Findings */}
            <div className="card p-6">
              <h2 className="m-0 mb-4 text-base font-bold">Findings</h2>
              <ul className="m-0 flex list-none flex-col gap-2 pl-0 text-sm">
                {report.findings.map((f, i) => (
                  <li key={i} className={severityColors[f.severity]}>
                    <span className="mr-2 font-mono text-xs uppercase">{f.severity}</span>
                    {f.message}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {!report && !error && (
          <div className="card p-8 text-center text-ink-muted">
            <p className="m-0">Paste your calibration JSON and click Analyze to see the report.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-ground-panel px-3 py-2">
      <span className="text-xs text-ink-muted">{label}: </span>
      <span className="font-mono font-semibold">{value}</span>
    </div>
  );
}
