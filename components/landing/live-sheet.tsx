"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/system/button";
import { inferTaskCategory } from "@/lib/idea-suggestions";

const EXAMPLE = "write a launch email for our new study app, for students, keep it short";

const DIMENSIONS = [
  { key: "clarity", label: "Clarity" },
  { key: "context", label: "Context" },
  { key: "constraints", label: "Constraints" },
  { key: "examples", label: "Examples" },
  { key: "format", label: "Output format" },
  { key: "tool", label: "Tool fit" },
] as const;

type DimensionKey = (typeof DIMENSIONS)[number]["key"];

function analyse(idea: string): Record<DimensionKey, { ok: boolean; note: string }> {
  const text = idea.toLowerCase();
  const words = text.match(/[\p{L}\p{N}]+/gu) ?? [];
  const has = (pattern: RegExp) => pattern.test(text);
  return {
    clarity: {
      ok: words.length >= 4,
      note: words.length >= 4 ? "The action and the subject are both present." : "Name the action and the thing it applies to.",
    },
    context: {
      ok: has(/\b(for|about|my|our|students|team|customers|audience|because)\b/) || words.length >= 12,
      note: has(/\b(for|about|my|our|students|team|customers|audience|because)\b/) || words.length >= 12
        ? "The audience or situation is stated."
        : "Say who this is for, or what situation it belongs to.",
    },
    constraints: {
      ok: has(/\b(short|brief|only|must|avoid|without|max|under|no more|don't|do not|keep)\b/),
      note: has(/\b(short|brief|only|must|avoid|without|max|under|no more|don't|do not|keep)\b/)
        ? "A limit is set, so the answer has a shape."
        : "Add one limit: length, tone, or something to avoid.",
    },
    examples: {
      ok: has(/\b(like|example|e\.g\.|similar|such as)\b/),
      note: has(/\b(like|example|e\.g\.|similar|such as)\b/)
        ? "A reference point is supplied."
        : "Optional: name one example of the result you want.",
    },
    format: {
      ok: has(/\b(list|table|email|plan|steps|outline|paragraph|bullet|json|subject line|headline)\b/),
      note: has(/\b(list|table|email|plan|steps|outline|paragraph|bullet|json|subject line|headline)\b/)
        ? "The expected output is named."
        : "Say what form the answer should take.",
    },
    tool: {
      ok: true,
      note: "Portable. Paste the result into any assistant.",
    },
  };
}

export function LiveSheet() {
  const router = useRouter();
  const [idea, setIdea] = useState(EXAMPLE);
  const notes = useMemo(() => analyse(idea), [idea]);
  const category = useMemo(() => inferTaskCategory(idea), [idea]);
  const ready = (idea.match(/[\p{L}\p{N}]+/gu) ?? []).length >= 4;

  function start() {
    try {
      sessionStorage.setItem(
        "ump:idea_draft",
        JSON.stringify({ idea, context: { universal: true, category } })
      );
    } catch {
      // Storage can be blocked; the builder still opens.
    }
    router.push("/builder");
  }

  return (
    <div className="hero__sheet">
      <div className="sheet">
        <div className="sheet__head">
          <span className="sheet__meta">Live preview</span>
          <span className="sheet__meta">{category === "auto" ? "Any task" : category}</span>
        </div>

        <label className="field__label" htmlFor="hero-idea">Your rough idea</label>
        <textarea
          id="hero-idea"
          className="field__textarea"
          value={idea}
          onChange={(event) => setIdea(event.target.value.slice(0, 4000))}
          rows={3}
          placeholder="Write the messy version. Umprompt will find the structure."
        />

        <div className="prompt-doc" style={{ marginTop: 20 }} data-ui>
          <div className="prompt-doc__label">The prompt Umprompt would build</div>
          <div className="prompt-doc__section">
            <span className="prompt-doc__label">Task</span>
            <p>{idea.trim() || "Your idea appears here."}</p>
          </div>
          <div className="prompt-doc__section">
            <span className="prompt-doc__label">Context</span>
            <p>
              {notes.context.ok
                ? "Use the audience and situation above. Keep the answer inside that frame."
                : "Add who this is for and what situation it belongs to."}
            </p>
          </div>
          <div className="prompt-doc__section">
            <span className="prompt-doc__label">Constraints</span>
            <p>
              {notes.constraints.ok
                ? "Respect the limits given. Do not invent facts or add claims that were not supplied."
                : "Preserve the facts given. Add no new claims. Keep the answer as short as the task allows."}
            </p>
          </div>
          <div className="prompt-doc__section">
            <span className="prompt-doc__label">Output</span>
            <p>
              {notes.format.ok
                ? "Return the named format, ready to use."
                : "Return one clear answer in the most useful form: a short email, a list, or a plan."}
            </p>
          </div>
        </div>

        <div className="composer__actions" style={{ marginTop: 20 }}>
          <Button variant="accent" onClick={start} disabled={!ready}>
            Open in the builder
          </Button>
          <button type="button" className="button button--ghost button--small" onClick={() => setIdea(EXAMPLE)}>
            Use the example
          </button>
        </div>
        <p className="composer__hint" style={{ marginTop: 12 }}>
          This preview is built in your browser. Generation, scoring, and saving happen after sign-in.
        </p>
      </div>

      <div className="margin-note-list" style={{ marginTop: 16 }}>
        {DIMENSIONS.map((dimension) => {
          const note = notes[dimension.key];
          return (
            <div className="margin-note" key={dimension.key}>
              <span className="margin-note__label">
                {dimension.label} · {note.ok ? "present" : "missing"}
              </span>
              <span className="margin-note__text">{note.note}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
