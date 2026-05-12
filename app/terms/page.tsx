import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Terms of Service — PromptOS",
  description: "Terms and conditions for using PromptOS.",
};

const LAST_UPDATED = "May 2026";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-paper">
      {/* Nav */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-cream-50/70 border-b border-ink-100/40">
        <div className="max-w-4xl mx-auto px-5 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/">
            <Logo />
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link href="/">
              <ArrowLeft className="size-3.5" />
              Back
            </Link>
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-5 lg:px-8 py-14 md:py-20">
        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clay-600 mb-3">
            Legal
          </p>
          <h1 className="font-serif text-4xl md:text-5xl tracking-tight text-ink-900 leading-[1.05] mb-4">
            Terms of Service
          </h1>
          <p className="text-sm text-ink-400">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="space-y-8">
          <Section title="Acceptance">
            <p>
              By using PromptOS you agree to these terms. If you do not agree, do not use the
              service. These terms may be updated at any time — continued use constitutes
              acceptance of the current version.
            </p>
          </Section>

          <Section title="Service provided as-is">
            <p>
              PromptOS is provided &ldquo;as is&rdquo; without warranties of any kind, express or implied. We
              do not guarantee that the service will be uninterrupted, error-free, or that AI
              output will be accurate, complete, or suitable for your specific purpose.
            </p>
            <p>
              AI-generated prompts and scores are produced by large language models and may
              contain inaccuracies, outdated information, or content that requires review before
              use. Always verify AI output before acting on it.
            </p>
          </Section>

          <Section title="Your content">
            <p>
              You own the ideas, context, and prompts you create with PromptOS. We claim no
              intellectual property rights over your inputs or the AI-generated outputs produced
              from them.
            </p>
            <p>
              By using PromptOS, you grant us a limited license to store and process your content
              solely to provide the service (display your prompts, run AI generation, score
              results).
            </p>
          </Section>

          <Section title="Acceptable use">
            <p>You agree not to use PromptOS to:</p>
            <ul>
              <li>Generate or distribute illegal content of any kind.</li>
              <li>Violate any applicable law or regulation.</li>
              <li>Attempt to reverse-engineer, scrape, or exploit the service.</li>
              <li>
                Circumvent usage limits, rate limits, or access controls.
              </li>
              <li>
                Use the service in any way that violates the terms of the underlying AI provider
                (Anthropic).
              </li>
            </ul>
          </Section>

          <Section title="Billing">
            <p>
              PromptOS is currently free to use. Billing and paid plans are not active. When
              billing is introduced, users will be notified in advance and must affirmatively
              agree to any paid terms before being charged.
            </p>
          </Section>

          <Section title="Limitation of liability">
            <p>
              To the maximum extent permitted by law, PromptOS and its creators are not liable for
              any indirect, incidental, special, consequential, or punitive damages arising from
              your use of the service, including any losses resulting from AI-generated content.
            </p>
          </Section>

          <Section title="Account termination">
            <p>
              We reserve the right to suspend or terminate accounts that violate these terms,
              abuse the service, or engage in fraudulent activity, with or without notice.
            </p>
            <p>
              You may delete your account and data at any time by contacting us (see Privacy
              Policy).
            </p>
          </Section>

          <Section title="Governing law">
            <p>
              These terms are governed by applicable law. Any disputes shall be resolved in the
              jurisdiction where PromptOS operates.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              Questions about these terms? Email us at{" "}
              <a
                href="mailto:vanarnold.etsy@gmail.com"
                className="text-clay-700 underline underline-offset-2"
              >
                vanarnold.etsy@gmail.com
              </a>
              .
            </p>
          </Section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-ink-100/60 bg-cream-50/40 mt-10">
        <div className="max-w-4xl mx-auto px-5 lg:px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo />
          <div className="flex items-center gap-4 text-xs text-ink-400">
            <Link href="/privacy" className="hover:text-ink-700 transition-colors">
              Privacy
            </Link>
            <span className="text-ink-200">·</span>
            <Link href="/terms" className="hover:text-ink-700 transition-colors font-medium text-ink-600">
              Terms
            </Link>
            <span className="text-ink-200">·</span>
            <span>© {new Date().getFullYear()} PromptOS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-serif text-xl font-medium text-ink-900 mb-3">{title}</h2>
      <div className="space-y-3 text-[15px] text-ink-600 leading-relaxed">{children}</div>
    </section>
  );
}
