"use client";

import { useState } from "react";
import type { PromptContext } from "@/types/prompt";

const FIELDS = [
  { key: "projectType", label: "Project type", placeholder: "e.g. Next.js 15 + Supabase SaaS", multiline: false },
  { key: "audience", label: "Audience", placeholder: "Who is this for?", multiline: false },
  { key: "constraints", label: "Constraints", placeholder: "What must stay true? What should be avoided?", multiline: true },
  { key: "outputFormat", label: "Output format", placeholder: "e.g. a table, a short email, a step list", multiline: false },
  { key: "examples", label: "Examples", placeholder: "One example of the result you want", multiline: true },
] as const;

export function ContextFields({
  value,
  onChange,
}: {
  value: PromptContext;
  onChange: (next: PromptContext) => void;
}) {
  const [open, setOpen] = useState(false);
  const filled = FIELDS.filter((field) => Boolean(value[field.key]?.trim())).length;

  return (
    <div>
      <button
        type="button"
        className="button button--ghost button--small"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {open ? "Hide context" : filled ? `Context · ${filled} filled` : "Add context"}
      </button>
      {open ? (
        <div className="stack" style={{ marginTop: 14 }}>
          {FIELDS.map((field) => (
            <div className="field" key={field.key}>
              <label className="field__label" htmlFor={`context-${field.key}`}>{field.label}</label>
              {field.multiline ? (
                <textarea
                  id={`context-${field.key}`}
                  className="field__textarea"
                  rows={3}
                  placeholder={field.placeholder}
                  value={value[field.key] ?? ""}
                  onChange={(event) => onChange({ ...value, [field.key]: event.target.value })}
                />
              ) : (
                <input
                  id={`context-${field.key}`}
                  className="field__input"
                  placeholder={field.placeholder}
                  value={value[field.key] ?? ""}
                  onChange={(event) => onChange({ ...value, [field.key]: event.target.value })}
                />
              )}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
