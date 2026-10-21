import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/system/app-shell";
import { FeedbackDialog } from "@/components/feedback/feedback-dialog";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const FAQS = [
  { q: "What is Umprompt?", a: "Umprompt expands rough ideas into clear, structured prompts for your preferred AI assistant. It prepares the instructions rather than answering the task itself." },
  { q: "How does the score work?", a: "Every generated prompt is scored across six dimensions: clarity, context, constraints, examples, output format, and tool fit. Each gets a score out of 100; the weighted average is the overall score. It is an estimate, not proof of a better answer." },
  { q: "Do I need a particular assistant?", a: "No. The default prompt is portable. Previously saved tool-specific prompts keep their original settings." },
  { q: "Can I edit a saved prompt?", a: "Yes. Open it from the dashboard or history, choose Edit, make the change, and save. The previous version is kept in the prompt’s history." },
  { q: "What does Generate again do?", a: "It runs the generation again with the same idea and tool. The old prompt is replaced, a new score is computed, and the previous result can be restored from the versions list." },
  { q: "How many prompts can I make?", a: "The free plan includes seven prompts a week. Usage resets on a rolling seven-day window. Pro has unlimited fair use." },
  { q: "What is a prompt pack?", a: "A multi-step task broken into prompts that run in order. Prompt packs are part of Pro." },
  { q: "What is a context profile?", a: "A private set of facts you repeat: product, audience, voice, constraints. Applying a profile is a separate, confirmed step. Only the confirmed snapshot is sent to the AI provider." },
  { q: "What is a playbook?", a: "A reusable task with its context. Playbooks do not embed profiles, and applying one never applies a profile automatically." },
  { q: "How do I cancel?", a: "Open the account page and use Manage billing. Monthly plans can cancel future renewals. Lifetime purchases are one payment." },
];

export default async function HelpPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <AppShell>
      <header className="app-head">
        <div className="stack">
          <p className="small muted">Workspace / Help</p>
          <h1 className="app-head__title">Help, plainly.</h1>
          <p className="app-head__sub">
            The whole product in ten answers. If something is missing, send a note.
          </p>
        </div>
        <FeedbackDialog page="/help" label="Send feedback" />
      </header>

      <div className="faq">
        <div className="stack">
          <h2 className="sheet__title">How it works</h2>
          <p className="body">
            Write the rough version. Umprompt asks only what is missing, writes the prompt,
            scores it, and keeps it as a document. You can edit, refine, restore, copy, or save
            it.
          </p>
          <Link href="/builder" className="link-arrow">Open the builder</Link>
        </div>
        <div className="faq__columns">
          {FAQS.map((item) => (
            <p className="faq__item" key={item.q}>
              <span className="faq__q">{item.q}</span> {item.a}
            </p>
          ))}
        </div>
      </div>

      <div className="footer__meta" style={{ color: "var(--muted)", borderTop: 0 }}>
        <Link href="/privacy">Privacy policy</Link>
        <Link href="/terms">Terms of service</Link>
      </div>
    </AppShell>
  );
}
