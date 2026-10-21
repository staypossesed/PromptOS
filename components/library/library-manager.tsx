"use client";

import { useEffect, useState } from "react";
import type { ContextProfile, Playbook, WorkspaceItem } from "@/lib/workspace";
import { Button } from "@/components/system/button";

type Draft =
  | { kind: "profile"; name: string; profile: ContextProfile }
  | { kind: "playbook"; name: string; idea: string; context: Playbook["context"] };

const EMPTY_PROFILE: ContextProfile = { details: "", audience: "", voice: "", constraints: "" };

export function LibraryManager({ initialNew }: { initialNew?: string }) {
  const [items, setItems] = useState<WorkspaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(initialNew === "profile" ? { kind: "profile", name: "", profile: EMPTY_PROFILE } : null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/workspace");
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Could not load the library.");
      setItems(json.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the library.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const selected = items.find((item) => item.id === selectedId) ?? null;

  function beginProfile() {
    setDraft({ kind: "profile", name: "", profile: EMPTY_PROFILE });
    setSelectedId(null);
    setEditingId(null);
  }

  function beginPlaybook() {
    setDraft({ kind: "playbook", name: "", idea: "", context: { universal: true } });
    setSelectedId(null);
    setEditingId(null);
  }

  function editSelected() {
    if (!selected) return;
    setEditingId(selected.id);
    if (selected.kind === "profile") {
      setDraft({ kind: "profile", name: selected.name, profile: { ...selected.payload } });
    } else {
      setDraft({ kind: "playbook", name: selected.name, idea: selected.payload.idea, context: selected.payload.context });
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!draft || saving) return;
    setSaving(true);
    setNotice("");
    try {
      const body = draft.kind === "profile"
        ? { kind: "profile", name: draft.name, payload: draft.profile }
        : { kind: "playbook", name: draft.name, payload: { idea: draft.idea, context: draft.context } };
      const response = await fetch(editingId ? `/api/workspace?id=${editingId}` : "/api/workspace", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Could not save this item.");
      await load();
      setDraft(null);
      setEditingId(null);
      setSelectedId(json.data.id);
      setNotice("Saved.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not save this item.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!selected) return;
    if (!window.confirm(`Delete “${selected.name}”?`)) return;
    try {
      const response = await fetch(`/api/workspace?id=${selected.id}`, { method: "DELETE" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Could not delete this item.");
      setSelectedId(null);
      await load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not delete this item.");
    }
  }

  return (
    <div className="library">
      <section>
        <div className="composer__actions" style={{ marginBottom: 18 }}>
          <Button size="sm" onClick={beginProfile}>New profile</Button>
          <Button size="sm" variant="ghost" onClick={beginPlaybook}>New playbook</Button>
        </div>
        {loading ? <p className="small muted">Loading.</p> : null}
        {error ? <p className="field__error">{error}</p> : null}
        <div className="library__list">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className="library__item"
              aria-current={selectedId === item.id ? "true" : undefined}
              onClick={() => { setSelectedId(item.id); setDraft(null); setEditingId(null); }}
            >
              <span className="library__item-name">{item.name}</span>
              <span className="library__item-kind">{item.kind === "profile" ? "Context profile" : "Playbook"}</span>
            </button>
          ))}
          {!loading && !items.length ? <p className="body muted">Nothing in the library yet.</p> : null}
        </div>
      </section>

      <section className="library__detail">
        {draft ? (
          <form className="stack--loose stack" onSubmit={save}>
            <div className="sheet__head" style={{ marginBottom: 0 }}>
              <h2 className="sheet__title">{draft.kind === "profile" ? "Profile" : "Playbook"}</h2>
              <span className="sheet__meta">{editingId ? "Editing" : "New"}</span>
            </div>
            <div className="field">
              <label className="field__label" htmlFor="item-name">Name</label>
              <input id="item-name" className="field__input" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} maxLength={80} required />
            </div>
            {draft.kind === "profile" ? (
              <>
                {(["details", "audience", "voice", "constraints"] as const).map((key) => (
                  <div className="field" key={key}>
                    <label className="field__label" htmlFor={`profile-${key}`}>{key}</label>
                    {key === "constraints" ? (
                      <textarea id={`profile-${key}`} className="field__textarea" rows={3} value={draft.profile[key]} onChange={(event) => setDraft({ ...draft, profile: { ...draft.profile, [key]: event.target.value } })} />
                    ) : (
                      <input id={`profile-${key}`} className="field__input" value={draft.profile[key]} onChange={(event) => setDraft({ ...draft, profile: { ...draft.profile, [key]: event.target.value } })} />
                    )}
                  </div>
                ))}
              </>
            ) : (
              <div className="field">
                <label className="field__label" htmlFor="playbook-idea">The task</label>
                <textarea id="playbook-idea" className="field__textarea" rows={5} value={draft.idea} onChange={(event) => setDraft({ ...draft, idea: event.target.value })} required />
              </div>
            )}
            <div className="composer__actions">
              <Button type="submit" variant="accent" disabled={saving}>{saving ? "Saving" : "Save"}</Button>
              <Button type="button" variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
            </div>
            {notice ? <p className="small muted" role="status">{notice}</p> : null}
          </form>
        ) : selected ? (
          <div className="stack--loose stack">
            <div className="sheet__head" style={{ marginBottom: 0 }}>
              <h2 className="sheet__title">{selected.name}</h2>
              <span className="sheet__meta">{selected.kind === "profile" ? "Context profile" : "Playbook"}</span>
            </div>
            {selected.kind === "profile" ? (
              <dl className="stack">
                {(["details", "audience", "voice", "constraints"] as const).map((key) =>
                  selected.payload[key] ? (
                    <div key={key}>
                      <dt className="field__label">{key}</dt>
                      <dd className="body">{selected.payload[key]}</dd>
                    </div>
                  ) : null
                )}
              </dl>
            ) : (
              <div className="stack">
                <p className="body">{selected.payload.idea}</p>
                <p className="small muted">
                  This playbook carries the reusable task context, not a saved prompt or a profile.
                </p>
              </div>
            )}
            <div className="composer__actions">
              <Button size="sm" onClick={editSelected}>Edit</Button>
              <Button size="sm" variant="ghost" onClick={remove}>Delete</Button>
            </div>
            {notice ? <p className="small muted" role="status">{notice}</p> : null}
          </div>
        ) : (
          <div className="stack">
            <h2 className="sheet__title">A private library.</h2>
            <p className="body">
              Profiles hold the facts you repeat: your product, your audience, your voice, your
              limits. Playbooks hold a reusable task. Applying either is a separate, confirmed
              step in the builder.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
