'use client';

import { useState, useEffect, useCallback } from 'react';
import { useI18n } from '@/lib/i18n-context';
import StarRating from '@/components/shared/StarRating';

interface Review {
  id: string;
  rating: number;
  content: string | null;
  platform: string | null;
  useCase: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

interface ReviewListProps {
  toolSlug: string;
  onReviewsLoaded?: (reviews: Review[], total: number) => void;
  refreshTrigger?: number;
}

export default function ReviewList({ toolSlug, onReviewsLoaded, refreshTrigger }: ReviewListProps) {
  const { t } = useI18n();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchReviews = useCallback(async (pageNum: number, append = false) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/tools/${toolSlug}/reviews?page=${pageNum}&limit=10`);
      if (!res.ok) return;
      const json = await res.json();
      const newReviews = json.data as Review[];
      const meta = json.meta as { total: number; totalPages: number };

      if (append) {
        setReviews((prev) => [...prev, ...newReviews]);
      } else {
        setReviews(newReviews);
      }
      setTotal(meta.total);
      setTotalPages(meta.totalPages);

      if (onReviewsLoaded && !append) {
        onReviewsLoaded(newReviews, meta.total);
      }
    } catch {
      // Silently handle fetch errors
    } finally {
      setLoading(false);
    }
  }, [toolSlug, onReviewsLoaded]);

  useEffect(() => {
    fetchReviews(1);
  }, [fetchReviews, refreshTrigger]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchReviews(nextPage, true);
  };

  if (!loading && reviews.length === 0) {
    return (
      <div className="py-8 text-center">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">
          {t('community.noReviews')}
        </h3>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {t('community.noReviewsBody')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <article
          key={review.id}
          className="rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] p-5"
        >
          <div className="flex items-center gap-3">
            {review.user.image ? (
              <img
                src={review.user.image}
                alt=""
                className="h-6 w-6 rounded-full"
              />
            ) : (
              <div className="h-6 w-6 rounded-full bg-[var(--bg-tertiary)]" />
            )}
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {review.user.name ?? t('common.anonymous')}
            </span>
            <StarRating rating={review.rating} />
            <time
              dateTime={review.createdAt}
              className="ml-auto text-xs text-[var(--text-tertiary)]"
            >
              {new Date(review.createdAt).toLocaleDateString()}
            </time>
          </div>
          {review.content && (
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
              {review.content}
            </p>
          )}
          <div className="mt-3 flex items-center gap-2">
            {review.platform && (
              <span className="rounded-lg bg-[var(--bg-tertiary)] px-2 py-0.5 text-xs font-medium text-[var(--text-secondary)]">
                {review.platform}
              </span>
            )}
            {review.useCase && (
              <span className="text-xs text-[var(--text-tertiary)]">
                {review.useCase}
              </span>
            )}
          </div>
        </article>
      ))}

      {page < totalPages && (
        <div className="flex justify-center pt-2">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="rounded-xl border border-[var(--border)] px-5 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--color-accent)]/30 hover:text-[var(--text-primary)] disabled:opacity-50"
          >
            {loading ? '...' : t('community.loadMore')}
          </button>
        </div>
      )}
    </div>
  );
}
