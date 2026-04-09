'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Locale } from '@/i18n/config';
import enDict from '@/i18n/en.json';
import zhDict from '@/i18n/zh.json';
import { t } from '@/lib/i18n';

type Dictionary = Record<string, unknown>;

const dictionaries: Record<Locale, Dictionary> = {
  en: enDict,
  zh: zhDict,
};

/** Prepend locale prefix to a path for internal links */
export function localePath(locale: Locale, path: string): string {
  return `/${locale}${path}`;
}

interface I18nContextValue {
  locale: Locale;
  dict: Dictionary;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

interface I18nProviderProps {
  children: ReactNode;
  initialLocale?: Locale;
}

export function I18nProvider({ children, initialLocale }: I18nProviderProps) {
  const [locale] = useState<Locale>(initialLocale ?? 'en');
  const dict = dictionaries[locale];

  const value: I18nContextValue = {
    locale,
    dict,
    t: (key: string) => t(dict, key),
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
