'use client';

import { useState, useCallback, type KeyboardEvent } from 'react';

interface StarRatingProps {
  rating: number;
  interactive?: boolean;
  onChange?: (rating: number) => void;
}

function StarIcon({ filled, hovered }: { filled: boolean; hovered: boolean }) {
  const color = filled || hovered ? 'text-amber-400' : 'text-[var(--text-tertiary)]';
  return (
    <svg
      className={`h-5 w-5 ${color} transition-colors duration-100`}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

export default function StarRating({ rating, interactive = false, onChange }: StarRatingProps) {
  const [hoveredStar, setHoveredStar] = useState(0);
  const [focusedStar, setFocusedStar] = useState(0);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (!interactive || !onChange) return;
      let next = focusedStar || rating;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        e.preventDefault();
        next = Math.min(5, next + 1);
        setFocusedStar(next);
        onChange(next);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        e.preventDefault();
        next = Math.max(1, next - 1);
        setFocusedStar(next);
        onChange(next);
      }
    },
    [interactive, onChange, focusedStar, rating],
  );

  if (!interactive) {
    return (
      <span className="text-sm text-amber-400" aria-label={`${rating} out of 5 stars`}>
        {Array.from({ length: 5 }, (_, i) => (i < Math.floor(rating) ? '\u2605' : '\u2606')).join('')}
      </span>
    );
  }

  const displayRating = focusedStar || rating;

  return (
    <div
      role="radiogroup"
      aria-label="Star rating"
      className="flex items-center gap-0.5"
      onKeyDown={handleKeyDown}
    >
      {Array.from({ length: 5 }, (_, i) => {
        const starValue = i + 1;
        const isFilled = starValue <= displayRating;
        const isHovered = hoveredStar > 0 && starValue <= hoveredStar;

        return (
          <button
            key={starValue}
            type="button"
            role="radio"
            aria-label={`${starValue} star${starValue > 1 ? 's' : ''}`}
            aria-checked={starValue === displayRating}
            className="flex h-11 w-11 items-center justify-center rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
            onClick={() => {
              onChange?.(starValue);
              setFocusedStar(starValue);
            }}
            onMouseEnter={() => setHoveredStar(starValue)}
            onMouseLeave={() => setHoveredStar(0)}
          >
            <StarIcon filled={isFilled} hovered={isHovered} />
          </button>
        );
      })}
    </div>
  );
}
