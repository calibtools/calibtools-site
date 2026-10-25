import { useState, useRef, useEffect } from 'react';
import { Star } from '@/lib/icons';

interface Props {
  token: string;
}

export default function ReviewForm({ token }: Props) {
  const [stars, setStars] = useState(0);
  const [hoverStars, setHoverStars] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [camera, setCamera] = useState('');
  const [lensOrFov, setLensOrFov] = useState('');
  const [software, setSoftware] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [companyType, setCompanyType] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [status, setStatus] = useState<'loading' | 'idle' | 'busy' | 'success' | 'error' | 'invalid'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [handle, setHandle] = useState('');
  const [productTitle, setProductTitle] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Validate token on mount
  useEffect(() => {
    if (!token) { setStatus('invalid'); setErrorMsg('No review token provided.'); return; }
    fetch(`/api/review?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          setHandle(data.handle);
          setProductTitle(data.productTitle);
          setStatus('idle');
        } else {
          setStatus('invalid');
          setErrorMsg(data.message || 'Invalid or expired invitation.');
        }
      })
      .catch(() => {
        setStatus('invalid');
        setErrorMsg('Could not validate invitation. Please try again.');
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (stars === 0) { setErrorMsg('Please select a star rating.'); return; }
    if (body.length < 40) { setErrorMsg('Review body must be at least 40 characters.'); return; }

    setStatus('busy');
    setErrorMsg('');

    const formData = new FormData();
    formData.append('token', token);
    formData.append('handle', handle);
    formData.append('stars', String(stars));
    formData.append('title', title);
    formData.append('body', body);
    formData.append('camera', camera);
    formData.append('lensOrFov', lensOrFov);
    formData.append('software', software);
    formData.append('displayName', displayName);
    formData.append('companyType', companyType);
    for (const photo of photos) {
      formData.append('photos', photo);
    }

    try {
      const res = await fetch('/api/review', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.ok) {
        setStatus('success');
      } else {
        setStatus('idle');
        setErrorMsg(data.message || 'Something went wrong.');
      }
    } catch {
      setStatus('idle');
      setErrorMsg('Network error. Please try again.');
    }
  };

  if (status === 'loading') {
    return <p className="py-12 text-center text-ink-muted">Validating invitation...</p>;
  }

  if (status === 'invalid') {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <h2 className="m-0 text-2xl font-bold">Invitation not valid</h2>
        <p className="m-0 text-ink-muted">{errorMsg}</p>
        <a href="/" className="text-brand-dark font-semibold">Back to home</a>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <h2 className="m-0 text-2xl font-bold">Thank you for your review</h2>
        <p className="m-0 text-ink-muted">Your review of {productTitle} has been published.</p>
        <a href={`/targets/${handle}/`} className="text-brand-dark font-semibold">Back to product</a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <h2 className="m-0 text-xl font-bold">Review: {productTitle}</h2>

      <fieldset className="flex flex-col gap-2 border-0 p-0">
        <legend className="text-[13px] font-semibold">Rating *</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setStars(n)}
              onMouseEnter={() => setHoverStars(n)}
              onMouseLeave={() => setHoverStars(0)}
              className="p-0.5"
              aria-label={`${n} star${n !== 1 ? 's' : ''}`}
            >
              <Star
                size={28}
                strokeWidth={0}
                fill={n <= (hoverStars || stars) ? '#E60012' : '#D4D4D4'}
                aria-hidden="true"
              />
            </button>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
        Title
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120}
          className="rounded border border-line bg-ground px-3 py-2.5 text-[15px] text-ink" placeholder="Summarize your experience" />
      </label>

      <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
        Review *
        <textarea value={body} onChange={(e) => setBody(e.target.value)} minLength={40} rows={4}
          className="rounded border border-line bg-ground px-3 py-2.5 text-[15px] text-ink" placeholder="How did you use this target? What worked well?" />
        <span className="text-xs font-normal text-ink-muted">{body.length}/40 minimum characters</span>
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
          Camera
          <input type="text" value={camera} onChange={(e) => setCamera(e.target.value)} maxLength={60}
            className="rounded border border-line bg-ground px-3 py-2.5 text-[15px] text-ink" placeholder="e.g. FLIR BFS-U3-51S5C" />
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
          Lens / FOV
          <input type="text" value={lensOrFov} onChange={(e) => setLensOrFov(e.target.value)} maxLength={60}
            className="rounded border border-line bg-ground px-3 py-2.5 text-[15px] text-ink" placeholder="e.g. 8 mm / 90&deg;" />
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
          Software
          <input type="text" value={software} onChange={(e) => setSoftware(e.target.value)} maxLength={60}
            className="rounded border border-line bg-ground px-3 py-2.5 text-[15px] text-ink" placeholder="e.g. OpenCV 4.9" />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
        Display name
        <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={40}
          className="rounded border border-line bg-ground px-3 py-2.5 text-[15px] text-ink" placeholder="Defaults to your initials" />
      </label>

      <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
        Company type (optional)
        <select value={companyType} onChange={(e) => setCompanyType(e.target.value)}
          className="h-10 rounded border border-line bg-ground px-2.5 text-[15px] text-ink">
          <option value="">Prefer not to say</option>
          <option value="Automotive OEM">Automotive OEM</option>
          <option value="Automotive Tier 1">Automotive Tier 1</option>
          <option value="Robotics">Robotics</option>
          <option value="University / research">University / research</option>
          <option value="System integrator">System integrator</option>
          <option value="Machine builder">Machine builder</option>
          <option value="Inspection / metrology">Inspection / metrology</option>
          <option value="Other">Other</option>
        </select>
      </label>

      <fieldset className="flex flex-col gap-2 border-0 p-0">
        <legend className="text-[13px] font-semibold">Photos (up to 3)</legend>
        <input ref={fileRef} type="file" accept="image/*" multiple
          onChange={(e) => setPhotos(Array.from(e.target.files ?? []).slice(0, 3))} className="text-sm" />
        {photos.length > 0 && (
          <span className="text-xs text-ink-muted">{photos.length} photo{photos.length !== 1 ? 's' : ''} selected</span>
        )}
      </fieldset>

      {errorMsg && <p className="m-0 text-sm text-brand">{errorMsg}</p>}

      <button type="submit" disabled={status === 'busy'}
        className="rounded bg-brand px-6 py-3 text-base font-semibold text-white disabled:opacity-50">
        {status === 'busy' ? 'Submitting\u2026' : 'Submit review'}
      </button>
    </form>
  );
}
