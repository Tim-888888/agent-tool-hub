'use client';

import Link from 'next/link';
import type { Tool } from '@/types';

interface ToolCardProps {
  tool: Tool;
}

export default function ToolCard({ tool }: ToolCardProps) {
  return (
    <Link
      href={`/tools/${tool.slug}`}
      className="group flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] p-5 transition-all hover:border-[var(--color-accent)]/30 hover:shadow-[var(--shadow-md)]"
    >
      <div className="flex items-center gap-2">
        <h3 className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--color-accent)]">
          {tool.name}
        </h3>
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-[var(--text-secondary)]">{tool.description}</p>
      <div className="mt-3 flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
        <span>{tool.stars} stars</span>
        <span>{tool.type}</span>
      </div>
    </Link>
  );
}
