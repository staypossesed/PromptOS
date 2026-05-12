import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
// Self-hosted via @fontsource-variable — no external network request at build time
import "@fontsource-variable/fraunces";
import "./globals.css";
import { PostHogProvider } from "@/components/providers/posthog-provider";

export const metadata: Metadata = {
  title: "Umprompt — From rough ideas to perfect AI prompts",
  description:
    "Generate, score, optimize, and save execution-ready prompts for Claude, Cursor, and ChatGPT.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-paper antialiased text-ink-900 min-h-screen">
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
