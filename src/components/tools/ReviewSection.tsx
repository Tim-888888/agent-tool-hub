'use client';

import { useState, useCallback } from 'react';
import { useI18n } from '@/lib/i18n-context';
import type { Tool } from '@/types';
import StarRating from '@/components/shared/StarRating';
import RatingDistribution from '@/components/tools/RatingDistribution';
import ReviewList from '@/components/tools/ReviewList';
import ReviewForm from '@/components/tools/ReviewForm';

interface ReviewSectionProps {
  tool: Tool;
}

export default function ReviewSection({ tool }: ReviewSectionProps) {
  const { t } = useI18n();
  const [distribution, setDistribution] = useState<Record<number, number>>({});
  const [totalFromServer, setTotalFromServer] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleReviewsLoaded = useCallback((reviews: { rating: number }[], total: number) => {
    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const review of reviews) {
      const key = review.rating as number;
      dist[key] = (dist[key] ?? 0) + 1;
    }
    // Only count from loaded reviews; for full distribution we need total counts
    // but pagination means we only have first page. Use tool.ratingCount as total.
    setDistribution(dist);
    setTotalFromServer(total);
  }, []);

  const handleReviewSubmitted = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const displayTotal = tool.ratingCount || totalFromServer;

  return (
    <section>
      {/* Heading */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">
          {t('community.reviews')}
        </h2>
      </div>

      {/* Overall Rating + Distribution */}
      {displayTotal > 0 && (
        <div className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5">
          <div className="mb-4 flex items-center gap-3">
            <span className="text-2xl font-bold text-[var(--text-primary)]">
              {tool.avgRating.toFixed(1)}
            </span>
            <StarRating rating={tool.avgRating} />
            <span className="text-sm text-[var(--text-tertiary)]">
              ({displayTotal} {t('community.reviewsCount')})
            </span>
          </div>
          <RatingDistribution distribution={distribution} totalReviews={displayTotal} />
        </div>
      )}

      {/* Review Form */}
      <div className="mb-6">
        <ReviewForm
          toolSlug={tool.slug}
          onSubmitted={handleReviewSubmitted}
        />
      </div>

      {/* Review List */}
      <ReviewList
        toolSlug={tool.slug}
        onReviewsLoaded={handleReviewsLoaded}
        refreshTrigger={refreshTrigger}
      />
    </section>
  );
}
