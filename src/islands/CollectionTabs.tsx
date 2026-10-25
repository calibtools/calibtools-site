import { useState, useEffect } from 'react';
import { Plus, ArrowRight, User } from '@/lib/icons';

interface Props {
  collectionHandle: string;
  specsTable: Array<{ label: string; value: string }>;
  founderQuote?: string;
}

const TAB_KEYS = ['Overview', 'Specifications', 'Files', 'Cleaning & care', 'FAQ'] as const;
type TabKey = (typeof TAB_KEYS)[number];

export default function CollectionTabs({ collectionHandle, specsTable, founderQuote }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('Overview');
  const [sections, setSections] = useState<Record<string, string>>({});
  const [isMobile, setIsMobile] = useState(false);

  // Parse sections from the rendered markdown in the DOM
  useEffect(() => {
    // Find the hidden content source rendered by Astro
    const source = document.getElementById(`collection-content-${collectionHandle}`);
    if (!source) return;

    const html = source.innerHTML;
    const parsed: Record<string, string> = {};
    const parts = html.split(/<h2[^>]*>([\s\S]*?)<\/h2>/i);

    for (let i = 1; i < parts.length; i += 2) {
      const heading = parts[i].replace(/<[^>]+>/g, '').trim();
      const content = parts[i + 1]?.trim() ?? '';
      if (heading) parsed[heading] = content;
    }
    setSections(parsed);
  }, [collectionHandle]);

  // Responsive detection
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const renderSpecsExtra = () => (
    <div className="flex flex-col gap-6 mt-4">
      {/* General specifications table */}
      {specsTable.length > 0 && (
        <div>
          <h3 className="m-0 pb-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-soft">
            General specifications
          </h3>
          <table className="w-full border-collapse text-[15px]">
            <tbody>
              {specsTable.map((row, i) => (
                <tr key={row.label} className={`border-t border-line last:border-b ${i % 2 === 1 ? 'bg-ground-alt' : ''}`}>
                  <td className="w-2/5 py-3 text-ink-soft">{row.label}</td>
                  <td className="spec py-3">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Founder contact card */}
      <div className="card flex flex-col sm:flex-row gap-4 p-5 bg-ground-alt">
        <div className="w-16 h-16 rounded-full bg-ground-panel flex items-center justify-center shrink-0 border border-line">
          <User size={28} strokeWidth={1.5} className="text-ink-soft" aria-hidden="true" />
        </div>
        <div className="flex flex-col gap-1.5">
          <strong className="text-[15px]">Jun Gao</strong>
          <span className="text-sm text-ink-muted">Founder, Calib.Tools</span>
          {founderQuote && (
            <p className="m-0 text-sm text-ink-muted italic leading-relaxed">&ldquo;{founderQuote}&rdquo;</p>
          )}
          <a href="/quote/" className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:text-brand-dark">
            Get a quote <ArrowRight size={14} strokeWidth={1.6} aria-hidden="true" className="inline" />
          </a>
        </div>
      </div>
    </div>
  );

  // Mobile: accordion
  if (isMobile) {
    return (
      <div className="container-x border-y border-line divide-y divide-line">
        {TAB_KEYS.map((tab) => {
          const content = sections[tab];
          if (!content && tab !== 'Specifications') return null;
          return (
            <details key={tab} className="group" data-tab={tab}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[15px] font-semibold [&::-webkit-details-marker]:hidden">
                {tab}
                <Plus size={18} strokeWidth={1.6} className="shrink-0 text-ink-soft transition-transform group-open:rotate-45" aria-hidden="true" />
              </summary>
              <div className="pb-4">
                {content && (
                  <div className="prose-calib text-[15px] leading-relaxed text-ink-muted" dangerouslySetInnerHTML={{ __html: content }} />
                )}
                {tab === 'Specifications' && renderSpecsExtra()}
              </div>
            </details>
          );
        })}
      </div>
    );
  }

  // Desktop: sticky tab bar
  return (
    <div className="border-y border-line">
      {/* Sticky tab bar */}
      <div className="sticky top-0 z-10 bg-ground border-b border-line">
        <div className="container-x flex gap-0 overflow-x-auto scrollbar-none">
          {TAB_KEYS.map((tab) => {
            const hasContent = !!sections[tab] || tab === 'Specifications';
            if (!hasContent) return null;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`shrink-0 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-brand text-brand'
                    : 'border-transparent text-ink-muted hover:text-ink'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="container-x py-8">
        {sections[activeTab] && (
          <div className="prose-calib max-w-[720px] text-[15px] leading-relaxed text-ink-muted" dangerouslySetInnerHTML={{ __html: sections[activeTab] }} />
        )}
        {activeTab === 'Specifications' && renderSpecsExtra()}
      </div>
    </div>
  );
}
