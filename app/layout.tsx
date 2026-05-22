import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
// Self-hosted via @fontsource-variable — no external network request at build time
import "@fontsource-variable/bricolage-grotesque";
import "./globals.css";
import { cookies } from "next/headers";
import { PostHogProvider } from "@/components/providers/posthog-provider";
import { LanguageProvider } from "@/lib/i18n/language-provider";
import { isSupportedLanguage } from "@/types/language";
import { LANGUAGE_COOKIE_KEY, DEFAULT_LANGUAGE } from "@/lib/i18n/config";

export const metadata: Metadata = {
  title: "Umprompt — From rough ideas to perfect AI prompts",
  description:
    "Generate, score, optimize, and save execution-ready prompts for Claude, Cursor, and ChatGPT.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const savedLang = cookieStore.get(LANGUAGE_COOKIE_KEY)?.value;
  const lang = (savedLang && isSupportedLanguage(savedLang)) ? savedLang : DEFAULT_LANGUAGE;

  return (
    <html
      lang={lang}
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-paper antialiased text-ink-900 min-h-screen">
        <PostHogProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
