"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BookOpen, Save, Settings2, X, UserRound, ShieldCheck, Plus } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { ActionIcon } from "@/components/ui/action-icon";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useTranslations } from "@/lib/i18n/use-translations";
import { workspaceCopy } from "@/lib/workspace-copy";
import { track } from "@/lib/analytics";
import type { Playbook } from "@/lib/workspace";
import type { PromptContext } from "@/types/prompt";
interface Props {
  idea: string; context: PromptContext; busy: boolean;
  onPlaybook: (playbook: Playbook) => boolean;
  onContextChange: (context: PromptContext) => void;
  onNavigate?: () => boolean;
  playbookId?: string | null;
  profileId?: string | null;
}
export function BuilderLibrary({ idea, context, busy, onPlaybook, onContextChange, onNavigate, playbookId, profileId }: Props) {
  const { items, loading, error, save, refresh } = useWorkspace();
  const { language } = useTranslations();
  const copy = workspaceCopy(language);
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [review, setReview] = useState<PromptContext["profile"]>(undefined);
  const reviewed = useRef<string | null>(null);
  useEffect(() => {
    if (!profileId || loading || reviewed.current === profileId) return;
    const item = items.find((i) => i.kind === "profile" && i.id === profileId);
    if (item?.kind === "profile") { reviewed.current = profileId; setReview({ ...item.payload, id: item.id, name: item.name }); }
  }, [profileId, loading, items]);
  const applied = useRef<string | null>(null);
  useEffect(() => {
    if (!playbookId || loading || error || applied.current === playbookId || busy) return;
    const item = items.find((i) => i.kind === "playbook" && i.id === playbookId);
    applied.current = playbookId;
    if (item?.kind === "playbook") onPlaybook(item.payload);
  }, [playbookId, loading, error, items, onPlaybook, busy]);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (saving) return;
    setSaving(true); setNotice("");
    try {
      await save({ kind: "playbook", name, payload: { idea, context } });
      setOpen(false); setName(""); setNotice(copy.saved);
      track("workspace_item_saved", { action_type: "playbook", source_page: "builder" });
    } catch (e) { setNotice(e instanceof Error ? e.message : copy.savingError); }
    finally { setSaving(false); }
  }
  return <div className="mx-auto mb-6 max-w-3xl border-b border-zinc-200 pb-4">
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <UserRound className="size-4 text-emerald-700" />
      <label className="text-xs font-medium text-zinc-600" htmlFor="profile-picker">{copy.profile}</label>
      <select id="profile-picker" disabled={loading || busy || saving || !!error} value={context.profile?.id ?? ""} onChange={(e) => {
        if (!e.target.value) { onContextChange({ ...context, profile: undefined, profileConsent: false }); return; }
        const item = items.find((i) => i.id === e.target.value);
        if (item?.kind === "profile") setReview({ ...item.payload, id: item.id, name: item.name });
      }} className="min-w-0 flex-1 rounded-md border border-zinc-200 bg-white px-2 py-2 text-xs sm:flex-none sm:max-w-60"><option value="">{copy.noProfile}</option>{items.filter((i) => i.kind === "profile").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}{context.profile && !items.some((i) => i.id === context.profile?.id) && <option value={context.profile.id}>{context.profile.name}</option>}</select>
      {context.profile && <button type="button" disabled={busy} onClick={() => setReview(context.profile)} className="flex items-center gap-1.5 text-xs text-emerald-700" title={copy.review}><ShieldCheck className="size-3.5" />{copy.applied}</button>}
      <Button size="sm" variant="ghost" asChild><Link href="/library?new=profile" onClick={(event) => { if (onNavigate && !onNavigate()) event.preventDefault(); }}><Plus className="size-3.5" />{copy.newProfile}</Link></Button>
    </div>
    <div className="flex flex-wrap items-center gap-2">
      <BookOpen className="size-4 text-emerald-700" />
      <label className="sr-only" htmlFor="playbook-picker">{copy.applyPlaybook}</label>
      <select id="playbook-picker" value="" disabled={loading || busy || saving || !!error} onChange={(e) => {
        const item = items.find((i) => i.id === e.target.value);
        if (item?.kind === "playbook" && onPlaybook(item.payload)) track("workspace_item_used", { action_type: "playbook" });
      }} className="min-w-[160px] flex-1 rounded-md border border-zinc-200 bg-white px-2 py-2 text-xs sm:flex-none sm:max-w-60"><option value="">{copy.applyPlaybook}</option>{items.filter((i) => i.kind === "playbook").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      <Button size="sm" variant="ghost" disabled={busy || saving || !idea.trim() || !!error || loading} onClick={() => { setOpen(!open); setName(idea.slice(0, 60)); }}><Save className="size-3.5" />{copy.savePlaybook}</Button>
      <Button size="sm" variant="ghost" asChild><Link href="/library" onClick={(event) => { if (onNavigate && !onNavigate()) event.preventDefault(); }}><Settings2 className="size-4" />{copy.manage}</Link></Button>
    </div>
    {open && <form onSubmit={submit} className="mt-3 flex flex-wrap gap-2"><label className="sr-only" htmlFor="playbook-name">{copy.name}</label><input id="playbook-name" autoFocus required maxLength={80} disabled={saving} value={name} onChange={(e) => setName(e.target.value)} placeholder={copy.name} className="min-w-0 flex-1 rounded-md border border-zinc-200 px-3 py-2 text-sm" /><Button size="sm" type="submit" disabled={saving}><ActionIcon pending={saving} icon={Save} />{copy.save}</Button><Button size="icon" type="button" variant="ghost" aria-label={copy.cancel} disabled={saving} onClick={() => setOpen(false)}><X className="size-4" /></Button></form>}
    {error && <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500"><span role="alert">{error}</span><button type="button" className="text-emerald-700 underline" onClick={() => void refresh()}>{copy.retry}</button></div>}
    {notice && <p role="status" className="mt-2 text-xs text-zinc-600">{notice}</p>}
    <Dialog.Root open={!!review} onOpenChange={(value) => { if (!value) setReview(undefined); }}>
      <Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-black/30" /><Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-zinc-200 bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3"><Dialog.Title className="min-w-0 break-words text-lg font-semibold">{review?.name}</Dialog.Title><Dialog.Close asChild><Button size="icon" variant="ghost" aria-label={copy.cancel}><X className="size-4" /></Button></Dialog.Close></div>
        <Dialog.Description className="mt-3 text-sm leading-relaxed text-zinc-600">{copy.profileConsent}</Dialog.Description>
        <dl className="my-5 space-y-3">{review && (["details", "audience", "voice", "constraints"] as const).filter((key) => review[key]).map((key) => <div key={key}><dt className="text-xs font-semibold text-zinc-500">{copy[key]}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm">{review[key]}</dd></div>)}</dl>
        <div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={() => { if (!review) return; onContextChange({ ...context, profile: review, profileConsent: true, clarifications: undefined }); setReview(undefined); track("workspace_item_used", { action_type: "profile" }); }}><ShieldCheck className="size-4" />{copy.use}</Button><Dialog.Close asChild><Button variant="outline"><X className="size-4" />{copy.cancel}</Button></Dialog.Close></div>
      </Dialog.Content></Dialog.Portal>
    </Dialog.Root>
  </div>;
}
