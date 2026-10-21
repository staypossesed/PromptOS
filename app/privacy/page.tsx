import Link from "next/link";
import { Nav } from "@/components/system/nav";
import { Footer } from "@/components/system/footer";

export const metadata = {
  title: "Privacy policy",
  description: "How Umprompt handles your data.",
};

const LAST_UPDATED = "October 10, 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="stack">
      <h2 style={{ fontSize: "clamp(24px, 2vw, 34px)" }}>{title}</h2>
      <div className="stack">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <>
      <Nav />
      <main id="main" className="wrap band">
        <div className="axis">
          <aside className="axis__side" aria-hidden="true" />
          <article className="axis__main stack--loose stack">
            <h1 style={{ fontSize: "clamp(48px, 6vw, 96px)" }}>Privacy policy.</h1>
            <p className="small muted">Last updated: {LAST_UPDATED}</p>
            <p className="lead">
              What we store, why, and what we do not do with it.
            </p>

            <Section title="What we collect">
              <p className="body">When you sign in, we store your email address and a unique account ID in our database. We do not collect your name, phone number, or payment information.</p>
              <p className="body">Prompts you explicitly save, including the idea, context, generated text, and quality score, appear in your personal Supabase-backed workspace. Generation inputs and outputs may also be recorded separately for reliability, debugging, and support; choosing not to save a prompt does not mean that no server-side records exist.</p>
            </Section>

            <Section title="How we use your data">
              <p className="body">To authenticate you and display your saved prompts. To send your prompt idea and relevant context to the configured AI provider, Anthropic or OpenRouter, for generation, scoring, and optimization. These providers process data under their own privacy policies. To improve Umprompt with aggregated, anonymized usage only; no prompt content.</p>
            </Section>

            <Section title="Your data is not sold">
              <p className="body">We do not sell, rent, or trade your personal data or prompt content to any third party.</p>
            </Section>

            <Section title="API keys are server-only">
              <p className="body">AI provider keys are stored as server-side environment variables. They are never exposed to the browser, logged, or stored in the database.</p>
            </Section>

            <Section title="Deleting your data">
              <p className="body">You can delete any saved prompt from the builder or history page. Deleted prompts are removed from the database immediately. To delete your account and all associated data, email <a href="mailto:umpromptsupport@gmail.com">umpromptsupport@gmail.com</a>.</p>
            </Section>

            <Section title="Cookies and sessions">
              <p className="body">We use Supabase Auth. Session tokens are stored in secure, HTTP-only cookies. We do not use third-party advertising or tracking cookies.</p>
            </Section>

            <Section title="Browser extension">
              <p className="body">The extension stores its sign-in session and unfinished prompt draft in the browser’s local extension storage. Drafts are separate from saved account history. Signing out through the extension removes its current account session and that account’s local draft, but does not delete saved website history.</p>
              <p className="body">The extension does not automatically read webpages, browsing history, or the clipboard. It processes text you type or paste into its panel, and writes a prompt to the clipboard only when you choose Copy.</p>
            </Section>

            <Section title="Data storage">
              <p className="body">Your data is stored in a Supabase-hosted Postgres database. Row-level security policies ensure that each user can only access their own data. Data is encrypted at rest and in transit.</p>
            </Section>

            <Section title="Changes to this policy">
              <p className="body">If we make material changes, we will update the date above. Continued use after changes constitutes acceptance.</p>
            </Section>

            <div className="composer__actions">
              <Link href="/privacy">Privacy policy</Link>
              <Link href="/terms">Terms of service</Link>
            </div>

            <Section title="Contact">
              <p className="body">Questions? Email <a href="mailto:umpromptsupport@gmail.com">umpromptsupport@gmail.com</a>.</p>
            </Section>
          </article>
        </div>
      </main>
      <Footer strip />
    </>
  );
}
