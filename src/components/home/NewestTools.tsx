'use client';

import ToolCard from '@/components/tools/ToolCard';
import { useI18n } from '@/lib/i18n-context';
import type { Tool } from '@/types';

interface NewestToolsProps {
  tools: Tool[];
}

export default function NewestTools({ tools }: NewestToolsProps) {
  const { t } = useI18n();

  if (tools.length === 0) return null;

  return (
    <section className="py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">{t('home.newest')}</h2>
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      </div>
    </section>
  );
}
