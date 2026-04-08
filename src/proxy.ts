import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const locales = ['en', 'zh'] as const;
const defaultLocale = 'en';

function getLocale(request: NextRequest): string {
  const acceptLanguage = request.headers.get('accept-language') ?? '';

  let headerLocales: string[] = [];
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Negotiator = require('negotiator');
    const negotiator = new Negotiator({ headers: { 'accept-language': acceptLanguage } });
    headerLocales = negotiator.languages();
  } catch {
    // Fallback: parse accept-language manually
    if (acceptLanguage) {
      headerLocales = acceptLanguage
        .split(',')
        .map((lang) => lang.split(';')[0].trim())
        .filter(Boolean);
    }
  }

  if (headerLocales.length === 0) {
    return defaultLocale;
  }

  try {
    const canonicalLocales = Intl.getCanonicalLocales(headerLocales);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { match } = require('@formatjs/intl-localematcher');
    return match(canonicalLocales, locales as unknown as string[], defaultLocale);
  } catch {
    // Fallback: simple prefix match
    for (const headerLocale of headerLocales) {
      const prefix = headerLocale.split('-')[0].toLowerCase();
      if (locales.includes(prefix as (typeof locales)[number])) {
        return prefix;
      }
    }
    return defaultLocale;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes, Next.js internals, static files
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/_vercel') ||
    pathname.includes('.')
  ) {
    return;
  }

  // Check if pathname already has a locale prefix
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) {
    // If it's the default locale prefix, strip it (redirect to clean URL)
    const isDefaultLocalePrefix =
      pathname.startsWith(`/${defaultLocale}/`) || pathname === `/${defaultLocale}`;

    if (isDefaultLocalePrefix) {
      const cleanPath = pathname.replace(new RegExp(`^/${defaultLocale}`), '') || '/';
      const url = request.nextUrl.clone();
      url.pathname = cleanPath;
      return NextResponse.redirect(url, 301);
    }
    // Non-default locale prefix stays (e.g., /zh/tools/xxx)
    return;
  }

  // No locale prefix -- detect locale
  const locale = getLocale(request);

  if (locale === defaultLocale) {
    // Rewrite internally to /en/path so [locale] segment resolves
    const url = request.nextUrl.clone();
    url.pathname = `/${defaultLocale}${pathname}`;
    return NextResponse.rewrite(url);
  }

  // Non-default locale: redirect to /zh/path
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname}`;
  const response = NextResponse.redirect(url);
  response.cookies.set('NEXT_LOCALE', locale, { path: '/' });
  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)'],
};
