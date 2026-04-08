import 'server-only';

import type { Locale } from '@/i18n/config';

const dictionaries = {
  en: () => import('@/i18n/en.json').then((module) => module.default),
  zh: () => import('@/i18n/zh.json').then((module) => module.default),
} as const;

export type AppLocale = keyof typeof dictionaries;

export function isValidLocale(locale: string): locale is AppLocale {
  return locale in dictionaries;
}

export async function getDictionary(locale: AppLocale) {
  return dictionaries[locale]();
}
