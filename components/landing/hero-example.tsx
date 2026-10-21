"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/system/button";

const EXAMPLES = [
  {
    label: "Plan my week",
    category: "daily",
    score: 88,
    idea: "Plan my week. I have four deadlines and two school runs.",
    task: "Build a seven-day plan with fixed work blocks and two buffers.",
    context: "Four deadlines, two school runs, limited morning focus.",
    constraints: "Keep the plan realistic. Do not move the school runs.",
    output: "A day-by-day table with blocks, buffers, and one fallback.",
  },
  {
    label: "Write a launch email",
    category: "writing",
    score: 86,
    idea: "Write a launch email for our new study app, for students, keep it short.",
    task: "Write a launch email for a study app aimed at students.",
    context: "Students, first release, short attention, no existing list.",
    constraints: "Short. No hype. One clear action.",
    output: "A subject line and a 120-word email.",
  },
  {
    label: "Debug a function",
    category: "coding",
    score: 91,
    idea: "Debug this React hook. It re-renders on every keystroke and loses focus.",
    task: "Find the cause of the re-render and the focus loss.",
    context: "React 18, a controlled input, a hook that returns a new object each render.",
    constraints: "Do not rewrite the component. Show the smallest fix.",
    output: "The cause, the patch, and a one-line test.",
  },
];

export function HeroExample() {
  const router = useRouter();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(media.matches);
    const onChange = () => setReduced(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (paused || reduced) return;
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % EXAMPLES.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [paused, reduced]);

  const example = EXAMPLES[active];

  function start() {
    try {
      sessionStorage.setItem(
        "ump:idea_draft",
        JSON.stringify({ idea: example.idea, context: { universal: true, category: example.category } })
      );
    } catch {
      // Storage can be blocked; the builder still opens.
    }
    router.push("/builder");
  }

  return (
    <div
      className="hero-example"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="hero-example__tabs" role="tablist" aria-label="Examples">
        {EXAMPLES.map((item, index) => (
          <button
            key={item.label}
            type="button"
            role="tab"
            aria-selected={active === index}
            className="hero-example__tab"
            onClick={() => setActive(index)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <article className="hero-example__paper" data-ui aria-live="polite" key={example.label}>
        <div className="hero-example__top">
          <div>
            <p className="hero-example__label">The rough version</p>
            <p className="hero-example__idea">“{example.idea}”</p>
          </div>
          <div className="hero-example__score" aria-label={`Score ${example.score}`}>
            {example.score}
          </div>
        </div>

        <dl className="hero-example__doc">
          <div className="hero-example__section">
            <dt>Task</dt>
            <dd>{example.task}</dd>
          </div>
          <div className="hero-example__section">
            <dt>Context</dt>
            <dd>{example.context}</dd>
          </div>
          <div className="hero-example__section">
            <dt>Constraints</dt>
            <dd>{example.constraints}</dd>
          </div>
          <div className="hero-example__section">
            <dt>Output</dt>
            <dd>{example.output}</dd>
          </div>
        </dl>

        <div className="hero-example__actions">
          <Button variant="accent" size="sm" onClick={start}>Build this prompt</Button>
          <span className="hero-example__hint">Or start with your own idea</span>
        </div>
      </article>
    </div>
  );
}
