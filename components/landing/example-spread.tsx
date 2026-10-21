"use client";

import { useState } from "react";

const EXAMPLES = [
  {
    label: "Study plan",
    idea: "“Make a study plan for my history exam. I have two weeks and I keep getting distracted.”",
    hint: "No prompt knowledge. No template. Just the request as it arrives.",
    prompt: {
      task: "Build a two-week study schedule for a history exam.",
      context: "A student with two weeks, limited focus, and a large body of material.",
      constraints: "Use only the material supplied. Keep sessions under forty minutes. Leave one rest day in each week.",
      output: "A day-by-day table with the topic, the activity, and the time. Add a short note on what to do when focus drops.",
    },
  },
  {
    label: "Launch email",
    idea: "“Write a launch email for our new study app, for students, keep it short.”",
    hint: "A sentence with a job to do. The structure is added around it.",
    prompt: {
      task: "Write a launch email for a study app aimed at students.",
      context: "First release, student audience, no existing mailing list.",
      constraints: "Keep it short. No hype. One clear action.",
      output: "A subject line and a 120-word email that sounds like a person wrote it.",
    },
  },
];

export function ExampleSpread() {
  const [active, setActive] = useState(0);
  const example = EXAMPLES[active];

  return (
    <div className="example-spread">
      <div className="example-tabs" role="tablist" aria-label="Examples">
        {EXAMPLES.map((item, index) => (
          <button
            key={item.label}
            type="button"
            role="tab"
            aria-selected={active === index}
            className="example-tab"
            onClick={() => setActive(index)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="split" key={example.label}>
        <div className="split__page split__page--dark">
          <p className="split__text">{example.idea}</p>
          <p className="split__hint">{example.hint}</p>
        </div>
        <div className="split__page split__page--light">
          <div className="prompt-doc" style={{ padding: 0 }} data-ui>
            <div className="prompt-doc__section">
              <span className="prompt-doc__label">Task</span>
              <p>{example.prompt.task}</p>
            </div>
            <div className="prompt-doc__section">
              <span className="prompt-doc__label">Context</span>
              <p>{example.prompt.context}</p>
            </div>
            <div className="prompt-doc__section">
              <span className="prompt-doc__label">Constraints</span>
              <p>{example.prompt.constraints}</p>
            </div>
            <div className="prompt-doc__section">
              <span className="prompt-doc__label">Output</span>
              <p>{example.prompt.output}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
