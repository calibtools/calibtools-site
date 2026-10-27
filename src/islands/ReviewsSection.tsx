import { useState } from 'react';
import { Star, Flag, ThumbsUp, ArrowDown } from '@/lib/icons';
import Stars from '@/components/Stars';
import {
  summarize, sortReviews,
  HOW_REVIEWS_WORK,
  type Review, type ReviewSummary,
} from '@/lib/reviews';
import { MATERIAL_CONNECTION_LABEL } from '@/lib/claims';

interface Props {
  reviews: Review[];
  handle: string;
}

type SortMode = 'relevant' | 'newest' | 'highest' | 'lowest';

export default function ReviewsSection({ reviews, handle }: Props) {
  const [sortMode, setSortMode] = useState<SortMode>('relevant');
  const [filterStars, setFilterStars] = useState<number | null>(null);

  const published = reviews.filter((r) => r.status === 'published');
  const removed = reviews.filter((r) => r.status.startsWith('removed:'));
  const summary = summarize(published);

  const filtered = filterStars
    ? published.filter((r) => r.stars === filterStars)
    : published;
  const sorted = sortReviews(filtered, sortMode);

  const handleFilterClick = (stars: number) => {
    setFilterStars((prev) => (prev === stars ? null : stars));
  };

  return (
    <section id="reviews" className="container-x flex flex-col gap-6 pb-16">
      {/* Header */}
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h2 className="h-display m-0 text-2xl">Reviews from the bench</h2>
        <span className="text-sm text-ink-muted">
          Bought this product? Use the link in your delivery e-mail to review it.
        </span>
      </div>

      {/* How reviews work box */}
      <p className="m-0 rounded border border-line bg-ground-alt px-3 py-2.5 text-[13px] leading-relaxed text-ink-muted">
        <strong className="text-ink">How reviews work:</strong> {HOW_REVIEWS_WORK}{' '}
        <a href="/reviews-policy/" className="text-brand-dark hover:text-brand">Full policy</a>
      </p>

      {/* Two-column layout */}
      <div className="flex flex-wrap gap-8">
        {/* Left: summary */}
        <div className="flex w-full flex-col gap-2.5 md:w-[300px] md:shrink-0">
          <div className="flex items-baseline gap-2.5">
            <span className="font-mono text-[40px] font-medium leading-none">
              {summary.count > 0 ? summary.average.toFixed(1) : '\u2014'}
            </span>
            <Stars rating={Math.round(summary.average)} size={18} />
          </div>
          <p className="m-0 text-sm text-ink-muted">
            {summary.count === 0
              ? 'No ratings yet'
              : summary.importedCount > 0
                ? `${summary.count} review${summary.count !== 1 ? 's' : ''} \u00B7 ${summary.orderCount} from orders \u00B7 ${summary.importedCount} shared with permission`
                : `${summary.count} review${summary.count !== 1 ? 's' : ''}`}
          </p>

          {/* Distribution bars — only when count >= 6 */}
          {summary.count >= 6 && (
            <div className="flex flex-col">
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = summary.distribution[stars - 1];
                const pct = summary.count > 0 ? (count / summary.count) * 100 : 0;
                const active = filterStars === stars;
                return (
                  <button
                    key={stars}
                    type="button"
                    onClick={() => handleFilterClick(stars)}
                    className={`grid grid-cols-[44px_1fr_32px] items-center gap-2.5 py-0.5 text-[13px] ${
                      active ? 'font-semibold text-ink' : 'text-ink-muted'
                    }`}
                  >
                    <span className="font-mono">{stars} <Star size={11} strokeWidth={0} fill="currentColor" aria-hidden="true" className="inline" /></span>
                    <span className="h-2 overflow-hidden rounded-full bg-ground-panel">
                      <span
                        className="block h-full rounded-full bg-brand"
                        style={{ width: `${pct}%` }}
                      />
                    </span>
                    <span className="font-mono text-right">{count}</span>
                  </button>
                );
              })}
              <p className="m-0 pt-1 text-xs text-ink-muted">
                {filterStars
                  ? `Showing ${filterStars}-star reviews. `
                  : 'Click a row to filter. '}
                {filterStars && (
                  <button type="button" onClick={() => setFilterStars(null)} className="text-brand-dark">
                    Clear filter
                  </button>
                )}
              </p>
            </div>
          )}

          {summary.count < 6 && summary.count > 0 && (
            <p className="m-0 text-xs text-ink-muted">
              Distribution appears from 6 reviews.
            </p>
          )}
        </div>

        {/* Right: list */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {/* Sort bar */}
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-ink-muted">
              {filtered.length} review{filtered.length !== 1 ? 's' : ''}
            </span>
            <label className="flex items-center gap-2 text-sm text-ink-muted">
              Sort
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                className="h-9 rounded border border-line bg-ground px-2.5 text-sm text-ink"
              >
                <option value="relevant">Most relevant</option>
                <option value="newest">Newest</option>
                <option value="highest">Highest rating</option>
                <option value="lowest">Lowest rating</option>
              </select>
            </label>
          </div>

          {/* Empty state */}
          {published.length === 0 && (
            <div className="rounded border border-line bg-ground-alt p-6 text-center">
              <h3 className="m-0 text-[17px] font-semibold">No reviews yet</h3>
              <p className="m-0 pt-2 text-[15px] leading-relaxed text-ink-muted">
                Reviews arrive by invitation about two weeks after delivery.
                Until then, the inspection report of every unit is public at{' '}
                <a href="/verify/" className="text-brand-dark hover:text-brand">
                  calib.tools/verify/&lt;SN&gt;
                </a>.
              </p>
            </div>
          )}

          {/* Review cards */}
          {sorted.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}

          {/* Removed reviews */}
          {removed.map((review) => {
            const reason = review.status.replace('removed:', '');
            return (
              <div
                key={review.id}
                className="rounded border border-line bg-ground-alt px-4 py-3 text-sm text-ink-muted"
              >
                Removed: {reason}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <article className="flex flex-col gap-2.5 rounded border border-line bg-ground-alt p-5">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <Stars rating={review.stars} />
        <span className="font-mono text-xs text-ink-muted">
          {new Date(review.created).toLocaleDateString('en-GB', {
            year: 'numeric', month: 'short', day: 'numeric',
          })}
        </span>
      </div>

      {review.title && (
        <h4 className="m-0 text-[16px] font-semibold">{review.title}</h4>
      )}

      <p className="m-0 text-[15px] leading-relaxed text-ink-muted">{review.body}</p>

      {/* Application tags */}
      {(review.tags.camera || review.tags.lensOrFov || review.tags.software) && (
        <div className="flex flex-wrap gap-1.5">
          {review.tags.camera && (
            <span className="rounded border border-line bg-ground px-2 py-0.5 font-mono text-[11px] text-ink-muted">
              {review.tags.camera}
            </span>
          )}
          {review.tags.lensOrFov && (
            <span className="rounded border border-line bg-ground px-2 py-0.5 font-mono text-[11px] text-ink-muted">
              {review.tags.lensOrFov}
            </span>
          )}
          {review.tags.software && (
            <span className="rounded border border-line bg-ground px-2 py-0.5 font-mono text-[11px] text-ink-muted">
              {review.tags.software}
            </span>
          )}
        </div>
      )}

      {/* Photos */}
      {review.photos.length > 0 && (
        <div className="flex gap-2">
          {review.photos.map((url, i) => (
            <img
              key={i}
              src={url}
              alt=""
              className="h-16 w-16 rounded border border-line object-cover"
              loading="lazy"
            />
          ))}
        </div>
      )}

      {/* Author + provenance */}
      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-ink-muted">
        <span className="font-semibold text-ink">{review.author.initials}</span>
        {review.author.companyType && <span>· {review.author.companyType}</span>}
        {review.source === 'imported' ? (
          <span className="text-xs text-ink">
            · {MATERIAL_CONNECTION_LABEL[review.materialConnection ?? 'none']}
          </span>
        ) : (
          <span>· Invited after delivery · order linked</span>
        )}
      </div>

      {/* Seller reply */}
      {review.reply && (
        <div className="mt-1 border-l-[3px] border-brand bg-ground py-2.5 pl-3.5 pr-3 text-sm leading-relaxed text-ink-muted">
          <strong className="text-ink">Calib.Tools reply</strong>
          <span className="text-ink-muted"> · {review.reply.name} · {review.reply.date}</span>
          <p className="m-0 pt-1">{review.reply.body}</p>
        </div>
      )}
    </article>
  );
}
