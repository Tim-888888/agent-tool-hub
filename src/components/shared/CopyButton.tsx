'use client';

interface CopyButtonProps {
  text: string;
}

export default function CopyButton({ text }: CopyButtonProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
  };

  return (
    <button
      onClick={handleCopy}
      className="rounded-lg border border-[var(--border)] px-2 py-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      aria-label="Copy to clipboard"
    >
      Copy
    </button>
  );
}
