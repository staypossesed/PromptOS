import Link from "next/link";
import { Nav } from "@/components/system/nav";
import { Footer } from "@/components/system/footer";
import { ButtonLink } from "@/components/system/button";
import { Reveal } from "@/components/system/reveal";
import { PageViewTracker } from "@/components/system/page-view-tracker";
import { ScrollProgress } from "@/components/system/scroll-progress";
import { LiveSheet } from "@/components/landing/live-sheet";
import { ExampleSpread } from "@/components/landing/example-spread";
import { BuilderPanel } from "@/components/landing/builder-panel";
import { Marquee } from "@/components/landing/marquee";
import { checkoutPrice } from "@/lib/checkout";

function dollars(cents: number) {
  return `$${(cents / 100).toFixed(2).replace(/\.00$/, "")}`;
}

export default function LandingPage() {
  return (
    <>
      <PageViewTracker event="landing_view" />
      <ScrollProgress />
      <Nav />
      <main id="main">
        <section className="hero">
          <div className="wrap hero__grid">
            <Reveal className="hero__copy">
              <h1 className="hero__title">
                <span>Say it rough.</span>
                <span>We&apos;ll make it precise.</span>
              </h1>
              <p className="lead">
                A rough idea becomes a clear prompt for any assistant. You bring the thought;
                we shape it.
              </p>
              <div className="hero__action">
                <ButtonLink href="/builder" variant="accent">Start with an idea</ButtonLink>
                <a href="#how" className="link-arrow">See how it works</a>
              </div>
              <p className="small muted">7 free prompts a week · No card to start</p>
            </Reveal>
            <Reveal delay={90}>
              <LiveSheet />
            </Reveal>
          </div>
        </section>

        <Marquee items={["Writing", "Coding", "Research", "Everyday", "Business", "Creative"]} />

        <section className="band band--tight" id="product">
          <div className="wrap">
            <Reveal>
              <div className="section-head">
                <h2>One sentence in.<br />One usable prompt out.</h2>
                <p className="body">
                  The rough version is not a draft to be ashamed of. It is the material.
                  Umprompt keeps your meaning, adds the context the request was missing, and
                  returns a prompt you can paste anywhere.
                </p>
              </div>
            </Reveal>
            <Reveal>
              <ExampleSpread />
            </Reveal>
          </div>
        </section>

        <section className="band band--surface" id="how">
          <div className="wrap">
            <Reveal>
              <div className="section-head">
                <h2>Three exchanges.</h2>
                <p className="body">
                  The whole product is a short conversation: the rough version, the missing
                  detail, the finished prompt.
                </p>
              </div>
            </Reveal>
            <div className="exchanges">
              <Reveal className="exchange">
                <p className="exchange__label">First, the rough version.</p>
                <p className="body">
                  You type what you would say out loud. No prompt syntax, no role, no “act as
                  an expert”. The first version is allowed to be messy.
                </p>
                <div className="exchange__call">“Plan my week.”</div>
              </Reveal>
              <Reveal className="exchange" delay={70}>
                <p className="exchange__label">Then, only what is missing.</p>
                <p className="body">
                  If the idea is ambiguous, Umprompt asks up to two questions. If it is clear,
                  it proceeds. You are never asked to fill in a template for its own sake.
                </p>
                <div className="exchange__call">
                  “I have four deadlines and two school runs. Mornings are impossible.”
                </div>
              </Reveal>
              <Reveal className="exchange" delay={140}>
                <p className="exchange__label">Finally, the prompt.</p>
                <p className="body">
                  A clear request with a task, context, limits, and an output shape. It is
                  read-only until you choose Edit, and it is saved only when you choose Save.
                </p>
                <div className="sheet" style={{ background: "var(--paper)" }} data-ui>
                  <div className="prompt-doc__label">Output</div>
                  <p className="body">
                    A seven-day plan with fixed blocks, two buffers, and one sentence on what
                    to move when a day collapses.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        <section className="band band--dark" id="workspace">
          <div className="wrap">
            <Reveal>
              <div className="section-head">
                <h2>A workspace,<br />not a chat box.</h2>
                <p className="body">
                  Every prompt is a document with a score, a history, and a home. The interface
                  keeps the parts you need to see and gets out of the way of the sentence.
                </p>
              </div>
            </Reveal>
            <Reveal>
              <div className="notes">
                <div className="notes__side">
                  <div className="note">
                    <span className="note__name">Task categories</span>
                    <span className="note__text">Writing, coding, research, everyday, business, creative. The suggestion follows the first words of the idea.</span>
                  </div>
                  <div className="note">
                    <span className="note__name">Context profiles</span>
                    <span className="note__text">Save the facts you repeat. Apply them only when you confirm what is shared.</span>
                  </div>
                  <div className="note">
                    <span className="note__name">Prompt packs</span>
                    <span className="note__text">A multi-step task becomes a set of prompts that run in order, not one oversized request.</span>
                  </div>
                </div>
                <BuilderPanel />
                <div className="notes__side notes__side--right">
                  <div className="note">
                    <span className="note__name">Quality score</span>
                    <span className="note__text">Six dimensions: clarity, context, constraints, examples, output format, tool fit. A reading, not a certificate.</span>
                  </div>
                  <div className="note">
                    <span className="note__name">Versions</span>
                    <span className="note__text">Refinements keep the previous prompt. Restore it without losing the current task.</span>
                  </div>
                  <div className="note">
                    <span className="note__name">Library</span>
                    <span className="note__text">Profiles and playbooks live in your account, not in a device-only draft.</span>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="band band--tight" id="pricing">
          <div className="wrap">
            <Reveal>
              <div className="section-head">
                <h2>Free to start.<br />Pro when it earns it.</h2>
                <p className="body">
                  Seven prompts a week are free. Pro is for the weeks when the workspace is
                  the work.
                </p>
              </div>
            </Reveal>
            <Reveal>
              <div className="pricing">
                <div className="price-field price-field--free">
                  <div className="stack">
                    <h2 className="price-field__name">Free</h2>
                    <p className="body">
                      Seven prompts a week. The full composer, the complete score, and your saved
                      history. No card.
                    </p>
                    <p className="plan-list">
                      7 prompts a week · Full composer and score · Saved prompts and history · Templates
                    </p>
                  </div>
                  <div>
                    <div className="price-field__amount">$0</div>
                    <p className="small muted">Every week. No trial clock.</p>
                    <div style={{ marginTop: 18 }}>
                      <ButtonLink href="/builder" variant="ink" size="sm">Start free</ButtonLink>
                    </div>
                  </div>
                </div>
                <div className="price-field price-field--pro">
                  <div className="stack">
                    <h2 className="price-field__name">Pro</h2>
                    <p className="body">
                      Unlimited fair use. Prompt packs, library profiles, playbooks, and the
                      full workspace. Monthly or once.
                    </p>
                    <p className="plan-list">
                      Unlimited fair use · Prompt packs · Profiles and playbooks · Full history
                    </p>
                  </div>
                  <div>
                    <div className="price-field__amount">
                      {dollars(checkoutPrice("monthly", false))}
                    </div>
                    <p className="small">
                      Per month. Or {dollars(checkoutPrice("lifetime", false))} once. Founder
                      price: {dollars(checkoutPrice("monthly", true))} per month or{" "}
                      {dollars(checkoutPrice("lifetime", true))} once, first 100.
                    </p>
                    <div style={{ marginTop: 18 }}>
                      <ButtonLink href="/plan" variant="ink" size="sm">See the plans</ButtonLink>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="band band--surface">
          <div className="wrap">
            <Reveal>
              <div className="faq">
                <div>
                  <h2>Questions,<br />answered plainly.</h2>
                </div>
                <div className="faq__columns">
                  <p className="faq__item"><span className="faq__q">What is Umprompt?</span> It expands a rough idea into a clear, structured prompt for your preferred assistant. It prepares the instructions; it does not answer the task.</p>
                  <p className="faq__item"><span className="faq__q">Do I need to know prompt engineering?</span> No. You write the request the way you would say it. The structure is the product.</p>
                  <p className="faq__item"><span className="faq__q">Which assistants does it work with?</span> Claude, ChatGPT, Cursor, and any assistant that accepts text. The default prompt is portable, not tied to one vendor.</p>
                  <p className="faq__item"><span className="faq__q">How does the score work?</span> Six dimensions get a score out of 100: clarity, context, constraints, examples, output format, and tool fit. It is an estimate, not proof of a better answer.</p>
                  <p className="faq__item"><span className="faq__q">Is my prompt private?</span> Saved prompts live in your account and are protected by row-level security. Analytics events do not include prompt text or profile content.</p>
                  <p className="faq__item"><span className="faq__q">What is a prompt pack?</span> A multi-step task broken into a set of prompts that run in order. Build an app, launch a product, run a research report.</p>
                  <p className="faq__item"><span className="faq__q">What does it cost?</span> Seven prompts a week are free. Pro is {dollars(checkoutPrice("monthly", false))} a month or {dollars(checkoutPrice("lifetime", false))} once, with a founder price for the first 100.</p>
                  <p className="faq__item"><span className="faq__q">Can I edit a saved prompt?</span> Yes. Open it from the dashboard or history, choose Edit, make the change, and save a new version.</p>
                  <p className="faq__item"><span className="faq__q">Does it work in other languages?</span> The generator follows the language of your idea. The interface copy is English in this pass; Spanish and Russian dictionaries remain for the next pass.</p>
                  <p className="faq__item"><span className="faq__q">What happens when I run out?</span> The composer offers an upgrade after a copy or save when two or fewer free prompts remain. Your task stays in place.</p>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="close-field">
          <div className="wrap">
            <Reveal>
              <h2 className="close-field__title">Start with the rough version.</h2>
            </Reveal>
            <Reveal className="close-field__row" delay={80}>
              <p className="lead" style={{ maxWidth: "30ch" }}>
                The first seven prompts are free. No card. No prompt engineering.
              </p>
              <ButtonLink href="/builder" variant="accent">Start with an idea</ButtonLink>
            </Reveal>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
