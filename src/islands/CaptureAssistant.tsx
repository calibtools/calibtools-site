import { useRef, useState, useCallback, useEffect } from 'react';
import { Check, ArrowRight, Camera, X } from '@/lib/icons';

/**
 * Guided calibration image capture.
 * Uses WebRTC to access the camera and guides the user through 15 poses
 * that provide good coverage for calibration.
 */

interface CapturedImage {
  id: number;
  dataUrl: string;
  pose: string;
  timestamp: number;
}

const GUIDED_POSES = [
  { id: 1,  label: 'Center',           instruction: 'Hold the target flat, centered in frame' },
  { id: 2,  label: 'Center close',     instruction: 'Move closer — target fills ~80% of frame' },
  { id: 3,  label: 'Center far',       instruction: 'Move further away — target fills ~30% of frame' },
  { id: 4,  label: 'Top-left',         instruction: 'Move the target to the top-left corner' },
  { id: 5,  label: 'Top-right',        instruction: 'Move the target to the top-right corner' },
  { id: 6,  label: 'Bottom-left',      instruction: 'Move the target to the bottom-left corner' },
  { id: 7,  label: 'Bottom-right',     instruction: 'Move the target to the bottom-right corner' },
  { id: 8,  label: 'Tilt left',        instruction: 'Tilt the target ~30° to the left' },
  { id: 9,  label: 'Tilt right',       instruction: 'Tilt the target ~30° to the right' },
  { id: 10, label: 'Tilt forward',     instruction: 'Tilt the top of the target toward the camera' },
  { id: 11, label: 'Tilt back',        instruction: 'Tilt the top of the target away from the camera' },
  { id: 12, label: 'Top-left tilted',  instruction: 'Top-left corner, tilted ~20°' },
  { id: 13, label: 'Top-right tilted', instruction: 'Top-right corner, tilted ~20°' },
  { id: 14, label: 'Bottom tilted',    instruction: 'Bottom of frame, tilted toward camera' },
  { id: 15, label: 'Center angled',    instruction: 'Center, rotated ~45° in-plane' },
];

export default function CaptureAssistant() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [currentPose, setCurrentPose] = useState(0);
  const [captures, setCaptures] = useState<CapturedImage[]>([]);
  const [fps, setFps] = useState(0);
  const frameCountRef = useRef(0);
  const lastFpsTime = useRef(0);

  // FPS counter
  useEffect(() => {
    if (!cameraActive) return;
    let animId: number;
    const tick = () => {
      frameCountRef.current++;
      const now = performance.now();
      if (now - lastFpsTime.current >= 1000) {
        setFps(frameCountRef.current);
        frameCountRef.current = 0;
        lastFpsTime.current = now;
      }
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [cameraActive]);

  const startCamera = async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err) {
      setCameraError(err instanceof Error ? err.message : 'Camera access denied');
    }
  };

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/png');

    const pose = GUIDED_POSES[currentPose];
    const img: CapturedImage = {
      id: captures.length + 1,
      dataUrl,
      pose: pose?.label ?? `Extra ${captures.length + 1}`,
      timestamp: Date.now(),
    };
    setCaptures((prev) => [...prev, img]);
    if (currentPose < GUIDED_POSES.length - 1) {
      setCurrentPose(currentPose + 1);
    }
  };

  const removeCapture = (id: number) => {
    setCaptures((prev) => prev.filter((c) => c.id !== id));
  };

  const downloadAll = () => {
    captures.forEach((img) => {
      const a = document.createElement('a');
      a.href = img.dataUrl;
      a.download = `calib-${String(img.id).padStart(2, '0')}-${img.pose.toLowerCase().replace(/\s+/g, '-')}.png`;
      a.click();
    });
  };

  const pose = GUIDED_POSES[currentPose];
  const progress = captures.length / GUIDED_POSES.length;

  return (
    <section className="flex flex-wrap gap-8">
      {/* Camera + controls */}
      <div className="flex min-w-0 flex-1 basis-[520px] flex-col gap-4">
        <div className="card p-7">
          <h1 className="m-0 mb-1 flex items-center gap-3 text-[26px] font-extrabold tracking-[-0.02em]"><Camera size={24} strokeWidth={1.6} className="text-brand" aria-hidden="true" />Capture assistant</h1>
          <p className="m-0 mb-5 text-sm text-ink-muted">Guided calibration image capture. 15 poses for good coverage. Nothing is uploaded.</p>

          {/* Video area */}
          <div className="relative overflow-hidden rounded-lg bg-black">
            <video
              ref={videoRef}
              className="w-full"
              playsInline
              muted
              style={{ display: cameraActive ? 'block' : 'none', transform: 'scaleX(-1)' }}
            />
            <canvas ref={canvasRef} className="hidden" />

            {!cameraActive && (
              <div className="flex flex-col items-center gap-4 px-8 py-16 text-center">
                <p className="m-0 text-white/70">Camera preview will appear here</p>
                <button
                  type="button"
                  className="rounded bg-brand px-6 py-3 text-sm font-semibold text-white"
                  onClick={startCamera}
                >
                  Start camera
                </button>
                {cameraError && (
                  <p className="m-0 text-sm text-red-400">{cameraError}</p>
                )}
              </div>
            )}

            {/* Pose overlay */}
            {cameraActive && pose && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                <p className="m-0 text-lg font-bold text-white">
                  {pose.id}/{GUIDED_POSES.length}: {pose.label}
                </p>
                <p className="m-0 text-sm text-white/80">{pose.instruction}</p>
              </div>
            )}

            {/* FPS */}
            {cameraActive && (
              <div className="absolute right-3 top-3 rounded bg-black/50 px-2 py-1 font-mono text-xs text-white">
                {fps} fps
              </div>
            )}
          </div>

          {/* Controls */}
          {cameraActive && (
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                className="rounded bg-brand px-6 py-3 text-sm font-semibold text-white"
                onClick={capture}
              >
                Capture ({captures.length}/{GUIDED_POSES.length})
              </button>
              <button
                type="button"
                className="rounded border border-ink bg-white px-4 py-3 text-sm font-medium"
                onClick={stopCamera}
              >
                Stop camera
              </button>
              {captures.length > 0 && (
                <button
                  type="button"
                  className="rounded border border-ink bg-white px-4 py-3 text-sm font-medium"
                  onClick={downloadAll}
                >
                  Download all ({captures.length})
                </button>
              )}
            </div>
          )}

          {/* Progress bar */}
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-ground-panel">
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Captured images */}
      <div className="flex basis-[300px] flex-col gap-4">
        <div className="card p-5">
          <h2 className="m-0 mb-4 text-base font-bold">Captured images</h2>
          {captures.length === 0 ? (
            <p className="m-0 text-sm text-ink-muted">No images captured yet. Start the camera and follow the guided poses.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {captures.map((img) => (
                <div key={img.id} className="flex items-center gap-3 rounded bg-ground-panel p-2">
                  <img src={img.dataUrl} alt={img.pose} className="h-12 w-16 rounded object-cover" />
                  <div className="flex-1">
                    <p className="m-0 text-xs font-semibold">{img.pose}</p>
                    <p className="m-0 text-xs text-ink-muted">#{img.id}</p>
                  </div>
                  <button
                    type="button"
                    className="text-xs text-ink-muted hover:text-brand"
                    onClick={() => removeCapture(img.id)}
                    title="Remove"
                  >
                    <X size={14} strokeWidth={1.6} aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pose checklist */}
        <div className="card p-5">
          <h2 className="m-0 mb-3 text-base font-bold">Pose checklist</h2>
          <div className="flex flex-col gap-1 text-xs">
            {GUIDED_POSES.map((p, i) => {
              const captured = captures.some((c) => c.pose === p.label);
              return (
                <div key={p.id} className={`flex items-center gap-2 ${i === currentPose ? 'font-bold text-brand' : captured ? 'text-green-700' : 'text-ink-muted'}`}>
                  <span className="flex w-4 items-center justify-center">{captured ? <Check size={16} strokeWidth={1.6} className="text-brand" aria-hidden="true" /> : i === currentPose ? <ArrowRight size={16} strokeWidth={1.6} className="text-brand" aria-hidden="true" /> : '·'}</span>
                  <span>{p.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
