import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const locales = ["en", "zh"] as const;
const defaultLocale = "en";

function parseAcceptLanguage(header: string): string[] {
  return header
    .split(",")
    .map((part) => {
      const [locale, ...params] = part.trim().split(";");
      const qualityParam = params.find((param) => param.trim().startsWith("q="));
      const quality = qualityParam ? Number.parseFloat(qualityParam.split("=")[1]) : 1;
      return { locale: locale.trim(), quality: Number.isFinite(quality) ? quality : 0 };
    })
    .filter((item) => item.locale)
    .sort((a, b) => b.quality - a.quality)
    .map((item) => item.locale);
}

function getLocale(request: NextRequest): string {
  const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value;
  if (cookieLocale && locales.includes(cookieLocale as (typeof locales)[number])) {
    return cookieLocale;
  }

  const headerLocales = parseAcceptLanguage(request.headers.get("accept-language") ?? "");
  if (headerLocales.length === 0) {
    return defaultLocale;
  }

  try {
    const canonicalLocales = Intl.getCanonicalLocales(headerLocales);
    for (const headerLocale of canonicalLocales) {
      const exact = locales.find((locale) => locale === headerLocale.toLowerCase());
      if (exact) return exact;
      const prefix = headerLocale.split("-")[0].toLowerCase();
      if (locales.includes(prefix as (typeof locales)[number])) {
        return prefix;
      }
    }
    return defaultLocale;
  } catch {
    for (const headerLocale of headerLocales) {
      const prefix = headerLocale.split("-")[0].toLowerCase();
      if (locales.includes(prefix as (typeof locales)[number])) {
        return prefix;
      }
    }
    return defaultLocale;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/_vercel") ||
    pathname.startsWith("/admin") ||
    pathname.includes(".")
  ) {
    return;
  }

  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
  );

  if (pathnameHasLocale) {
    return;
  }

  const locale = getLocale(request);
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname}`;
  const response = NextResponse.redirect(url);
  response.cookies.set("NEXT_LOCALE", locale, { path: "/" });
  return response;
}

export const middleware = proxy;

