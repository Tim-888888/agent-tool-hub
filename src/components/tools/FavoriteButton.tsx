'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useI18n } from '@/lib/i18n-context';

interface FavoriteButtonProps {
  toolId: string;
  initialFavorited?: boolean;
  size?: number;
  showLabel?: boolean;
}

export default function FavoriteButton({
  toolId,
  initialFavorited = false,
  size = 18,
  showLabel = false,
}: FavoriteButtonProps) {
  const { data: session } = useSession();
  const { t } = useI18n();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [loading, setLoading] = useState(false);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!session) {
      // Trigger sign in — handled by parent via login button
      return;
    }

    if (loading) return;
    setLoading(true);

    try {
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolId }),
      });

      if (res.ok) {
        const data = await res.json();
        setFavorited(data.data?.action === 'added');
      }
    } catch {
      // Silently fail — optimistic UI already toggled
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors hover:bg-[var(--bg-tertiary)] disabled:opacity-50"
      title={favorited ? t('favorites.remove') : t('favorites.add')}
      aria-label={favorited ? t('favorites.remove') : t('favorites.add')}
    >
      <Heart
        size={size}
        className={
          favorited
            ? 'fill-red-500 text-red-500'
            : 'text-[var(--text-tertiary)]'
        }
      />
      {showLabel && (
        <span className="text-[var(--text-secondary)]">
          {favorited ? t('favorites.saved') : t('favorites.save')}
        </span>
      )}
    </button>
  );
}
