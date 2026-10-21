import type { Metadata, Viewport } from "next";
import "@fontsource-variable/imbue";
import "@fontsource-variable/albert-sans";
import "./globals.css";
import { cookies } from "next/headers";
import { AnalyticsProvider } from "@/components/system/analytics-provider";
import { LanguageProvider } from "@/lib/i18n/language-provider";
import { isSupportedLanguage } from "@/types/language";
import { LANGUAGE_COOKIE_KEY, DEFAULT_LANGUAGE } from "@/lib/i18n/config";

export const metadata: Metadata = {
  title: {
    default: "Umprompt | Say it rough. We'll make it precise.",
    template: "%s | Umprompt",
  },
  description:
    "Umprompt turns a rough everyday idea into a clear, structured AI prompt for any assistant. Start with an idea; Umprompt handles the structure.",
  icons: {
    icon: [{ url: "/icon.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "Umprompt | Say it rough. We'll make it precise.",
    description:
      "Turn a rough everyday idea into a clear, structured AI prompt for any assistant.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0d2a1c",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const savedLang = cookieStore.get(LANGUAGE_COOKIE_KEY)?.value;
  const lang = savedLang && isSupportedLanguage(savedLang) ? savedLang : DEFAULT_LANGUAGE;

  return (
    <html lang={lang}>
      <body>
        <a href="#main" className="skip-link">Skip to content</a>
        <AnalyticsProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </AnalyticsProvider>
      </body>
    </html>
  );
}
