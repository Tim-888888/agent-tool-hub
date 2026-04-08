import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { notFound } from 'next/navigation';
import { isValidLocale, type AppLocale } from '@/i18n/dictionaries';
import { locales } from '@/i18n/config';
import { I18nProvider } from '@/lib/i18n-context';
import '../globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: {
      default:
        locale === 'zh'
          ? 'AgentToolHub -- AI Agent \u5de5\u5177\u53d1\u73b0\u5e73\u53f0'
          : 'AgentToolHub -- Discover AI Agent Tools',
      template: '%s -- AgentToolHub',
    },
    description:
      locale === 'zh'
        ? '\u53d1\u73b0\u6700\u4f73\u7684 MCP Server\u3001Skill \u548c Rule\uff0c\u9002\u7528\u4e8e Claude Code\u3001Cursor\u3001Cline\u3001OpenClaw \u7b49\u3002'
        : 'Find the best MCP Servers, Skills, and Rules for Claude Code, Cursor, Cline, OpenClaw and more.',
    openGraph: {
      title:
        locale === 'zh'
          ? 'AgentToolHub -- AI Agent \u5de5\u5177\u53d1\u73b0\u5e73\u53f0'
          : 'AgentToolHub -- Discover AI Agent Tools',
      description:
        locale === 'zh'
          ? '\u53d1\u73b0\u6700\u4f73\u7684 MCP Server\u3001Skill \u548c Rule\uff0c\u9002\u7528\u4e8e Claude Code\u3001Cursor\u3001Cline\u3001OpenClaw \u7b49\u3002'
          : 'Find the best MCP Servers, Skills, and Rules for Claude Code, Cursor, Cline, OpenClaw and more.',
      type: 'website',
      locale: locale === 'zh' ? 'zh_CN' : 'en_US',
      alternateLocale: locale === 'zh' ? 'en' : 'zh',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'AgentToolHub',
      description:
        locale === 'zh'
          ? '\u53d1\u73b0\u6700\u4f73\u7684 AI Agent \u5de5\u5177'
          : 'Discover the best AI Agent tools',
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    notFound();
  }

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <I18nProvider initialLocale={locale as AppLocale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
