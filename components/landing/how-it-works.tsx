"use client";

import { useState } from "react";

const STEPS = [
  {
    word: "First",
    title: "The rough version",
    body: "You type what you would say out loud. No prompt syntax, no role, no “act as an expert”. The first version is allowed to be messy.",
    quote: "Plan my week.",
    note: "The request as it arrives.",
  },
  {
    word: "Then",
    title: "Only what is missing",
    body: "If the idea is ambiguous, Umprompt asks up to two questions. If it is clear, it proceeds. You are never asked to fill in a template for its own sake.",
    quote: "I have four deadlines and two school runs. Mornings are impossible.",
    note: "Only the missing detail is asked for.",
  },
  {
    word: "Finally",
    title: "The prompt",
    body: "A clear request with a task, context, limits, and an output shape. It is read-only until you choose Edit, and it is saved only when you choose Save.",
    prompt: {
      task: "A seven-day plan with fixed blocks and two buffers.",
      context: "Four deadlines, two school runs, limited morning focus.",
      constraints: "Do not move the school runs. Leave one rest day in each week.",
      output: "A day-by-day table with blocks, buffers, and one fallback.",
    },
    note: "Paste it into any assistant.",
  },
];

export function HowItWorks() {
  const [active, setActive] = useState(0);
  const step = STEPS[active];

  return (
    <div className="how-layout">
      <div className="how-tabs" role="tablist" aria-label="How it works">
        {STEPS.map((item, index) => (
          <button
            key={item.title}
            type="button"
            role="tab"
            aria-selected={active === index}
            className="how-tab"
            onClick={() => setActive(index)}
          >
            <span className="how-tab__word">{item.word}</span>
            <span className="how-tab__title">{item.title}</span>
          </button>
        ))}
      </div>

      <article className="how-panel" key={step.title} aria-live="polite" data-ui>
        <h3>{step.title}</h3>
        <p className="body">{step.body}</p>
        {step.prompt ? (
          <div className="how-prompt" data-ui>
            <div className="how-prompt__row"><span>Task</span><p>{step.prompt.task}</p></div>
            <div className="how-prompt__row"><span>Context</span><p>{step.prompt.context}</p></div>
            <div className="how-prompt__row"><span>Constraints</span><p>{step.prompt.constraints}</p></div>
            <div className="how-prompt__row"><span>Output</span><p>{step.prompt.output}</p></div>
          </div>
        ) : (
          <blockquote className="how-quote">“{step.quote}”</blockquote>
        )}
        <p className="small muted">{step.note}</p>
      </article>
    </div>
  );
}
