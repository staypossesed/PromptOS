"use client";

import { useState } from "react";
import Link from "next/link";

const ITEMS = [
  { q: "What is Umprompt?", a: "It expands a rough idea into a clear, structured prompt for your preferred assistant. It prepares the instructions; it does not answer the task." },
  { q: "Do I need to know prompt engineering?", a: "No. You write the request the way you would say it. The structure is the product." },
  { q: "Which assistants does it work with?", a: "Claude, ChatGPT, Cursor, and any assistant that accepts text. The default prompt is portable, not tied to one vendor." },
  { q: "How does the score work?", a: "Six dimensions get a score out of 100: clarity, context, constraints, examples, output format, and tool fit. It is an estimate, not proof of a better answer." },
  { q: "Is my prompt private?", a: "Saved prompts live in your account and are protected by row-level security. Analytics events do not include prompt text or profile content." },
  { q: "What is a prompt pack?", a: "A multi-step task broken into a set of prompts that run in order. Build an app, launch a product, run a research report." },
  { q: "What does it cost?", a: "Seven prompts a week are free. Pro removes the weekly limit and adds prompt packs, profiles, playbooks, and the full workspace." },
  { q: "Can I edit a saved prompt?", a: "Yes. Open it from the dashboard or history, choose Edit, make the change, and save. The previous version stays in the prompt’s history." },
];

export function Faq() {
  const [active, setActive] = useState(0);
  const item = ITEMS[active];

  return (
    <div className="faq-layout">
      <div className="faq-list" role="tablist" aria-label="Questions">
        {ITEMS.map((entry, index) => (
          <button
            key={entry.q}
            type="button"
            role="tab"
            aria-selected={active === index}
            className="faq-question"
            onClick={() => setActive(index)}
          >
            {entry.q}
            {active === index ? (
              <span className="faq-inline-answer">
                <span className="body">{entry.a}</span>
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <article className="faq-answer" key={item.q} aria-live="polite">
        <h3>{item.q}</h3>
        <p className="body">{item.a}</p>
        <Link href="/help" className="link-arrow">More in Help</Link>
      </article>
    </div>
  );
}
