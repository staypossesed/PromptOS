"use client";

import { useState } from "react";
import { Button } from "@/components/system/button";
import type { ToolId } from "@/lib/mock-data";

const TOOL_LABEL: Record<ToolId, string> = {
  claude: "Claude",
  cursor: "Cursor",
  chatgpt: "ChatGPT",
};

export function PromptSheet({
  prompt,
  targetTool,
  universal,
  edited,
  isSaved,
  isGenerating,
  isScoring,
  busy,
  onPromptChange,
  onPromptEditEnd,
  onCopied,
  onRegenerate,
}: {
  prompt: string;
  targetTool: ToolId;
  universal?: boolean;
  edited?: boolean;
  isSaved?: boolean;
  isGenerating?: boolean;
  isScoring?: boolean;
  busy?: boolean;
  onPromptChange?: (value: string) => void;
  onPromptEditEnd?: () => void;
  onCopied?: () => void;
  onRegenerate?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const empty = !prompt.trim();

  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      onCopied?.();
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard can be blocked; the prompt remains selectable.
    }
  }

  function download() {
    const blob = new Blob([prompt], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "umprompt.txt";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="sheet" data-ui aria-label="Generated prompt">
      <div className="sheet__head">
        <div>
          <span className="sheet__meta">{universal ? "Portable prompt" : `${TOOL_LABEL[targetTool]} prompt`}</span>
          <h2 className="sheet__title" style={{ marginTop: 8 }}>
            {empty ? "Your prompt appears here." : edited ? "Edited prompt" : "The prompt"}
          </h2>
        </div>
        <span className="sheet__meta">{isSaved ? "Saved" : isGenerating ? "Writing" : isScoring ? "Scoring" : ""}</span>
      </div>

      {empty ? (
        <p className="body muted">
          Start with the rough version on the left. The document will fill in as the prompt is
          generated. Nothing is saved until you choose Save.
        </p>
      ) : editing ? (
        <div className="field">
          <label className="field__label" htmlFor="prompt-edit">Edit the prompt</label>
          <textarea
            id="prompt-edit"
            className="field__textarea"
            style={{ minHeight: 360, fontFamily: "var(--font-text)" }}
            value={prompt}
            onChange={(event) => onPromptChange?.(event.target.value)}
          />
          <div className="composer__actions">
            <Button size="sm" onClick={() => { setEditing(false); onPromptEditEnd?.(); }}>Done</Button>
            <span className="composer__hint">Edits are held here until you save.</span>
          </div>
        </div>
      ) : (
        <div className="prompt-doc__body" aria-live="polite">{prompt}</div>
      )}

      {!empty && !editing ? (
        <div className="prompt-doc__actions">
          <Button size="sm" variant="accent" onClick={copy} disabled={busy}>{copied ? "Copied" : "Copy"}</Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)} disabled={busy}>Edit</Button>
          <Button size="sm" variant="ghost" onClick={download} disabled={busy}>Download</Button>
          <Button size="sm" variant="ghost" onClick={onRegenerate} disabled={busy}>Generate again</Button>
        </div>
      ) : null}
    </section>
  );
}
