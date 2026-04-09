'use client';

import { useI18n } from '@/lib/i18n-context';

interface RatingDistributionProps {
  distribution: Record<number, number>;
  totalReviews: number;
}

export default function RatingDistribution({ distribution, totalReviews }: RatingDistributionProps) {
  const { t } = useI18n();

  const maxCount = Math.max(
    distribution[5] ?? 0,
    distribution[4] ?? 0,
    distribution[3] ?? 0,
    distribution[2] ?? 0,
    distribution[1] ?? 0,
    1,
  );

  return (
    <div className="space-y-2">
      {[5, 4, 3, 2, 1].map((star) => {
        const count = distribution[star] ?? 0;
        const percentage = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
        const fillWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;

        return (
          <div key={star} className="flex items-center gap-3">
            <span className="w-8 text-right text-sm font-semibold text-[var(--text-secondary)]">
              {star}<span className="text-xs font-normal">{'\u2605'}</span>
            </span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
              <div
                className="h-full rounded-full bg-[var(--color-accent)] transition-all duration-300"
                style={{ width: `${fillWidth}%` }}
                role="meter"
                aria-valuenow={percentage}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${star} ${t('community.reviewsCount')}: ${percentage}%, ${count}`}
              />
            </div>
            <span className="w-10 text-right text-sm text-[var(--text-tertiary)]">
              {percentage}%
            </span>
            <span className="w-8 text-right text-sm text-[var(--text-tertiary)]">
              ({count})
            </span>
          </div>
        );
      })}
    </div>
  );
}
