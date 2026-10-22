import { useRef, useState } from 'react';
import { loadOpenCv } from '@/lib/opencv';
import { detectPattern, drawCorners, expectedCount, type DetectionResult } from '@/lib/detect';
import type { PatternSpec } from '@/lib/patterns';

const PATTERNS = ['Checkerboard', 'ChArUco', 'AprilGrid (Kalibr)', 'Asymmetric circles', 'Symmetric circles', 'ArUco grid', 'HALCON-style dots'] as const;
const DICTS = ['DICT_6X6_250', 'DICT_5X5_100', 'DICT_4X4_50', 'DICT_APRILTAG_36h11', 'DICT_ARUCO_ORIGINAL'];

export default function DetectionCheck() {
  const [spec, setSpec] = useState<PatternSpec>({
    type: 'ChArUco', rows: 7, cols: 10, square: 25, marker: 18,
    dict: 'DICT_6X6_250', paper: 'A4', startId: 0, scaleBar: true,
  });
  const [status, setStatus] = useState<string>('Upload an image of your calibration pattern.');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const set = <K extends keyof PatternSpec>(k: K, v: PatternSpec[K]) => setSpec((s) => ({ ...s, [k]: v }));

  const handleFile = async (file: File) => {
    setResult(null);
    setLoading(true);
    setStatus('Loading image…');

    const url = URL.createObjectURL(file);
    setImageSrc(url);

    const img = new Image();
    img.onload = async () => {
      try {
        setStatus('Loading OpenCV.js…');
        const cv = await loadOpenCv((s) => setStatus(s));

        setStatus('Detecting pattern…');
        const det = detectPattern(cv, img, spec);
        setResult(det);
        setStatus(det.message);

        // Draw overlay
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d')!;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          if (det.corners.length > 0) {
            drawCorners(ctx, det.corners, 1, 1, det.found);
          }
        }
      } catch (err) {
        setStatus(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };
    img.onerror = () => {
      setStatus('Failed to load image.');
      setLoading(false);
    };
    img.src = url;
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const expected = expectedCount(spec);
  const field = 'w-full rounded border border-[#CFCFCF] bg-white px-3 py-[11px] text-[15px]';

  return (
    <section className="flex flex-wrap gap-10">
      {/* Config panel */}
      <form className="card flex basis-[340px] flex-col gap-5 self-start p-7" onSubmit={(e) => e.preventDefault()}>
        <h1 className="m-0 text-[26px] font-extrabold tracking-[-0.02em]">Detection check</h1>
        <p className="m-0 text-sm leading-relaxed text-ink-muted">Upload a photo of your printed pattern and verify that OpenCV can detect all corners.</p>

        <label className="flex flex-col gap-2 text-[13px] font-semibold">Pattern
          <select className={field} value={spec.type} onChange={(e) => set('type', e.target.value as PatternSpec['type'])}>
            {PATTERNS.map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-2 text-[13px] font-semibold">Rows
            <input className={field} type="number" min={2} value={spec.rows} onChange={(e) => set('rows', +e.target.value)} />
          </label>
          <label className="flex flex-col gap-2 text-[13px] font-semibold">Columns
            <input className={field} type="number" min={2} value={spec.cols} onChange={(e) => set('cols', +e.target.value)} />
          </label>
        </div>
        {(spec.type === 'ChArUco' || spec.type === 'ArUco grid' || spec.type === 'AprilGrid (Kalibr)') && (
          <label className="flex flex-col gap-2 text-[13px] font-semibold">Dictionary
            <select className={field} value={spec.dict} onChange={(e) => set('dict', e.target.value)}>
              {DICTS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </label>
        )}

        <div className="rounded bg-ground-panel px-4 py-3 text-sm">
          <span className="font-semibold">Expected: </span>
          <span className="font-mono">{expected} {spec.type.includes('circle') || spec.type.includes('dot') ? 'centers' : 'corners'}</span>
        </div>

        {result && (
          <div className={`rounded border px-4 py-3 text-sm ${
            result.found
              ? 'border-green-300 bg-green-50 text-green-800'
              : 'border-brand bg-brand-tint text-brand-dark'
          }`}>
            <p className="m-0 font-semibold">{result.found ? 'All detected' : 'Detection incomplete'}</p>
            <p className="m-0 mt-1 font-mono text-xs">{result.detectedCount}/{result.expectedCount} in {result.timeMs.toFixed(0)} ms</p>
          </div>
        )}
      </form>

      {/* Image area */}
      <div className="flex min-w-0 flex-1 basis-[480px] flex-col gap-4">
        <div
          className="relative flex min-h-[400px] items-center justify-center rounded-xl border-2 border-dashed border-line bg-ground-panel"
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          {!imageSrc && (
            <div className="flex flex-col items-center gap-3 p-8 text-center">
              <p className="m-0 text-ink-muted">Drag and drop an image here, or</p>
              <label className="cursor-pointer rounded bg-brand px-5 py-3 text-sm font-semibold text-white">
                Choose file
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
              </label>
              <p className="m-0 text-xs text-ink-muted">PNG, JPEG, BMP. Nothing is uploaded — processing runs in your browser.</p>
            </div>
          )}
          {imageSrc && (
            <canvas
              ref={canvasRef}
              className="max-h-[600px] w-full object-contain"
              style={{ imageRendering: 'auto' }}
            />
          )}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80">
              <span className="text-sm font-semibold text-ink-muted">{status}</span>
            </div>
          )}
        </div>

        <p className="m-0 text-sm text-ink-muted">{status}</p>

        {imageSrc && (
          <button
            type="button"
            className="self-start rounded border border-ink bg-white px-4 py-2.5 text-sm font-medium"
            onClick={() => { setImageSrc(null); setResult(null); setStatus('Upload an image of your calibration pattern.'); }}
          >
            Clear image
          </button>
        )}
      </div>
    </section>
  );
}
