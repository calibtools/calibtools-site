import { useState } from 'react';
import { ListChecks } from '@/lib/icons';
import {
  recommend, MATERIALS,
  type WizardAnswers, type Application, type AccuracyNeed,
  type CameraType, type Environment, type ToolChain, type Recommendation,
} from '@/lib/wizard';

const STEPS = ['Application', 'Accuracy', 'Camera', 'Environment', 'Toolchain', 'Result'] as const;

const APPLICATIONS: { value: Application; label: string; desc: string }[] = [
  { value: 'robotics', label: 'Robotics', desc: 'Robot arm, mobile robot, manipulation' },
  { value: 'industrial', label: 'Industrial inspection', desc: 'Quality control, measurement, AOI' },
  { value: 'automotive', label: 'Automotive / ADAS', desc: 'Surround view, lane detection' },
  { value: 'drone', label: 'Drone / aerial', desc: 'Mapping, photogrammetry, surveying' },
  { value: 'medical', label: 'Medical imaging', desc: 'Endoscopy, microscopy, surgical' },
  { value: 'research', label: 'Research / academic', desc: 'Computer vision research, papers' },
  { value: 'other', label: 'Other', desc: 'General purpose calibration' },
];

const ACCURACIES: { value: AccuracyNeed; label: string; desc: string }[] = [
  { value: 'high', label: 'High (< 0.1 px)', desc: 'Metrology, precision measurement, medical' },
  { value: 'medium', label: 'Medium (< 0.5 px)', desc: 'Most industrial and robotics applications' },
  { value: 'low', label: 'Low (< 1 px)', desc: 'Quick tests, prototyping, hobby projects' },
];

const CAMERAS: { value: CameraType; label: string; desc: string }[] = [
  { value: 'mono', label: 'Monocular', desc: 'Single camera' },
  { value: 'stereo', label: 'Stereo', desc: 'Two cameras, fixed baseline' },
  { value: 'fisheye', label: 'Fisheye / wide-angle', desc: 'FOV > 120°' },
  { value: 'multi', label: 'Multi-camera', desc: '3+ cameras, surround view' },
];

const ENVIRONMENTS: { value: Environment; label: string; desc: string }[] = [
  { value: 'indoor', label: 'Indoor', desc: 'Lab, factory, controlled lighting' },
  { value: 'outdoor', label: 'Outdoor', desc: 'Sun, rain, variable lighting' },
  { value: 'both', label: 'Both', desc: 'Mixed indoor/outdoor use' },
];

const TOOLCHAINS: { value: ToolChain; label: string; desc: string }[] = [
  { value: 'opencv', label: 'OpenCV', desc: 'cv2.calibrateCamera, cv2.aruco' },
  { value: 'ros', label: 'ROS / ROS 2', desc: 'camera_calibration package' },
  { value: 'kalibr', label: 'Kalibr', desc: 'ETH ASL multi-camera calibration' },
  { value: 'halcon', label: 'HALCON', desc: 'MVTec HALCON calibrate_cameras' },
  { value: 'matlab', label: 'MATLAB', desc: 'Camera Calibrator app' },
  { value: 'other', label: 'Other / not sure', desc: 'Will figure it out later' },
];

export default function Wizard() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<WizardAnswers>>({});
  const [result, setResult] = useState<Recommendation | null>(null);

  const set = <K extends keyof WizardAnswers>(key: K, value: WizardAnswers[K]) => {
    const next = { ...answers, [key]: value };
    setAnswers(next);
    if (step < STEPS.length - 2) {
      setStep(step + 1);
    } else {
      const rec = recommend(next as WizardAnswers);
      setResult(rec);
      setStep(STEPS.length - 1);
    }
  };

  const back = () => {
    if (step > 0) { setStep(step - 1); setResult(null); }
  };

  const restart = () => { setStep(0); setAnswers({}); setResult(null); };

  return (
    <section className="mx-auto max-w-[640px]">
      <div className="card p-7">
        <h1 className="m-0 mb-1 flex items-center gap-3 text-[26px] font-extrabold tracking-[-0.02em]"><ListChecks size={24} strokeWidth={1.6} className="text-brand" aria-hidden="true" />Selection wizard</h1>
        <p className="m-0 mb-6 text-sm text-ink-muted">Answer a few questions and get a calibration pattern recommendation.</p>

        {/* Progress bar */}
        <div className="mb-6 flex gap-1">
          {STEPS.map((s, i) => (
            <div key={s} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-brand' : 'bg-ground-panel'}`} />
          ))}
        </div>

        {step === 0 && (
          <StepCard title="What's your application?" options={APPLICATIONS} onSelect={(v) => set('application', v)} />
        )}
        {step === 1 && (
          <StepCard title="What accuracy do you need?" options={ACCURACIES} onSelect={(v) => set('accuracy', v)} />
        )}
        {step === 2 && (
          <StepCard title="What type of camera?" options={CAMERAS} onSelect={(v) => set('camera', v)} />
        )}
        {step === 3 && (
          <StepCard title="Where will you calibrate?" options={ENVIRONMENTS} onSelect={(v) => set('environment', v)} />
        )}
        {step === 4 && (
          <StepCard title="What calibration toolchain?" options={TOOLCHAINS} onSelect={(v) => set('toolchain', v)} />
        )}
        {step === STEPS.length - 1 && result && (
          <ResultView result={result} onRestart={restart} />
        )}

        {step > 0 && step < STEPS.length - 1 && (
          <button type="button" className="mt-4 text-sm text-ink-muted underline" onClick={back}>Back</button>
        )}
      </div>
    </section>
  );
}

function StepCard<T extends string>({ title, options, onSelect }: {
  title: string;
  options: { value: T; label: string; desc: string }[];
  onSelect: (v: T) => void;
}) {
  return (
    <div>
      <h2 className="m-0 mb-4 text-lg font-bold">{title}</h2>
      <div className="flex flex-col gap-2.5">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            className="cursor-pointer rounded-lg border border-[#CFCFCF] bg-white px-5 py-4 text-left transition-colors hover:border-brand hover:bg-brand-tint"
            onClick={() => onSelect(o.value)}
          >
            <span className="font-semibold">{o.label}</span>
            <span className="ml-2 text-sm text-ink-muted">{o.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ResultView({ result, onRestart }: { result: Recommendation; onRestart: () => void }) {
  const mat = MATERIALS[result.material];
  const genUrl = `/tools/generator/?type=${encodeURIComponent(result.pattern)}&rows=${result.rows}&cols=${result.cols}&square=${result.square}&marker=${result.marker}&dict=${result.dict}&paper=${result.paper}`;

  return (
    <div>
      <h2 className="m-0 mb-5 text-lg font-bold">Recommended setup</h2>

      <div className="mb-5 grid grid-cols-2 gap-3">
        <InfoCard label="Pattern" value={result.pattern} />
        <InfoCard label="Size" value={`${result.rows} × ${result.cols}`} />
        <InfoCard label="Square" value={`${result.square} mm`} />
        <InfoCard label="Marker" value={`${result.marker} mm`} />
        <InfoCard label="Page" value={result.paper} />
        <InfoCard label="Material" value={mat.label} />
      </div>

      <div className="mb-5 rounded-lg bg-ground-panel p-4">
        <h3 className="m-0 mb-2 text-sm font-semibold">Why this setup?</h3>
        <ul className="m-0 list-inside list-disc pl-0 text-sm text-ink-muted">
          {result.reasoning.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      </div>

      <div className="flex flex-wrap gap-3">
        <a
          href={genUrl}
          className="rounded bg-brand px-5 py-3 text-sm font-semibold text-white no-underline hover:text-white"
        >
          Generate this pattern
        </a>
        <button type="button" className="rounded border border-ink px-5 py-3 text-sm font-medium" onClick={onRestart}>
          Start over
        </button>
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-ground-panel p-3">
      <span className="text-xs font-medium text-ink-muted">{label}</span>
      <span className="font-mono text-sm font-bold">{value}</span>
    </div>
  );
}
