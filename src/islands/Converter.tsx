import { useState } from 'react';
import { ArrowLeftRight } from '@/lib/icons';
import { parse, serialize, detectFormat, FORMAT_LABELS, type Format, type CalibConfig } from '@/lib/convert';

const FORMATS: Format[] = ['opencv-json', 'kalibr-yaml', 'ros2-yaml', 'halcon-descr'];

const EXAMPLE = JSON.stringify({
  pattern: 'ChArUco',
  rows: 7,
  cols: 10,
  square_mm: 25,
  marker_mm: 18,
  dictionary: 'DICT_6X6_250',
  start_id: 0,
  generator: 'Calib.Tools',
}, null, 2);

export default function Converter() {
  const [input, setInput] = useState('');
  const [targetFmt, setTargetFmt] = useState<Format>('kalibr-yaml');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [detected, setDetected] = useState<Format | null>(null);
  const [parsed, setParsed] = useState<CalibConfig | null>(null);

  const doConvert = (text?: string, fmt?: Format) => {
    const src = text ?? input;
    const to = fmt ?? targetFmt;
    setError('');
    setOutput('');
    setParsed(null);
    setDetected(null);
    if (!src.trim()) return;

    try {
      const det = detectFormat(src);
      setDetected(det);
      const config = parse(src);
      setParsed(config);
      setOutput(serialize(config, to));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Parse error');
    }
  };

  const loadExample = () => {
    setInput(EXAMPLE);
    doConvert(EXAMPLE);
  };

  const download = () => {
    if (!output) return;
    const ext: Record<Format, string> = {
      'opencv-json': '.opencv.json',
      'kalibr-yaml': '.kalibr.yaml',
      'ros2-yaml': '.ros2.yaml',
      'halcon-descr': '.halcon.descr',
    };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([output], { type: 'text/plain' }));
    a.download = `calibration${ext[targetFmt]}`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const copy = async () => {
    if (output) await navigator.clipboard.writeText(output);
  };

  return (
    <section className="flex flex-wrap gap-8">
      {/* Input panel */}
      <div className="flex min-w-0 flex-1 basis-[400px] flex-col gap-4">
        <div className="card p-7">
          <h1 className="m-0 mb-1 flex items-center gap-3 text-[26px] font-extrabold tracking-[-0.02em]"><ArrowLeftRight size={24} strokeWidth={1.6} className="text-brand" aria-hidden="true" />Format converter</h1>
          <p className="m-0 mb-5 text-sm text-ink-muted">Paste a calibration config in any supported format and convert to another.</p>

          <div className="mb-3 flex items-center justify-between">
            <label htmlFor="input" className="text-[13px] font-semibold">Input</label>
            <button type="button" className="text-xs text-brand underline" onClick={loadExample}>Load example</button>
          </div>
          <textarea
            id="input"
            className="w-full rounded border border-[#CFCFCF] bg-white p-3 font-mono text-[13px] leading-relaxed"
            rows={14}
            placeholder="Paste OpenCV JSON, Kalibr YAML, ROS 2 YAML, or HALCON .descr here..."
            value={input}
            onChange={(e) => { setInput(e.target.value); doConvert(e.target.value); }}
          />
          {detected && (
            <p className="m-0 mt-2 text-xs text-ink-muted">Detected: <strong>{FORMAT_LABELS[detected]}</strong></p>
          )}
          {error && (
            <p className="m-0 mt-2 text-sm text-brand">{error}</p>
          )}
        </div>

        {parsed && (
          <div className="card p-5">
            <h3 className="m-0 mb-3 text-sm font-semibold">Parsed values</h3>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <Pill label="Type" value={parsed.type} />
              <Pill label="Rows" value={String(parsed.rows)} />
              <Pill label="Cols" value={String(parsed.cols)} />
              <Pill label="Square" value={`${parsed.square} mm`} />
              <Pill label="Marker" value={`${parsed.marker} mm`} />
              <Pill label="Dict" value={parsed.dict} />
            </div>
          </div>
        )}
      </div>

      {/* Output panel */}
      <div className="flex min-w-0 flex-1 basis-[400px] flex-col gap-4">
        <div className="card p-7">
          <label htmlFor="target-fmt" className="mb-3 block text-[13px] font-semibold">Convert to</label>
          <div className="mb-4 grid grid-cols-2 gap-2">
            {FORMATS.map((f) => (
              <button
                key={f}
                type="button"
                className={`rounded border px-3 py-2.5 text-sm font-medium transition-colors ${
                  targetFmt === f
                    ? 'border-brand bg-brand-tint text-brand-dark'
                    : 'border-[#CFCFCF] bg-white text-ink hover:border-brand'
                }`}
                onClick={() => { setTargetFmt(f); doConvert(undefined, f); }}
              >
                {FORMAT_LABELS[f]}
              </button>
            ))}
          </div>

          <label htmlFor="output" className="mb-2 block text-[13px] font-semibold">Output</label>
          <textarea
            id="output"
            className="w-full rounded border border-[#CFCFCF] bg-ground-panel p-3 font-mono text-[13px] leading-relaxed"
            rows={14}
            readOnly
            value={output}
            placeholder="Converted output will appear here..."
          />

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="rounded bg-brand px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              disabled={!output}
              onClick={download}
            >
              Download
            </button>
            <button
              type="button"
              className="rounded border border-ink bg-white px-4 py-2.5 text-sm font-medium disabled:opacity-50"
              disabled={!output}
              onClick={copy}
            >
              Copy
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-ground-panel px-2 py-1.5">
      <span className="text-ink-muted">{label}: </span>
      <span className="font-mono font-semibold">{value}</span>
    </div>
  );
}
