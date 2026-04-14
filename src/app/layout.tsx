import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { I18nProvider } from "@/lib/i18n-context";
import SessionProvider from "@/components/auth/SessionProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "AgentToolHub — Discover AI Agent Tools",
    template: "%s — AgentToolHub",
  },
  description:
    "Find the best MCP Servers, Skills, and Rules for Claude Code, Cursor, Cline, OpenClaw and more.",
  keywords: [
    "MCP", "MCP Server", "Claude Code", "Cursor", "Cline", "OpenClaw",
    "Windsurf", "VS Code", "ChatGPT", "AI Agent", "Skill", "Rule",
    "Tool Directory",
  ],
  openGraph: {
    title: "AgentToolHub — Discover AI Agent Tools",
    description:
      "The ultimate discovery platform for AI Agent tools across all platforms.",
    type: "website",
    siteName: "AgentToolHub",
  },
  twitter: {
    card: "summary_large_image",
    title: "AgentToolHub — Discover AI Agent Tools",
    description:
      "The ultimate discovery platform for AI Agent tools across all platforms.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-full flex flex-col`}
      >
        <SessionProvider>
          <I18nProvider>
            {children}
          </I18nProvider>
        </SessionProvider>
        {process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID && process.env.NEXT_PUBLIC_UMAMI_SRC && (
          <Script
            src={process.env.NEXT_PUBLIC_UMAMI_SRC}
            data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
