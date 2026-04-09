'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { motion, useReducedMotion } from 'framer-motion';
import { useI18n } from '@/lib/i18n-context';
import { TAG_PRESETS, getTagLabel } from '@/lib/tag-presets';

interface TagVotingProps {
  toolSlug: string;
  toolId: string;
}

interface TagCount {
  tagSlug: string;
  count: number;
}

export default function TagVoting({ toolSlug }: TagVotingProps) {
  const { locale, t } = useI18n();
  const { data: session } = useSession();
  const prefersReducedMotion = useReducedMotion();

  const [tagCounts, setTagCounts] = useState<TagCount[]>([]);
  const [userVotes, setUserVotes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch(`/api/tools/${toolSlug}/tags`);
      const json = await res.json();
      if (json.success) {
        setTagCounts(json.data.tags);
        setUserVotes(new Set(json.data.userVotes));
      }
    } catch {
      // Silently handle fetch errors
    } finally {
      setLoading(false);
    }
  }, [toolSlug]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const handleTagClick = async (tagSlug: string) => {
    if (!session?.user) {
      signIn('github');
      return;
    }

    // Optimistic update
    const isVoting = !userVotes.has(tagSlug);

    if (isVoting && userVotes.size >= 3) {
      setMessage(t('community.tagVoteLimit'));
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    // Optimistically update UI
    const newUserVotes = new Set(userVotes);
    if (isVoting) {
      newUserVotes.add(tagSlug);
    } else {
      newUserVotes.delete(tagSlug);
    }
    setUserVotes(newUserVotes);

    // Update counts optimistically
    setTagCounts((prev) => {
      const existing = prev.find((tc) => tc.tagSlug === tagSlug);
      if (existing) {
        return prev.map((tc) =>
          tc.tagSlug === tagSlug
            ? { ...tc, count: tc.count + (isVoting ? 1 : -1) }
            : tc,
        );
      }
      if (isVoting) {
        return [...prev, { tagSlug, count: 1 }];
      }
      return prev;
    });

    try {
      const res = await fetch(`/api/tools/${toolSlug}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagSlug }),
      });
      const json = await res.json();
      if (!json.success) {
        // Revert optimistic update
        setUserVotes(userVotes);
        setTagCounts(tagCounts);
        if (res.status === 400) {
          setMessage(json.error || t('community.tagVoteLimit'));
          setTimeout(() => setMessage(null), 3000);
        }
      }
    } catch {
      // Revert on error
      setUserVotes(userVotes);
      setTagCounts(tagCounts);
    }
  };

  // Build the display list: all presets with their counts, sorted
  const displayTags = TAG_PRESETS.map((preset) => {
    const countData = tagCounts.find((tc) => tc.tagSlug === preset.slug);
    return {
      slug: preset.slug,
      count: countData?.count ?? 0,
    };
  })
    .filter((tag) => tag.count > 0 || userVotes.has(tag.slug))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.slug.localeCompare(b.slug);
    });

  const votedCount = userVotes.size;

  if (loading) {
    return null;
  }

  const animationProps = prefersReducedMotion
    ? {}
    : {
        vote: {
          scale: [1, 1.04, 1],
          transition: { duration: 0.2, ease: 'easeOut' as const },
        },
        unvote: {
          scale: [1, 0.96, 1],
          transition: { duration: 0.2, ease: 'easeIn' as const },
        },
      };

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">
          {t('community.tags')}
        </h2>
        {session?.user && (
          <span className="text-sm text-[var(--text-tertiary)]">
            {t('community.votedCount').replace('{count}', String(votedCount))}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {displayTags.map((tag) => {
          const isVoted = userVotes.has(tag.slug);
          return (
            <motion.button
              key={tag.slug}
              type="button"
              role="button"
              aria-pressed={isVoted}
              aria-label={`${getTagLabel(tag.slug, locale)} (${tag.count})`}
              whileTap={animationProps}
              animate={
                isVoted
                  ? animationProps.vote
                  : animationProps.unvote
              }
              onClick={() => handleTagClick(tag.slug)}
              className={`rounded-xl px-3 py-1.5 text-sm transition-colors min-h-[40px] flex items-center gap-1.5 ${
                isVoted
                  ? 'border border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                  : 'border border-[var(--border)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:border-[var(--color-accent)]/30 hover:bg-[var(--bg-tertiary)]/80 hover:text-[var(--text-primary)]'
              }`}
            >
              <span>{getTagLabel(tag.slug, locale)}</span>
              <span className="text-xs opacity-70">({tag.count})</span>
            </motion.button>
          );
        })}
      </div>

      {message && (
        <p className="mt-3 text-sm text-[var(--color-warning)]" role="alert">
          {message}
        </p>
      )}
    </section>
  );
}
