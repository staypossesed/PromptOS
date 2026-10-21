"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { ContextProfile, Playbook, WorkspaceItem } from "@/lib/workspace";
import type { PromptContext } from "@/types/prompt";
import { Button } from "@/components/system/button";

export function LibraryPanel({
  idea,
  context,
  busy,
  onPlaybook,
  onContextChange,
  playbookId,
  profileId,
}: {
  idea: string;
  context: PromptContext;
  busy: boolean;
  onPlaybook: (playbook: Playbook) => boolean;
  onContextChange: (context: PromptContext) => void;
  playbookId?: string | null;
  profileId?: string | null;
}) {
  const [items, setItems] = useState<WorkspaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<(ContextProfile & { id: string; name: string }) | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const appliedPlaybook = useRef<string | null>(null);
  const reviewedProfile = useRef<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch("/api/workspace", { signal: controller.signal })
      .then((response) => response.json())
      .then((json: { data?: WorkspaceItem[]; error?: string }) => {
        if (json.error) setError(json.error);
        else setItems(json.data ?? []);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError("Could not load your library.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!playbookId || loading || appliedPlaybook.current === playbookId) return;
    const item = items.find((entry) => entry.kind === "playbook" && entry.id === playbookId);
    appliedPlaybook.current = playbookId;
    if (item?.kind === "playbook") onPlaybook(item.payload);
  }, [playbookId, loading, items, onPlaybook]);

  useEffect(() => {
    if (!profileId || loading || reviewedProfile.current === profileId) return;
    const item = items.find((entry) => entry.kind === "profile" && entry.id === profileId);
    reviewedProfile.current = profileId;
    if (item?.kind === "profile") setReview({ ...item.payload, id: item.id, name: item.name });
  }, [profileId, loading, items]);

  const profiles = items.filter((item) => item.kind === "profile");
  const playbooks = items.filter((item) => item.kind === "playbook");

  async function savePlaybook(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    setNotice("");
    try {
      const response = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "playbook", name, payload: { idea, context } }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Could not save the playbook.");
      setItems((current) => [json.data, ...current]);
      setName("");
      setSaveOpen(false);
      setNotice("Playbook saved.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not save the playbook.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="sheet sheet--surface" data-ui aria-label="Library">
      <div className="sheet__head">
        <h2 className="sheet__title">Library</h2>
        <Link href="/library" className="small">Manage</Link>
      </div>

      {error ? <p className="field__error">{error}</p> : null}
      {loading ? <p className="small muted">Loading your profiles and playbooks.</p> : null}

      <div className="stack">
        <div className="field">
          <label className="field__label" htmlFor="profile-picker">Context profile</label>
          <select
            id="profile-picker"
            className="field__select"
            value={context.profile?.id ?? ""}
            disabled={loading || busy}
            onChange={(event) => {
              if (!event.target.value) {
                onContextChange({ ...context, profile: undefined, profileConsent: false });
                return;
              }
              const item = items.find((entry) => entry.id === event.target.value);
              if (item?.kind === "profile") setReview({ ...item.payload, id: item.id, name: item.name });
            }}
          >
            <option value="">No profile</option>
            {profiles.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="field__label" htmlFor="playbook-picker">Playbook</label>
          <select
            id="playbook-picker"
            className="field__select"
            value=""
            disabled={loading || busy}
            onChange={(event) => {
              const item = items.find((entry) => entry.id === event.target.value);
              if (item?.kind === "playbook") onPlaybook(item.payload);
            }}
          >
            <option value="">Apply a playbook</option>
            {playbooks.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </div>

        <div className="composer__actions">
          <Button size="sm" variant="ghost" disabled={busy || !idea.trim()} onClick={() => { setSaveOpen((open) => !open); setName(idea.slice(0, 60)); }}>
            Save this task as a playbook
          </Button>
        </div>

        {saveOpen ? (
          <form className="stack" onSubmit={savePlaybook}>
            <label className="field__label" htmlFor="playbook-name">Playbook name</label>
            <input
              id="playbook-name"
              className="field__input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              required
            />
            <div className="composer__actions">
              <Button size="sm" type="submit" disabled={saving}>Save</Button>
              <Button size="sm" type="button" variant="ghost" onClick={() => setSaveOpen(false)}>Cancel</Button>
            </div>
          </form>
        ) : null}
        {notice ? <p className="small muted" role="status">{notice}</p> : null}
      </div>

      {review ? (
        <div className="sheet" style={{ marginTop: 20 }}>
          <div className="sheet__head">
            <h3 className="sheet__title">{review.name}</h3>
            <span className="sheet__meta">Preview</span>
          </div>
          <p className="small muted" style={{ marginBottom: 12 }}>
            Applying this profile sends these details to the AI provider when you generate.
            Only this snapshot is shared. Playbooks do not embed profiles.
          </p>
          <dl className="stack">
            {(["details", "audience", "voice", "constraints"] as const).map((key) =>
              review[key] ? (
                <div key={key}>
                  <dt className="field__label">{key}</dt>
                  <dd className="body">{review[key]}</dd>
                </div>
              ) : null
            )}
          </dl>
          <div className="composer__actions">
            <Button
              size="sm"
              onClick={() => {
                onContextChange({
                  ...context,
                  profile: { ...review },
                  profileConsent: true,
                });
                setReview(null);
              }}
            >
              Apply profile
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setReview(null)}>Cancel</Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
