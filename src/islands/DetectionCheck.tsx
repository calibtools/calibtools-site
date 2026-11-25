import { useEffect, useRef, useState } from 'react';
import { ScanSearch } from '@/lib/icons';
import { loadOpenCv } from '@/lib/opencv';
import { detectPattern, drawDetection, canCheck, CHECKABLE_TYPES, type DetectionResult } from '@/lib/detect';
import type { PatternSpec } from '@/lib/patterns';
import { DICTS, APRIL_FAMILIES } from '@/lib/dictNames';
import { GENERATOR_DEFAULT, specFromParams } from '@/lib/patternLink';
import { parse, toSpec } from '@/lib/convert';
import { patternSummary } from '@/lib/brand';
import { featureCounts } from '@/lib/patternFacts';
import { markerCapacity, formatIds } from '@/lib/idRange';

const START: PatternSpec = { ...GENERATOR_DEFAULT, type: 'ChArUco', rows: 7, cols: 10, square: 25, marker: 18, dict: 'DICT_6X6_250' };
const IDLE = 'Choose a photo of your board.';

export default function DetectionCheck() {
  const [spec, setSpec] = useState<PatternSpec>(START);
  const [status, setStatus] = useState<string>(IDLE);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [hasImage, setHasImage] = useState(false);
  const [fileNote, setFileNote] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // A pattern link from the generator (?type=…&rows=…) opens the check with that pattern.
  useEffect(() => {
    const fromLink = { ...GENERATOR_DEFAULT, ...specFromParams(new URLSearchParams(window.location.search)) } as PatternSpec;
    if (window.location.search && canCheck(fromLink.type)) setSpec(fromLink);
  }, []);

  const set = <K extends keyof PatternSpec>(k: K, v: PatternSpec[K]) => { setSpec((s) => ({ ...s, [k]: v })); setResult(null); };

  const capacity = markerCapacity(spec);
  const idsShort = capacity?.short ?? false;
  const isSheet = spec.type === 'Marker sheet';
  const isGrid = spec.type === 'AprilGrid (Kalibr)';
  const usesFamily = isGrid || (isSheet && !!spec.aprilFamily);

  const run = async (img: HTMLImageElement, s: PatternSpec) => {
    setResult(null);
    setLoading(true);
    try {
      const cv = await loadOpenCv(setStatus);
      setStatus('Looking for markers…');
      // let the status line paint before the detector takes the thread
      await new Promise((r) => setTimeout(r, 30));
      const canvas = canvasRef.current!;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0);
      const det = detectPattern(cv, ctx.getImageData(0, 0, canvas.width, canvas.height), s);
      drawDetection(ctx, det);
      setResult(det);
      setStatus(det.message);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'The check did not finish. Reload the page and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFile = (file: File) => {
    const img = new Image();
    img.onload = () => { imageRef.current = img; setHasImage(true); setTimeout(() => { if (!idsShort) run(img, spec); }, 0); };
    img.onerror = () => { setStatus('This file could not be opened as an image. Use a JPEG or PNG.'); };
    img.src = URL.createObjectURL(file);
  };

  const loadConfig = async (file: File) => {
    try {
      const raw = JSON.parse(await file.text());
      // Our opencv.json names the pattern and gives whole numbers of rows and columns; anything else is another kind of file.
      if (typeof raw?.pattern !== 'string' || !Number.isInteger(raw.rows) || !Number.isInteger(raw.cols) || raw.rows < 1 || raw.cols < 1) throw new Error('not a pattern file');
      const read = toSpec(parse(JSON.stringify(raw)));
      if (!canCheck(read.type)) { setFileNote(`${file.name} describes a ${read.type}. The check reads patterns with markers.`); return; }
      setSpec({ ...GENERATOR_DEFAULT, ...read });
      setResult(null);
      setFileNote(`Settings taken from ${file.name}.`);
    } catch {
      setFileNote(`${file.name} could not be read. Use the opencv.json that comes with the pattern.`);
    }
  };

  const clear = () => { imageRef.current = null; setHasImage(false); setResult(null); setStatus(IDLE); };

  const field = 'w-full rounded border border-[#CFCFCF] bg-white px-3 py-[11px] text-[15px]';
  const label = 'rows-2 gap-y-2 text-[13px] font-semibold';
  const num = (k: 'rows' | 'cols' | 'square' | 'marker' | 'startId', min: number) => (
    <input className={field} type="number" min={min} value={spec[k]} onChange={(e) => set(k, Math.max(min, +e.target.value || 0))} />
  );

  return (
    <section className="flex flex-wrap gap-10">
      <form className="card flex basis-[340px] flex-col gap-5 self-start p-7" onSubmit={(e) => e.preventDefault()}>
        <h1 className="m-0 flex items-center gap-3 text-[26px] font-extrabold tracking-[-0.02em]"><ScanSearch size={24} strokeWidth={1.6} className="text-brand" aria-hidden="true" />Detection check</h1>
        <p className="m-0 text-sm leading-relaxed text-ink-muted">See which markers OpenCV reads in a photo of your board. Runs in your browser. Nothing is uploaded.</p>

        <label className={label}>Pattern
          <select className={field} value={spec.type} onChange={(e) => set('type', e.target.value as PatternSpec['type'])}>
            {CHECKABLE_TYPES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className={label}>Rows{num('rows', 1)}</label>
          <label className={label}>Columns{num('cols', 1)}</label>
        </div>
        {spec.type === 'ChArUco' && (
          <div className="grid grid-cols-2 gap-3">
            <label className={label}>Square (mm){num('square', 1)}</label>
            <label className={label}>Marker (mm){num('marker', 1)}</label>
          </div>
        )}
        {isSheet && (
          <label className={label}>Markers from
            <select className={field} value={spec.aprilFamily ? 'family' : 'dict'} data-testid="sheet-source"
              onChange={(e) => { setSpec((s) => ({ ...s, aprilFamily: e.target.value === 'family' ? '36h11' : undefined, borderBits: e.target.value === 'family' ? 1 : undefined })); setResult(null); }}>
              <option value="dict">ArUco dictionary</option>
              <option value="family">AprilTag family</option>
            </select>
          </label>
        )}
        {usesFamily ? (
          <label className={label}>Tag family
            <select className={field} value={spec.aprilFamily ?? '36h11'} onChange={(e) => set('aprilFamily', e.target.value)}>
              {APRIL_FAMILIES.map(([f, n]) => <option key={f} value={f}>{f} ({n} tags)</option>)}
            </select>
          </label>
        ) : (
          <label className={label}>Dictionary
            <select className={field} value={spec.dict} onChange={(e) => set('dict', e.target.value)}>
              {DICTS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </label>
        )}
        <div className="grid grid-cols-2 gap-3">
          <label className={label}>Start ID{num('startId', 0)}</label>
          {usesFamily && (
            <label className={label}>Border bits
              <select className={field} value={spec.borderBits ?? 2} onChange={(e) => set('borderBits', +e.target.value)}>
                <option value={1}>1</option>
                <option value={2}>2</option>
              </select>
            </label>
          )}
        </div>
        {spec.type === 'ChArUco' && spec.rows % 2 === 0 && (
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={!!spec.legacyLayout} onChange={(e) => set('legacyLayout', e.target.checked)} />
            Legacy layout (OpenCV 4.5 and older)
          </label>
        )}

        <div className="flex flex-col gap-2">
          <label className="cursor-pointer self-start rounded border border-ink bg-white px-4 py-2.5 text-sm font-medium">
            Take settings from opencv.json
            <input type="file" accept=".json,application/json" className="sr-only" data-testid="config-file"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) loadConfig(f); e.target.value = ''; }} />
          </label>
          {fileNote && <p className="m-0 text-[13px] leading-snug text-ink-muted" data-testid="config-note">{fileNote}</p>}
        </div>

        <div className="rounded bg-ground-panel px-4 py-3 text-sm">
          <p className="m-0 font-semibold">Looking for</p>
          <p className="m-0 mt-1 font-mono text-xs leading-relaxed" data-testid="looking-for">{patternSummary(spec)} · {featureCounts(spec)}</p>
        </div>

        {idsShort && capacity && (
          <div role="alert" className="rounded border border-brand bg-brand-tint px-4 py-3 text-sm text-brand-dark" data-testid="ids-short">
            This pattern uses IDs up to {capacity.lastId}, and its {usesFamily ? 'tag family' : 'dictionary'} has {capacity.count}. Check rows, columns and start ID.
          </div>
        )}

        {result && (
          <div data-testid="result" className={`rounded border px-4 py-3 text-sm ${result.found ? 'border-green-300 bg-green-50 text-green-800' : 'border-brand bg-brand-tint text-brand-dark'}`}>
            <p className="m-0 font-semibold">{result.message}</p>
            {result.missingIds.length > 0 && result.markersFound > 0 && <p className="m-0 mt-2 font-mono text-xs leading-relaxed">Not read: {formatIds(result.missingIds, 12)}</p>}
            {result.unexpectedIds.length > 0 && <p className="m-0 mt-2 font-mono text-xs leading-relaxed">Read but not on this pattern: {formatIds(result.unexpectedIds, 12)}</p>}
            <p className="m-0 mt-2 font-mono text-xs">{result.settings.dictionary}, border {result.settings.borderBits} · {result.timeMs} ms</p>
          </div>
        )}

        <p className="m-0 text-[13px] leading-relaxed text-ink-muted">Checkerboards and circle grids have no markers to read, so they are not checked here. <a className="text-brand-dark underline" href="/plumbline/">Plumbline</a>, our desktop app, detects both.</p>
      </form>

      <div className="flex min-w-0 flex-1 basis-[480px] flex-col gap-4">
        <div
          className="relative flex min-h-[400px] items-center justify-center rounded border-2 border-dashed border-line bg-ground-panel"
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          onDragOver={(e) => e.preventDefault()}
        >
          {!hasImage && (
            <div className="flex flex-col items-center gap-3 p-8 text-center">
              <p className="m-0 text-ink-muted">Drop a photo here, or</p>
              <label className="cursor-pointer rounded bg-brand px-5 py-3 text-sm font-semibold text-white">
                Choose photo
                <input type="file" accept="image/*" className="sr-only" data-testid="photo-file"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
              </label>
              <p className="m-0 text-xs text-ink-muted">JPEG or PNG. The photo stays in your browser.</p>
            </div>
          )}
          <canvas ref={canvasRef} data-testid="overlay" className={hasImage ? 'max-h-[640px] max-w-full' : 'hidden'} />
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80">
              <span className="text-sm font-semibold text-ink-muted">{status}</span>
            </div>
          )}
        </div>

        <p className="m-0 text-sm text-ink-muted" data-testid="status" aria-live="polite">{status}</p>

        {hasImage && (
          <div className="flex flex-wrap gap-3">
            <button type="button" className="rounded bg-ink px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50" disabled={loading || idsShort}
              onClick={() => imageRef.current && run(imageRef.current, spec)}>Check again</button>
            <button type="button" className="rounded border border-ink bg-white px-4 py-2.5 text-sm font-medium" onClick={clear}>Choose another photo</button>
          </div>
        )}
      </div>
    </section>
  );
}
