import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Privacy Policy — Umprompt",
  description: "How Umprompt handles your data.",
};

const LAST_UPDATED = "May 2026";

export default function PrivacyPage() {
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
            Privacy Policy
          </h1>
          <p className="text-sm text-ink-400">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="prose-custom space-y-8">
          <Section title="What we collect">
            <p>
              When you sign in, we store your email address and a unique account ID in our
              database. We do not collect your name, phone number, or payment information.
            </p>
            <p>
              Prompts you create — including your idea, context, generated prompt text, and quality
              score — are saved to your account in our Supabase database. This data is used solely
              to power your personal prompt workspace.
            </p>
          </Section>

          <Section title="How we use your data">
            <ul>
              <li>To authenticate you and display your saved prompts.</li>
              <li>
                To send your prompt idea and context to our AI provider (Anthropic) for generation,
                scoring, and optimization. Anthropic processes this data subject to their own{" "}
                <a
                  href="https://www.anthropic.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-clay-700 underline underline-offset-2"
                >
                  privacy policy
                </a>
                .
              </li>
              <li>To improve Umprompt (aggregated, anonymized usage only — no prompt content).</li>
            </ul>
          </Section>

          <Section title="Your data is not sold">
            <p>
              We do not sell, rent, or trade your personal data or prompt content to any third
              party. Full stop.
            </p>
          </Section>

          <Section title="API keys are server-only">
            <p>
              Your Anthropic API key (and any other AI provider keys) are stored as server-side
              environment variables. They are never exposed to the browser, logged, or stored in
              the database.
            </p>
          </Section>

          <Section title="Deleting your data">
            <p>
              You can delete any saved prompt from the Builder or History page at any time. Deleted
              prompts are removed from our database immediately and permanently.
            </p>
            <p>
              To delete your account and all associated data, email us at the address in the
              Contact section below.
            </p>
          </Section>

          <Section title="Cookies and sessions">
            <p>
              We use Supabase Auth for authentication. Session tokens are stored in secure,
              HTTP-only cookies. We do not use third-party advertising or tracking cookies.
            </p>
          </Section>

          <Section title="Data storage">
            <p>
              Your data is stored in a Supabase-hosted Postgres database. Row-level security
              policies ensure that each user can only access their own data. Data is encrypted at
              rest and in transit.
            </p>
            <p>
              Umprompt stores user-provided prompts and generated outputs to provide workspace
              history, improve reliability, debug issues, and support users.
            </p>
          </Section>

          <Section title="Changes to this policy">
            <p>
              If we make material changes to this policy, we will update the &ldquo;Last updated&rdquo; date
              above. Continued use of Umprompt after changes constitutes acceptance.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              Questions about privacy? Email us at{" "}
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
            <Link href="/privacy" className="hover:text-ink-700 transition-colors font-medium text-ink-600">
              Privacy
            </Link>
            <span className="text-ink-200">·</span>
            <Link href="/terms" className="hover:text-ink-700 transition-colors">
              Terms
            </Link>
            <span className="text-ink-200">·</span>
            <span>© {new Date().getFullYear()} Umprompt</span>
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
