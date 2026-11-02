"use client";

import { useEffect, useRef, useState } from "react";
import { Check, PenLine } from "lucide-react";
import { beginnerCopy } from "@/lib/beginner-copy";
import { canExpandIdea } from "@/lib/prompt-editing";
import type { AppLanguage } from "@/types/language";

export function IdeaReview({ value, language, disabled, editing, onEditingChange, onCommit }: {
  value: string;
  language: AppLanguage;
  disabled: boolean;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
  onCommit: (value: string) => void;
}) {
  const c = beginnerCopy(language);
  const [draft, setDraft] = useState(value);
  const field = useRef<HTMLTextAreaElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const wasEditing = useRef(false);

  useEffect(() => {
    if (!editing) {
      if (wasEditing.current) trigger.current?.focus();
      wasEditing.current = false;
      return;
    }
    wasEditing.current = true;
    if (!field.current) return;
    field.current.style.height = "auto";
    field.current.style.height = `${field.current.scrollHeight + 2}px`;
  }, [editing, draft]);

  return <div className="beginner-original">
    <span>{c.yourIdea}</span>
    {!editing && <button ref={trigger} type="button" disabled={disabled} onClick={() => {
      setDraft(value);
      onEditingChange(true);
    }}><PenLine size={15} />{c.editIdea}</button>}
    {editing ? <form className="beginner-idea-editor" onSubmit={event => {
      event.preventDefault();
      if (disabled || !canExpandIdea(draft)) return;
      onCommit(draft);
      onEditingChange(false);
    }}>
      <label className="sr-only" htmlFor="beginner-review-idea">{c.yourIdea}</label>
      <textarea ref={field} id="beginner-review-idea" autoFocus value={draft} maxLength={4000} rows={3}
        disabled={disabled} onChange={event => setDraft(event.target.value)}
        aria-invalid={!canExpandIdea(draft)} aria-describedby={!canExpandIdea(draft) ? "beginner-idea-edit-error" : undefined} />
      {!canExpandIdea(draft) && <p id="beginner-idea-edit-error" role="status">{c.invalid}</p>}
      <div className="beginner-idea-editor-actions">
        <span>{draft.length} / 4000</span>
        <button type="button" disabled={disabled} className="beginner-secondary" onClick={() => onEditingChange(false)}>{c.cancel}</button>
        <button type="submit" disabled={disabled || !canExpandIdea(draft)} className="beginner-primary">{c.done}<Check size={16} /></button>
      </div>
    </form> : <p>{value}</p>}
  </div>;
}
