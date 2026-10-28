import { useState } from 'react';
import { Download } from '@/lib/icons';

interface DownloadFile {
  name: string;
  /** URL or data: URI */
  url: string;
  mime: string;
}

interface Props {
  files: DownloadFile[];
}

export default function DownloadPicker({ files }: Props) {
  const [checked, setChecked] = useState<Record<string, boolean>>(
    () => Object.fromEntries(files.map((f) => [f.name, true])),
  );
  const [busy, setBusy] = useState(false);

  const toggle = (name: string) => {
    setChecked((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const selectedFiles = files.filter((f) => checked[f.name]);

  const handleDownloadAll = async () => {
    if (selectedFiles.length === 0) return;
    setBusy(true);
    try {
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();

      await Promise.all(
        selectedFiles.map(async (f) => {
          if (f.url.startsWith('data:')) {
            // Data URI — decode content
            const content = decodeURIComponent(f.url.split(',')[1] ?? '');
            zip.file(f.name, content);
          } else {
            // Remote URL — fetch
            const res = await fetch(f.url);
            const blob = await res.blob();
            zip.file(f.name, blob);
          }
        }),
      );

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'calib-tools-downloads.zip';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: download individually
      for (const f of selectedFiles) {
        const a = document.createElement('a');
        a.href = f.url;
        a.download = f.name;
        a.click();
      }
    } finally {
      setBusy(false);
    }
  };

  if (files.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {files.map((f) => (
          <label key={f.name} className="flex items-center gap-2.5 text-[14px] cursor-pointer">
            <input
              type="checkbox"
              className="h-[18px] w-[18px] accent-brand"
              checked={checked[f.name] ?? false}
              onChange={() => toggle(f.name)}
            />
            <span className="font-mono text-[13px]">{f.name}</span>
          </label>
        ))}
      </div>
      {files.length > 1 && (
        <button
          type="button"
          onClick={handleDownloadAll}
          disabled={busy || selectedFiles.length === 0}
          className="btn-md btn-secondary gap-2 self-start"
        >
          <Download size={16} strokeWidth={1.6} aria-hidden="true" />
          {busy ? 'Zipping…' : `Download all (.zip)`}
        </button>
      )}
    </div>
  );
}
