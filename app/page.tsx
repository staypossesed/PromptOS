import Link from "next/link";
import { Nav } from "@/components/system/nav";
import { Footer } from "@/components/system/footer";
import { ButtonLink } from "@/components/system/button";
import { Reveal } from "@/components/system/reveal";
import { PageViewTracker } from "@/components/system/page-view-tracker";
import { ScrollProgress } from "@/components/system/scroll-progress";
import { HeroExample } from "@/components/landing/hero-example";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Faq } from "@/components/landing/faq";
import { ProPrice } from "@/components/landing/pro-price";
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
              <HeroExample />
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
            <HowItWorks />
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
                  <ProPrice />
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="band band--surface">
          <div className="wrap">
            <Reveal>
              <div className="section-head">
                <h2>Questions,<br />answered plainly.</h2>
                <p className="body">
                  Pick a question. The answer is here, not behind a support form.
                </p>
              </div>
              <Faq />
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
              <ButtonLink href="/builder" variant="ink">Start with an idea</ButtonLink>
            </Reveal>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
