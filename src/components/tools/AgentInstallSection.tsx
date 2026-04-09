import type { Tool } from '@/types';

interface AgentInstallSectionProps {
  tool: Tool;
}

export default function AgentInstallSection({ tool }: AgentInstallSectionProps) {
  if (!tool.installGuide) return null;

  const content = typeof tool.installGuide === 'string'
    ? tool.installGuide
    : JSON.stringify(tool.installGuide, null, 2);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">Quick Install</h3>
      <pre className="mt-2 overflow-x-auto text-xs text-[var(--text-secondary)]">
        <code>{content}</code>
      </pre>
    </div>
  );
}
