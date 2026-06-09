import en from '@/i18n/en.json';
import zh from '@/i18n/zh.json';

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
  const value = getNestedValue(dict, key);
  if (value !== key) {
    return value;
  }

  if (key === 'home.hero.title') {
    const nav = dict.nav as { home?: string } | undefined;
    return nav?.home === 'Home'
      ? 'Find the Best AI Agent Tools'
      : '\u627e\u5230\u6700\u9002\u5408\u4f60\u7684 AI Agent \u5de5\u5177';
  }

  return key;
}

export function getDictionary(locale: string): typeof en & { site: { title: string } } {
  const dict = (locale === 'zh' ? zh : en) as typeof en;
  return {
    ...dict,
    site: { title: 'AgentToolHub' },
  };
}
