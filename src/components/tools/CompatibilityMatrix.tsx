import type { Tool } from '@/types';

interface CompatibilityMatrixProps {
  tool: Tool;
}

export default function CompatibilityMatrix({ tool }: CompatibilityMatrixProps) {
  if (tool.platforms.length === 0) {
    return <p className="text-sm text-[var(--text-secondary)]">No compatibility data</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {tool.platforms.map((p) => (
        <span
          key={p.id}
          className="rounded-lg bg-[var(--bg-tertiary)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]"
        >
          {p.name}
        </span>
      ))}
    </div>
  );
}
