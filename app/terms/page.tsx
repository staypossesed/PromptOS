import Link from "next/link";
import { Nav } from "@/components/system/nav";
import { Footer } from "@/components/system/footer";

export const metadata = {
  title: "Terms of service",
  description: "Terms and conditions for using Umprompt.",
};

const LAST_UPDATED = "May 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="stack">
      <h2 style={{ fontSize: "clamp(24px, 2vw, 34px)" }}>{title}</h2>
      <div className="stack">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <>
      <Nav />
      <main id="main" className="wrap band">
        <div className="axis">
          <aside className="axis__side" aria-hidden="true" />
          <article className="axis__main stack--loose stack">
            <h1 style={{ fontSize: "clamp(48px, 6vw, 96px)" }}>Terms of service.</h1>
            <p className="small muted">Last updated: {LAST_UPDATED}</p>
            <p className="lead">The agreement for using Umprompt.</p>

            <Section title="Acceptance">
              <p className="body">By using Umprompt you agree to these terms. If you do not agree, do not use the service. These terms may be updated at any time; continued use constitutes acceptance of the current version.</p>
            </Section>

            <Section title="Service provided as-is">
              <p className="body">Umprompt is provided “as is” without warranties of any kind, express or implied. We do not guarantee that the service will be uninterrupted, error-free, or that AI output will be accurate, complete, or suitable for your specific purpose.</p>
              <p className="body">AI-generated prompts and scores are produced by large language models and may contain inaccuracies, outdated information, or content that requires review before use. Always verify AI output before acting on it.</p>
            </Section>

            <Section title="Your content">
              <p className="body">You own the ideas, context, and prompts you create with Umprompt. We claim no intellectual property rights over your inputs or the AI-generated outputs produced from them.</p>
              <p className="body">By using Umprompt, you grant us a limited license to store and process your content solely to provide the service: display your prompts, run AI generation, and score results.</p>
            </Section>

            <Section title="Acceptable use">
              <p className="body">You agree not to use Umprompt to generate or distribute illegal content, violate any applicable law, attempt to reverse-engineer, scrape, or exploit the service, circumvent usage limits or access controls, or use the service in any way that violates the terms of the underlying AI provider.</p>
            </Section>

            <Section title="Billing">
              <p className="body">Umprompt offers a free plan and paid monthly or lifetime plans. Paid access is confirmed from Stripe’s current payment or subscription state. Monthly plans can cancel future renewals; lifetime purchases are one payment. Prices are shown before checkout.</p>
            </Section>

            <Section title="Limitation of liability">
              <p className="body">To the maximum extent permitted by law, Umprompt and its creators are not liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the service, including any losses resulting from AI-generated content.</p>
            </Section>

            <Section title="Account termination">
              <p className="body">We reserve the right to suspend or terminate accounts that violate these terms, abuse the service, or engage in fraudulent activity, with or without notice. You may delete your account and data at any time by contacting us.</p>
            </Section>

            <Section title="Governing law">
              <p className="body">These terms are governed by applicable law. Any disputes shall be resolved in the jurisdiction where Umprompt operates.</p>
            </Section>

            <div className="composer__actions">
              <Link href="/privacy">Privacy policy</Link>
              <Link href="/terms">Terms of service</Link>
            </div>

            <Section title="Contact">
              <p className="body">Questions? Email <a href="mailto:vanarnold.etsy@gmail.com">vanarnold.etsy@gmail.com</a>.</p>
            </Section>
          </article>
        </div>
      </main>
      <Footer strip />
    </>
  );
}
