import {
  Bot,
  MousePointer,
  Code,
  Hand,
  Wind,
  Square,
  MessageCircle,
} from 'lucide-react';
import { getPlatformColor } from '@/lib/utils';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Bot,
  MousePointer,
  Code,
  Claw: Hand,
  Wind,
  Square,
  MessageCircle,
};

interface PlatformBadgeProps {
  slug: string;
  name: string;
  icon: string;
  size?: 'sm' | 'md';
}

export default function PlatformBadge({
  slug,
  name,
  icon,
  size = 'md',
}: PlatformBadgeProps) {
  const IconComponent = ICON_MAP[icon];
  const color = getPlatformColor(slug);
  const isSm = size === 'sm';

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full font-medium transition-theme"
      style={{
        color,
        backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)`,
        padding: isSm ? '2px 8px' : '4px 12px',
        fontSize: isSm ? '0.6875rem' : '0.75rem',
      }}
    >
      {IconComponent && (
        <IconComponent className={isSm ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      )}
      {name}
    </span>
  );
}
