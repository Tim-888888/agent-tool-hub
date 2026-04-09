import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const locales = ['en', 'zh'] as const;
const defaultLocale = 'en';

function getLocale(request: NextRequest): string {
  // Cookie takes priority (set by language toggle)
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  if (cookieLocale && locales.includes(cookieLocale as (typeof locales)[number])) {
    return cookieLocale;
  }

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
    pathname.startsWith('/admin') ||
    pathname.includes('.')
  ) {
    return;
  }

  // Check if pathname already has a locale prefix
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) {
    // Locale prefix already present -- serve directly, no redirect
    return;
  }

  // No locale prefix -- detect locale and redirect
  const locale = getLocale(request);
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname}`;
  const response = NextResponse.redirect(url);
  response.cookies.set('NEXT_LOCALE', locale, { path: '/' });
  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)'],
};
