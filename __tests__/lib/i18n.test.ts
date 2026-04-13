import { getDictionary, t } from '@/lib/i18n';
import en from '@/i18n/en.json';
import zh from '@/i18n/zh.json';

describe('getDictionary', () => {
  it('returns English dictionary for "en"', () => {
    const dict = getDictionary('en');
    expect(dict.site.title).toBe('AgentToolHub');
    expect(dict.nav.home).toBe('Home');
  });

  it('returns Chinese dictionary for "zh"', () => {
    const dict = getDictionary('zh');
    expect(dict.nav.home).toBe('首页');
  });

  it('defaults to English for unknown locale', () => {
    const dict = getDictionary('fr');
    expect(dict.nav.home).toBe('Home');
  });
});

describe('t (translation lookup)', () => {
  it('returns value for valid key', () => {
    expect(t(en, 'nav.home')).toBe('Home');
    expect(t(zh, 'nav.home')).toBe('首页');
  });

  it('returns nested value', () => {
    expect(t(en, 'home.hero.title')).toBe('Find the Best AI Agent Tools');
    expect(t(zh, 'home.hero.title')).toBe('找到最适合你的 AI Agent 工具');
  });

  it('returns key for missing translation', () => {
    expect(t(en, 'nonexistent.key')).toBe('nonexistent.key');
  });

  it('returns key for partial match', () => {
    expect(t(en, 'nav')).toBe('nav');
  });
});

describe('i18n completeness', () => {
  it('zh has all keys that en has', () => {
    function getAllKeys(obj: Record<string, unknown>, prefix = ''): string[] {
      const keys: string[] = [];
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          keys.push(...getAllKeys(value as Record<string, unknown>, fullKey));
        } else {
          keys.push(fullKey);
        }
      }
      return keys;
    }

    const enKeys = getAllKeys(en as unknown as Record<string, unknown>);
    const zhDict = zh as unknown as Record<string, unknown>;

    for (const key of enKeys) {
      const parts = key.split('.');
      let current: unknown = zhDict;
      for (const part of parts) {
        if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
          current = (current as Record<string, unknown>)[part];
        } else {
          fail(`Missing Chinese translation for key: ${key}`);
        }
      }
    }
  });
});
