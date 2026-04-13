import Link from 'next/link';
import { cn } from '@/lib/utils';

interface CardProps {
  href?: string;
  children: React.ReactNode;
  className?: string;
}

export default function Card({ href, children, className }: CardProps) {
  const baseStyles =
    'rounded-2xl bg-white p-5 shadow-sm border border-[var(--border)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:bg-[var(--bg-secondary)] dark:border-[var(--border)]';

  if (href) {
    return (
      <Link
        href={href}
        className={cn(baseStyles, 'block', className)}
      >
        {children}
      </Link>
    );
  }

  return (
    <div className={cn(baseStyles, className)}>
      {children}
    </div>
  );
}
