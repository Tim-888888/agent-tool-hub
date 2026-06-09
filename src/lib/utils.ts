export function formatStars(stars: number): string {
  if (stars >= 1000) {
    return `${(stars / 1000).toFixed(1)}k`;
  }
  return String(stars);
}

export function formatDate(dateString: string | Date | null | undefined): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getToolTypeColor(type: string): string {
  switch (type) {
    case 'MCP_SERVER':
      return 'var(--color-mcp)';
    case 'SKILL':
      return 'var(--color-skill)';
    case 'RULE':
      return 'var(--color-rule)';
    default:
      return 'var(--text-secondary)';
  }
}

export function getPlatformColor(slug: string): string {
  const colors: Record<string, string> = {
    'claude-code': 'var(--color-claude)',
    'cursor': 'var(--color-cursor)',
    'windsurf': 'var(--color-windsurf)',
    'copilot': 'var(--color-copilot)',
    'cline': 'var(--color-cline)',
    'aider': 'var(--color-aider)',
    'continue': 'var(--color-continue)',
  };
  return colors[slug] ?? 'var(--text-secondary)';
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
