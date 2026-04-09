export function formatStars(stars: number): string {
  if (stars >= 1000) {
    return `${(stars / 1000).toFixed(1)}k`;
  }
  return String(stars);
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function getToolTypeColor(type: string): string {
  switch (type) {
    case 'MCP_SERVER':
      return '#3b82f6';
    case 'SKILL':
      return '#8b5cf6';
    case 'RULE':
      return '#f59e0b';
    default:
      return '#6e6e73';
  }
}

export function getPlatformColor(slug: string): string {
  const colors: Record<string, string> = {
    'claude-code': '#d97706',
    'cursor': '#3b82f6',
    'windsurf': '#06b6d4',
    'copilot': '#6e40c9',
    'cline': '#10b981',
    'aider': '#ef4444',
    'continue': '#8b5cf6',
  };
  return colors[slug] ?? '#6e6e73';
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
