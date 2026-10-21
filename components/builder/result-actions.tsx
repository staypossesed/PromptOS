"use client";

import { useState } from "react";
import { REFINEMENTS, type Refinement, type PromptVersion } from "@/lib/workspace";
import { localizedNextSteps } from "@/lib/workspace-next-steps";
import { Button } from "@/components/system/button";

const LABELS: Record<Refinement, string> = {
  shorter: "Make it shorter",
  specific: "Make it more specific",
  steps: "Turn it into steps",
  professional: "Make it more professional",
};

export function ResultActions({
  busy,
  canRefine = true,
  category,
  versions = [],
  onRefine,
  onRestore,
  onNext,
}: {
  busy: boolean;
  canRefine?: boolean;
  category?: string;
  versions?: PromptVersion[];
  onRefine: (action: Refinement) => void;
  onRestore: (version: PromptVersion) => void;
  onNext?: (instruction: string, index: number) => void;
}) {
  const [selected, setSelected] = useState("");
  const version = versions[Number(selected)];

  return (
    <section className="sheet sheet--surface" data-ui aria-label="Refine the prompt">
      <div className="sheet__head">
        <h2 className="sheet__title">Refine</h2>
        <span className="sheet__meta">Uses one prompt</span>
      </div>
      <div className="composer__chips">
        {REFINEMENTS.map((action) => (
          <button
            key={action}
            type="button"
            className="composer__chip"
            disabled={busy || !canRefine}
            onClick={() => onRefine(action)}
          >
            {LABELS[action]}
          </button>
        ))}
      </div>

      {versions.length ? (
        <div className="stack" style={{ marginTop: 20 }}>
          <label className="field__label" htmlFor="version-select">Previous versions</label>
          <select
            id="version-select"
            className="field__select"
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
            disabled={busy}
          >
            <option value="">Current prompt</option>
            {versions.map((item, index) => (
              <option key={`${item.createdAt}-${index}`} value={index}>
                {index + 1}. {item.action} · {new Date(item.createdAt).toLocaleTimeString()}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy || selected === "" || !version}
            onClick={() => { if (version) { onRestore(version); setSelected(""); } }}
          >
            Restore this version
          </Button>
        </div>
      ) : null}

      {onNext ? (
        <div style={{ marginTop: 24 }}>
          <h3 className="sheet__title" style={{ fontSize: 22, marginBottom: 8 }}>What next?</h3>
          <div className="library__list">
            {localizedNextSteps(category, "en").map((label, index) => (
              <button
                key={label}
                type="button"
                className="library__item"
                disabled={busy}
                onClick={() => onNext(label, index)}
              >
                <span className="library__item-name" style={{ fontSize: 17 }}>{label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
