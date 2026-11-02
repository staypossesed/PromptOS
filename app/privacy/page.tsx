import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Privacy Policy — Umprompt",
  description: "How Umprompt handles your data.",
};

const LAST_UPDATED = "November 1, 2026";

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
              database. Stripe handles checkout and card details. We keep Stripe customer,
              checkout, and subscription references and plan/access status to manage billing;
              we do not store card numbers.
            </p>
            <p>
              Prompts you explicitly save, including the idea, context, generated text, and quality
              score, appear in your personal Supabase-backed workspace. Generation inputs and
              outputs may also be recorded separately for reliability, debugging, and support;
              choosing not to save a prompt does not mean that no server-side records exist.
            </p>
          </Section>

          <Section title="Trying a task before signing in">
            <p>
              You can try one task without an account. Your idea and selected details are
              sent to our configured AI provider. We do not add this guest result to your
              saved history. Your browser may keep a temporary draft in session storage for
              up to one hour so you can finish signing in without losing your work.
            </p>
            <p>
              To limit abuse, our Redis service temporarily keeps a keyed hash of your
              network address and a trial-use marker for up to seven days. People sharing
              a network may share this guest allowance. This limit record does not include
              your idea or generated result. You can sign in for your account allowance.
            </p>
          </Section>

          <Section title="How we use your data">
            <p>
              Frequent tasks can store the preferences you choose to reuse and study notes you
              write yourself. Session completion is recorded only when you mark it. We cannot
              see conversations in another AI assistant. Saved personal preferences are included
              in a new AI request only after you review and confirm the displayed details.
            </p>
            <ul>
              <li>To authenticate you and display your saved prompts.</li>
              <li>
                To send your prompt idea and relevant context to the configured AI provider,
                Anthropic or OpenRouter, for generation, scoring, and optimization. These
                providers process data subject to their own privacy policies, including{" "}
                <a
                  href="https://www.anthropic.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-clay-700 underline underline-offset-2"
                >
                  privacy policy
                </a>
                {" and "}<a href="https://openrouter.ai/privacy" target="_blank" rel="noopener noreferrer" className="text-clay-700 underline underline-offset-2">OpenRouter&apos;s privacy policy</a>
                .
              </li>
              <li>To improve Umprompt using limited product-usage analytics, without prompt or answer content.</li>
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
              We use Supabase Auth for authentication and browser session storage. The website
              can also use first-party local storage for PostHog product analytics. We do not
              use third-party advertising cookies.
            </p>
          </Section>

          <Section title="Product analytics">
            <p>
              When configured, PostHog receives account IDs, signup and sign-in times,
              checkout creation times, random task/result identifiers, generation and copy actions, optional usefulness
              votes, and verified purchase metadata such as plan, amount, currency, and
              test/live status. This lets us distinguish copying a prompt from reporting a
              useful answer and measure return visits and purchases. Account-linked analytics
              are pseudonymous, not anonymous.
            </p>
            <p>
              These events do not include email addresses, prompt text, AI answers, context
              profiles, card details, keys, or authentication tokens. Full page URLs and
              referrers are excluded; automatic interaction capture and session recording
              are disabled. Usefulness feedback is optional. The extension does not add this
              website analytics SDK to its panel.
            </p>
          </Section>

          <Section title="Browser extension">
            <p>
              The Umprompt extension stores its sign-in session and unfinished prompt draft in
              the browser&apos;s local extension storage. Drafts are separate from saved account
              history. Signing out through the extension removes its current account session
              and that account&apos;s local draft, but does not delete saved website history.
            </p>
            <p>
              The extension does not automatically read webpages, browsing history, or the
              clipboard. It processes text you type or paste into its panel, and writes a prompt
              to the clipboard only when you choose Copy. Expanding, scoring, optimizing, and
              simplifying send relevant task text to Umprompt&apos;s server and configured AI
              provider. Choosing Save stores the prompt in the same private account history
              used by the website.
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
                href="mailto:umpromptsupport@gmail.com"
                className="text-clay-700 underline underline-offset-2"
              >
                umpromptsupport@gmail.com
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
