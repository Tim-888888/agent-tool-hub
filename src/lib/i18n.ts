import type { Locale } from '@/i18n/config';

type Dictionary = Record<string, unknown>;

function getNestedValue(obj: Dictionary, path: string): string {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return path;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === 'string' ? current : path;
}

export function t(dict: Dictionary, key: string): string {
  return getNestedValue(dict, key);
}
