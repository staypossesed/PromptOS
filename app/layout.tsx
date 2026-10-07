import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
// Self-hosted via @fontsource-variable — no external network request at build time
import "@fontsource-variable/bricolage-grotesque";
import "./globals.css";
import { cookies } from "next/headers";
import { PostHogProvider } from "@/components/providers/posthog-provider";
import { MotionProvider } from "@/components/providers/motion-provider";
import { LanguageProvider } from "@/lib/i18n/language-provider";
import { isSupportedLanguage } from "@/types/language";
import { LANGUAGE_COOKIE_KEY, DEFAULT_LANGUAGE } from "@/lib/i18n/config";

export const metadata: Metadata = {
  title: "Umprompt — Turn rough ideas into ready-to-use AI prompts",
  description:
    "Turn messy ideas into clear AI requests for writing, coding, research, everyday tasks and more. Start with an idea; Umprompt handles the structure.",
  icons: {
    icon: "/brand/umprompt-icon.png",
    apple: "/brand/umprompt-icon.png",
  },
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
          <MotionProvider><LanguageProvider>{children}</LanguageProvider></MotionProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
