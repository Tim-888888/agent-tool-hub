/**
 * @jest-environment node
 */

jest.mock('server-only', () => ({}));

import { isValidLocale, getDictionary } from '@/i18n/dictionaries';

describe('isValidLocale', () => {
  it('returns true for "en"', () => {
    expect(isValidLocale('en')).toBe(true);
  });

  it('returns true for "zh"', () => {
    expect(isValidLocale('zh')).toBe(true);
  });

  it('returns false for "fr"', () => {
    expect(isValidLocale('fr')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isValidLocale('')).toBe(false);
  });
});

describe('getDictionary', () => {
  it('returns English dictionary with expected keys', async () => {
    const dict = await getDictionary('en');
    expect(dict).toBeDefined();
    expect(typeof dict).toBe('object');
    expect(dict).toHaveProperty('nav');
    expect(dict).toHaveProperty('nav.home');
    const nav = dict.nav as Record<string, string>;
    expect(nav.home).toBe('Home');
    expect(nav.tools).toBe('Tools');
  });

  it('returns Chinese dictionary with expected keys', async () => {
    const dict = await getDictionary('zh');
    expect(dict).toBeDefined();
    expect(typeof dict).toBe('object');
    expect(dict).toHaveProperty('nav');
    const nav = dict.nav as Record<string, string>;
    expect(nav.home).toBe('\u9996\u9875');
    expect(nav.tools).toBe('\u5de5\u5177');
  });
});
