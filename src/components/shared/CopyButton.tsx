'use client';

import { useI18n } from '@/lib/i18n-context';

interface CopyButtonProps {
  text: string;
}

export default function CopyButton({ text }: CopyButtonProps) {
  const { t } = useI18n();

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
  };

  return (
    <button
      onClick={handleCopy}
      className="rounded-lg border border-[var(--border)] px-2 py-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      aria-label={t('common.copyToClipboard')}
    >
      {t('common.copy')}
    </button>
  );
}
