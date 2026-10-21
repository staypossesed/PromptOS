"use client";

import type { PromptScore } from "@/types/prompt";
import { Button } from "@/components/system/button";

export function ScoreMargin({
  score,
  isScoring,
  error,
  onRetry,
  onOptimize,
  isOptimizing,
  optimizeError,
  optimizeDisabled,
}: {
  score: PromptScore | null;
  isScoring?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onOptimize?: () => void;
  isOptimizing?: boolean;
  optimizeError?: string | null;
  optimizeDisabled?: boolean;
}) {
  return (
    <section className="sheet sheet--surface" data-ui aria-label="Prompt score">
      <div className="sheet__head">
        <h2 className="sheet__title">Score</h2>
        {isScoring ? <span className="sheet__meta pending">Scoring</span> : null}
      </div>

      {!score ? (
        <div className="stack">
          <p className="body muted">
            {isScoring
              ? "Reading the prompt across six dimensions."
              : error
              ? error
              : "A score appears after a prompt is generated. It is an estimate, not a certificate."}
          </p>
          {error && onRetry ? <Button size="sm" variant="ghost" onClick={onRetry}>Try scoring again</Button> : null}
        </div>
      ) : (
        <div className="stack--loose stack">
          <div>
            <div className="score__total">{score.overall}</div>
            <p className="small muted">out of 100</p>
          </div>
          <div className="score">
            {score.dimensions.map((dimension) => (
              <div className="score__row" key={dimension.key}>
                <span className="score__name">{dimension.label}</span>
                <span className="score__value">{dimension.score}</span>
                <span className="score__note">{dimension.tip}</span>
              </div>
            ))}
          </div>
          {onOptimize ? (
            <div className="stack">
              <Button size="sm" onClick={onOptimize} disabled={isOptimizing || isScoring || optimizeDisabled}>
                {isOptimizing ? "Optimizing" : "Optimize this prompt"}
              </Button>
              {optimizeError ? <p className="field__error">{optimizeError}</p> : null}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
