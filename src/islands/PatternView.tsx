/**
 * Read-only view of one pattern: the drawing and its parameters, from the same link the
 * generator uses. Reached from saved patterns and quotations; "Edit in the generator" hands the
 * same parameters over. Runs in the browser; nothing is uploaded.
 */
import { useEffect, useState } from 'react';
import type { PatternSpec } from '@/lib/patterns';
import { renderPatternSvg } from '@/lib/patterns';
import { GENERATOR_DEFAULT, GENERATOR_PATH, specFromParams, patternId } from '@/lib/patternLink';
import { patternFacts, patternFieldSize } from '@/lib/patternFacts';
import { patternShapes, shapeBox } from '@/lib/patternShapes';

type State = { kind: 'loading' } | { kind: 'none' } | { kind: 'ready'; spec: PatternSpec; query: string };

export default function PatternView() {
  const [state, setState] = useState<State>({ kind: 'loading' });
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = specFromParams(params);
    if (Object.keys(fromUrl).length === 0) return setState({ kind: 'none' });
    setState({ kind: 'ready', spec: { ...GENERATOR_DEFAULT, ...fromUrl }, query: params.toString() });
  }, []);

  if (state.kind === 'loading') return <p className="m-0 text-ink-muted">Loading the pattern…</p>;
  if (state.kind === 'none') {
    return (
      <p className="m-0 text-ink-muted">This link carries no pattern. <a href={GENERATOR_PATH}>Open the generator</a> to make one.</p>
    );
  }

  const { spec, query } = state;
  const id = patternId(spec);
  const facts = patternFacts(spec);
  const { w, h } = patternFieldSize(spec);
  // Ink box of the pattern, with a quiet margin of 4 % around it.
  const boxes = patternShapes({ ...spec, scaleBar: false }).filter((s) => s.kind !== 'text').map(shapeBox);
  const x0 = Math.min(...boxes.map((b) => b.x0)), y0 = Math.min(...boxes.map((b) => b.y0));
  const pad = Math.max(w, h) * 0.04;
  const generatorHref = `${GENERATOR_PATH}?${query}`;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="m-0 font-mono text-[12px] uppercase tracking-[0.04em] text-ink-soft">Pattern ID</p>
        <p className="m-0 font-mono text-[24px] font-medium md:text-[28px]" data-testid="pattern-view-id">{id}</p>
        <p className="m-0 text-ink-muted">Same parameters, same ID. Quote it when you talk to a colleague or to us.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:items-start">
        <div className="border border-line bg-white p-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox={`${x0 - pad} ${y0 - pad} ${w + 2 * pad} ${h + 2 * pad}`}
            className="block h-auto w-full"
            role="img"
            aria-label={`${spec.type} pattern ${id}`}
            data-testid="pattern-view-drawing"
            dangerouslySetInnerHTML={{ __html: renderPatternSvg({ ...spec, scaleBar: false }, 0, 0) }}
          />
        </div>

        <div className="flex flex-col gap-6">
          <table className="w-full border-collapse border border-line" data-testid="pattern-view-facts">
            <tbody>
              {facts.map(([k, v]) => (
                <tr key={k}>
                  <th scope="row" className="w-[46%] border-t border-line bg-brand-tint px-4 py-2 text-left align-middle font-mono text-[12px] font-medium uppercase tracking-[0.04em] text-brand-dark">{k}</th>
                  <td className="border-t border-line px-4 py-2 align-middle font-mono text-[14px]">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex flex-wrap gap-3">
            <a href={generatorHref} className="btn-md btn-primary" data-testid="pattern-view-edit">Edit in the generator</a>
            <a href={`/quote/?pattern=${encodeURIComponent(generatorHref)}`} className="btn-md btn-secondary">Request a quote</a>
          </div>
          <p className="m-0 text-[14px] text-ink-muted">Downloads (PDF, SVG, DXF and the configuration files) are in the generator, with the paper size of your choice.</p>
        </div>
      </div>
    </div>
  );
}
