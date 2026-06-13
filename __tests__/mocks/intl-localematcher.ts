export function match(requestedLocales: string[], availableLocales: string[], defaultLocale: string) {
  for (const requestedLocale of requestedLocales) {
    const normalized = requestedLocale.toLowerCase();
    const exact = availableLocales.find((locale) => locale.toLowerCase() === normalized);
    if (exact) return exact;

    const prefix = normalized.split("-")[0];
    const prefixed = availableLocales.find((locale) => locale.toLowerCase() === prefix);
    if (prefixed) return prefixed;
  }

  return defaultLocale;
}
