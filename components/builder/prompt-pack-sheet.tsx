"use client";

import type { PromptPack } from "@/types/prompt-pack";
import { Button } from "@/components/system/button";

export function PromptPackSheet({
  pack,
  isGenerating,
  error,
  onCopied,
}: {
  pack: PromptPack | null;
  isGenerating?: boolean;
  error?: string | null;
  onCopied?: () => void;
}) {
  if (error) {
    return (
      <section className="sheet">
        <h2 className="sheet__title">The pack could not be generated</h2>
        <p className="body" style={{ marginTop: 12 }}>{error}</p>
      </section>
    );
  }

  if (!pack) {
    return (
      <section className="sheet">
        <h2 className="sheet__title">{isGenerating ? "Writing the pack" : "A pack appears here."}</h2>
        <p className="body" style={{ marginTop: 12 }}>
          A prompt pack breaks a multi-step task into prompts that run in order. It is included
          with Pro.
        </p>
      </section>
    );
  }

  return (
    <section className="stack--loose stack" data-ui>
      <div className="sheet">
        <div className="sheet__head">
          <h2 className="sheet__title">{pack.title}</h2>
          <span className="sheet__meta">{pack.prompts.length} prompts</span>
        </div>
      </div>
      {pack.prompts.map((prompt, index) => (
        <article className="sheet" key={`${prompt.title}-${index}`}>
          <div className="sheet__head">
            <h3 className="sheet__title">{prompt.title}</h3>
            <span className="sheet__meta">{prompt.target_tool}</span>
          </div>
          <div className="prompt-doc__body">{prompt.prompt_text}</div>
          <div className="prompt-doc__actions">
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(prompt.prompt_text);
                  onCopied?.();
                } catch {}
              }}
            >
              Copy
            </Button>
          </div>
        </article>
      ))}
    </section>
  );
}
