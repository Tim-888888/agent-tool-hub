import type { Tool } from '@/types';

interface ReviewSectionProps {
  tool: Tool;
}

export default function ReviewSection({ tool }: ReviewSectionProps) {
  if (tool.ratingCount === 0) {
    return (
      <p className="text-sm text-[var(--text-secondary)]">No reviews yet.</p>
    );
  }

  return (
    <div>
      <p className="text-sm text-[var(--text-secondary)]">
        {tool.avgRating.toFixed(1)} average from {tool.ratingCount} reviews
      </p>
    </div>
  );
}
