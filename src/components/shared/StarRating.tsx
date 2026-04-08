interface StarRatingProps {
  rating: number;
}

export default function StarRating({ rating }: StarRatingProps) {
  const fullStars = Math.floor(rating);
  const stars = Array.from({ length: 5 }, (_, i) => (i < fullStars ? '\u2605' : '\u2606'));

  return (
    <span className="text-sm text-amber-400" aria-label={`${rating} out of 5 stars`}>
      {stars.join('')}
    </span>
  );
}
