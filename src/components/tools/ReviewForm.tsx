'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { signIn } from 'next-auth/react';
import { useI18n } from '@/lib/i18n-context';
import StarRating from '@/components/shared/StarRating';

interface ExistingReview {
  rating: number;
  content?: string | null;
  platform?: string | null;
  useCase?: string | null;
}

interface ReviewFormProps {
  toolSlug: string;
  existingReview?: ExistingReview | null;
  onSubmitted?: () => void;
}

export default function ReviewForm({ toolSlug, existingReview, onSubmitted }: ReviewFormProps) {
  const { t } = useI18n();
  const { data: session } = useSession();
  const [expanded, setExpanded] = useState(false);
  const [rating, setRating] = useState(existingReview?.rating ?? 0);
  const [content, setContent] = useState(existingReview?.content ?? '');
  const [platform, setPlatform] = useState(existingReview?.platform ?? '');
  const [useCase, setUseCase] = useState(existingReview?.useCase ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isUpdate = existingReview !== undefined && existingReview !== null;

  const handleSubmit = useCallback(async () => {
    if (rating === 0) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/tools/${toolSlug}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          content: content || undefined,
          platform: platform || undefined,
          useCase: useCase || undefined,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        setError(json.error ?? t('community.reviewError'));
        return;
      }

      setSuccess(true);
      onSubmitted?.();
      setTimeout(() => {
        setExpanded(false);
        setSuccess(false);
      }, 2000);
    } catch {
      setError(t('community.reviewError'));
    } finally {
      setSubmitting(false);
    }
  }, [rating, content, platform, useCase, toolSlug, t, onSubmitted]);

  if (!session?.user) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] p-5 text-center">
        <button
          onClick={() => signIn('github')}
          className="text-sm font-medium text-[var(--color-accent)] hover:underline"
        >
          {t('community.signInToReview')}
        </button>
      </div>
    );
  }

  if (!expanded && !success) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="rounded-xl border border-[var(--color-accent)] px-5 py-2 text-sm font-medium text-[var(--color-accent)] transition-colors hover:bg-[var(--color-accent)]/10"
      >
        {isUpdate ? t('community.updateReview') : t('community.writeReview')}
      </button>
    );
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-[var(--color-success)]/30 bg-[var(--color-success)]/5 p-5 text-center">
        <p className="text-sm font-medium text-[var(--color-success)]">
          {isUpdate ? t('community.reviewUpdated') : t('community.reviewSubmitted')}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-xl rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] p-6">
      <h3 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">
        {isUpdate ? t('community.updateReview') : t('community.writeReview')}
      </h3>

      {/* Star Rating */}
      <div className="mb-4">
        <StarRating
          rating={rating}
          interactive
          onChange={(value) => setRating(value)}
        />
      </div>

      {/* Content */}
      <div className="mb-4">
        <label className="mb-1 block text-sm font-semibold text-[var(--text-secondary)]">
          {t('community.content')}
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, 500))}
          placeholder={t('community.contentPlaceholder')}
          rows={3}
          maxLength={500}
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
        />
        <p className="mt-1 text-right text-xs text-[var(--text-tertiary)]">
          {content.length}/500
        </p>
      </div>

      {/* Platform */}
      <div className="mb-4">
        <label className="mb-1 block text-sm font-semibold text-[var(--text-secondary)]">
          {t('community.platform')}
        </label>
        <input
          type="text"
          value={platform}
          onChange={(e) => setPlatform(e.target.value.slice(0, 50))}
          placeholder="Claude Code, Cursor, etc."
          maxLength={50}
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
        />
      </div>

      {/* Use Case */}
      <div className="mb-4">
        <label className="mb-1 block text-sm font-semibold text-[var(--text-secondary)]">
          {t('community.useCase')}
        </label>
        <input
          type="text"
          value={useCase}
          onChange={(e) => setUseCase(e.target.value.slice(0, 100))}
          placeholder={t('community.useCasePlaceholder')}
          maxLength={100}
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
        />
      </div>

      {/* Error */}
      {error && (
        <div aria-live="polite" className="mb-4 rounded-xl border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 p-3">
          <p className="text-sm text-[var(--color-danger)]">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSubmit}
          disabled={rating === 0 || submitting}
          className="rounded-xl bg-[var(--color-accent)] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
        >
          {submitting
            ? '...'
            : isUpdate
              ? t('community.updateReview')
              : t('community.writeReview')}
        </button>
        <button
          onClick={() => setExpanded(false)}
          className="rounded-xl border border-[var(--border)] px-5 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
