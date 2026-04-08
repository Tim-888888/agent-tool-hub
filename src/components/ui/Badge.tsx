interface BadgeProps {
  label: string;
  color?: string;
  variant?: 'default' | 'outline';
}

export default function Badge({ label, variant = 'default' }: BadgeProps) {
  const baseClasses = 'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium';
  const variantClasses =
    variant === 'outline'
      ? 'border border-[var(--border)] text-[var(--text-secondary)]'
      : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]';

  return <span className={`${baseClasses} ${variantClasses}`}>{label}</span>;
}
