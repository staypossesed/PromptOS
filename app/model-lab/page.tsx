"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/system/button";
import { track } from "@/lib/analytics";
import type { ToolId } from "@/lib/mock-data";
import type { ModelLabResult, ModelComparisonSummary } from "@/types/model-comparison";
import { WINNER_REASONS } from "@/types/model-comparison";

const MODELS = [
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", provider: "Anthropic", cost: "$3 / $15 per MTok", defaultChecked: true },
  { id: "claude-haiku-4-5", label: "Claude Haiku 4.5", provider: "Anthropic", cost: "$1 / $5 per MTok", defaultChecked: false },
  { id: "moonshotai/kimi-k2.6", label: "Kimi K2.6", provider: "OpenRouter", cost: "$0.74 / $3.49 per MTok", defaultChecked: true },
];

const TOOLS: { id: ToolId; label: string }[] = [
  { id: "claude", label: "Claude" },
  { id: "cursor", label: "Cursor" },
  { id: "chatgpt", label: "ChatGPT" },
];

export default function ModelLabPage() {
  const router = useRouter();
  const [idea, setIdea] = useState("");
  const [tool, setTool] = useState<ToolId>("cursor");
  const [selectedModels, setSelectedModels] = useState<string[]>(MODELS.filter((model) => model.defaultChecked).map((model) => model.id));
  const [results, setResults] = useState<ModelLabResult[] | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comparisonId, setComparisonId] = useState<string | null>(null);
  const [winnerModel, setWinnerModel] = useState<string | null>(null);
  const [winnerReason, setWinnerReason] = useState<string | null>(null);
  const [history, setHistory] = useState<ModelComparisonSummary[] | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      const response = await fetch("/api/model-lab/comparisons");
      if (response.ok) {
        const json = await response.json();
        setHistory(json.data ?? []);
      }
    } catch {
      // Best effort.
    }
  }, []);

  useEffect(() => {
    track("model_lab_opened");
    void loadHistory();
  }, [loadHistory]);

  async function compare() {
    if (!idea.trim() || !selectedModels.length || isComparing) return;
    setIsComparing(true);
    setError(null);
    setResults(null);
    setComparisonId(null);
    setWinnerModel(null);
    setWinnerReason(null);
    try {
      const response = await fetch("/api/model-lab/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, target_tool: tool, models: selectedModels }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Comparison failed.");
      const data: ModelLabResult[] = json.data ?? [];
      setResults(data);
      track("model_comparison_run", { models_compared: selectedModels.join(","), model_count: selectedModels.length });
      const saved = await fetch("/api/model-lab/comparisons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, target_tool: tool, models_compared: selectedModels, results: data }),
      });
      if (saved.ok) {
        const savedJson = await saved.json();
        if (savedJson.data?.id) setComparisonId(savedJson.data.id);
      }
      void loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Comparison failed.");
    } finally {
      setIsComparing(false);
    }
  }

  async function chooseWinner(result: ModelLabResult) {
    if (!comparisonId || !winnerReason) {
      setToast("Choose a reason first.");
      return;
    }
    try {
      const response = await fetch(`/api/model-lab/comparisons/${comparisonId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ winner_model: result.model, winner_reason: winnerReason }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Could not save the winner.");
      setWinnerModel(result.model);
      setToast("Winner saved.");
      void loadHistory();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Could not save the winner.");
    }
  }

  function sendOutputToBuilder(result: ModelLabResult) {
    try {
      sessionStorage.setItem("ump:lab_output", JSON.stringify({
        idea,
        tool,
        generatedPrompt: result.output,
        score: result.score,
        model: result.model,
        source: "model-lab",
      }));
    } catch {
      // Ignore storage.
    }
    track("model_output_used", { selected_model: result.model });
    router.push("/builder");
  }

  return (
    <div className="wrap" style={{ paddingBlock: "clamp(24px, 4vw, 56px)" }}>
      <header className="app-head">
        <div className="stack">
          <p className="small muted">Admin / Model lab</p>
          <h1 className="app-head__title">Model lab.</h1>
          <p className="app-head__sub">Compare prompt output across models. The score is a reading, not a verdict.</p>
        </div>
      </header>

      <section className="sheet" data-ui>
        <div className="stack">
          <div className="field">
            <label className="field__label" htmlFor="lab-idea">The task</label>
            <textarea id="lab-idea" className="field__textarea" rows={4} value={idea} onChange={(event) => setIdea(event.target.value.slice(0, 4000))} placeholder="A task that shows the difference between models." />
          </div>
          <div className="field">
            <span className="field__label">Target assistant</span>
            <div className="composer__chips">
              {TOOLS.map((item) => (
                <button key={item.id} type="button" className="composer__chip" aria-pressed={tool === item.id} onClick={() => setTool(item.id)}>{item.label}</button>
              ))}
            </div>
          </div>
          <div className="field">
            <span className="field__label">Models</span>
            <div className="stack">
              {MODELS.map((model) => (
                <label key={model.id} className="account-row" style={{ cursor: "pointer" }}>
                  <span>
                    <input
                      type="checkbox"
                      checked={selectedModels.includes(model.id)}
                      onChange={(event) => setSelectedModels((current) => event.target.checked ? [...current, model.id] : current.filter((id) => id !== model.id))}
                    />{" "}
                    {model.label}
                  </span>
                  <span className="small muted">{model.provider} · {model.cost}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="composer__actions">
            <Button variant="accent" onClick={compare} disabled={isComparing || !idea.trim() || !selectedModels.length}>
              {isComparing ? "Comparing" : "Run comparison"}
            </Button>
            <span className="composer__hint">10 comparisons per day.</span>
          </div>
          {error ? <p className="field__error">{error}</p> : null}
        </div>
      </section>

      {results ? (
        <section style={{ marginTop: 40 }}>
          <div className="sheet__head">
            <h2 className="sheet__title">Results</h2>
            <div className="composer__actions">
              <select className="field__select" style={{ maxWidth: 220 }} value={winnerReason ?? ""} onChange={(event) => setWinnerReason(event.target.value || null)}>
                <option value="">Reason for the winner</option>
                {WINNER_REASONS.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
              </select>
            </div>
          </div>
          <div className="grid-2" style={{ marginTop: 20 }}>
            {results.map((result) => (
              <article className="sheet" key={result.model} data-ui>
                <div className="sheet__head">
                  <h3 className="sheet__title">{result.displayName || result.model}</h3>
                  <span className="sheet__meta">{result.score?.overall ?? "–"} / 100</span>
                </div>
                <p className="small muted">
                  {result.latencyMs}ms
                  {result.estimatedCostUSD != null ? ` · $${result.estimatedCostUSD.toFixed(4)}` : ""}
                </p>
                {result.error ? <p className="field__error">{result.error}</p> : <pre className="prompt-doc__body" style={{ marginTop: 14, whiteSpace: "pre-wrap" }}>{result.output}</pre>}
                <div className="composer__actions" style={{ marginTop: 16 }}>
                  <Button size="sm" variant="ghost" onClick={async () => { if (result.output) { await navigator.clipboard.writeText(result.output); setCopied(result.model); window.setTimeout(() => setCopied(null), 1500); } }}>{copied === result.model ? "Copied" : "Copy"}</Button>
                  <Button size="sm" variant="ghost" onClick={() => sendOutputToBuilder(result)} disabled={!result.output}>Use this output</Button>
                  <Button size="sm" variant="ghost" onClick={() => chooseWinner(result)} disabled={!comparisonId || !winnerReason || winnerModel === result.model}>{winnerModel === result.model ? "Winner" : "Pick as winner"}</Button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section style={{ marginTop: 48 }}>
        <h2 className="sheet__title">History</h2>
        {history === null ? <p className="body muted">Loading.</p> : null}
        {history && !history.length ? <p className="body muted">No comparisons yet.</p> : null}
        <div className="stack--loose stack" style={{ marginTop: 16 }}>
          {(history ?? []).map((item) => (
            <article className="sheet" key={item.id}>
              <div className="sheet__head">
                <span className="sheet__meta">{new Date(item.created_at).toLocaleString()} · {item.target_tool}</span>
                <span className="sheet__meta">{item.winner_model ? `Winner: ${item.winner_model}` : "No winner"}</span>
              </div>
              <p className="body">{item.idea}</p>
              <p className="small muted" style={{ marginTop: 8 }}>
                {item.models_compared.join(" · ")}
                {item.winner_reason ? ` · ${item.winner_reason}` : ""}
              </p>
            </article>
          ))}
        </div>
      </section>

      {toast ? <div className="toast" role="status">{toast}</div> : null}
    </div>
  );
}
