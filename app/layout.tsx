import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
// Self-hosted via @fontsource-variable — no external network request at build time
import "@fontsource-variable/fraunces";
import "./globals.css";

export const metadata: Metadata = {
  title: "PromptOS — Describe what you want. Get the perfect prompt.",
  description:
    "PromptOS turns your idea into an execution-ready prompt for the exact AI tool you use. Cursor, Claude, ChatGPT, and more.",
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
        {children}
      </body>
    </html>
  );
}
