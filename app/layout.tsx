import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
// Self-hosted via @fontsource-variable — no external network request at build time
import "@fontsource-variable/bricolage-grotesque";
import "./globals.css";
import { cookies, headers } from "next/headers";
import { PostHogProvider } from "@/components/providers/posthog-provider";
import { MotionProvider } from "@/components/providers/motion-provider";
import { LanguageProvider } from "@/lib/i18n/language-provider";
import { requestLanguage } from "@/lib/i18n/request-language";
import { LANGUAGE_COOKIE_KEY } from "@/lib/i18n/config";

export const metadata: Metadata = {
  title: "Umprompt — Everyday help, made easier with AI",
  description:
    "Tell us what you need. Get clear instructions for your AI assistant or a useful first result, with simple guided steps. Try one task free.",
  icons: {
    icon: [{ url: "/icon.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Keep request APIs outside fallback catches so Next preserves dynamic rendering.
  const requestCookies = await cookies();
  const requestHeaders = await headers();
  const lang = requestLanguage(requestCookies.get(LANGUAGE_COOKIE_KEY)?.value, requestHeaders.get("accept-language") ?? "");

  return (
    <html
      lang={lang}
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-paper antialiased text-ink-900 min-h-screen">
        <PostHogProvider>
          <MotionProvider><LanguageProvider initialLanguage={lang}>{children}</LanguageProvider></MotionProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
