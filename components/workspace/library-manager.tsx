"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Plus, UserRound, BookOpen, Pencil, Trash2, ArrowUpRight, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionIcon } from "@/components/ui/action-icon";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useTranslations } from "@/lib/i18n/use-translations";
import { workspaceCopy } from "@/lib/workspace-copy";
import { track } from "@/lib/analytics";
import { parseWorkspaceItem, type WorkspaceItem, type ContextProfile } from "@/lib/workspace";
import { CHECKOUT_DRAFT_KEY, parseCheckoutDraft } from "@/lib/checkout-draft";

const emptyProfile: ContextProfile = { details: "", audience: "", voice: "", constraints: "" };
const fieldClass = "w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/30";
export function LibraryManager() {
  const { items, loading, error, refresh, save, remove } = useWorkspace();
  const [tab, setTab] = useState<"profile" | "playbook">("profile");
  const [editing, setEditing] = useState<WorkspaceItem | "new" | null>(null);
  const [name, setName] = useState("");
  const [profile, setProfile] = useState(emptyProfile);
  const [idea, setIdea] = useState("");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const { language } = useTranslations();
  const copy = workspaceCopy(language);
  const reduce = useReducedMotion();
  const router = useRouter();
  const searchParams = useSearchParams();
  const openedNew = useRef(false);
  useEffect(() => {
    if (searchParams.get("new") === "profile" && !openedNew.current) {
      openedNew.current = true;
      setTab("profile"); setEditing("new");
      track("workspace_create_opened", { action_type: "profile", source_page: "builder" });
    }
  }, [searchParams]);

  function edit(item?: WorkspaceItem) {
    setEditing(item ?? "new"); setNotice(""); setName(item?.name ?? "");
    setProfile(item?.kind === "profile" ? item.payload : emptyProfile);
    setIdea(item?.kind === "playbook" ? item.payload.idea : "");
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (pending) return;
    const input = tab === "profile" ? { kind: tab, name, payload: profile } : { kind: tab, name, payload: { idea, context: editing && editing !== "new" && editing.kind === "playbook" ? editing.payload.context : { universal: true, category: "auto" } } };
    const parsed = parseWorkspaceItem(input);
    if (!parsed.data) { setNotice(parsed.error ?? copy.savingError); return; }
    setPending(true);
    try {
      await save(parsed.data, editing && editing !== "new" ? editing.id : undefined);
      setEditing(null); setNotice(copy.saved); track("workspace_item_saved", { action_type: tab });
    } catch (e) { setNotice(e instanceof Error ? e.message : copy.savingError); }
    finally { setPending(false); }
  }
  async function deleteItem(item: WorkspaceItem) {
    if (pending || !window.confirm(copy.confirmDelete)) return;
    setPending(true);
    try { await remove(item.id); setNotice(copy.deleted); track("workspace_item_deleted", { action_type: item.kind }); }
    catch (e) { setNotice(e instanceof Error ? e.message : copy.savingError); }
    finally { setPending(false); }
  }
  function handleUseItem(item: WorkspaceItem) {
    const query = new URLSearchParams({ [item.kind]: item.id });
    try { if (parseCheckoutDraft(sessionStorage.getItem(CHECKOUT_DRAFT_KEY))) query.set("resume", "checkout"); } catch {}
    router.push(`/builder?${query}`);
  }
  return <div className="mx-auto max-w-4xl">
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-5">
      <h1 className="text-2xl font-semibold">{copy.library}</h1>
      <Button onClick={() => edit()} disabled={pending || !!error || loading}><Plus className="size-4" />{tab === "profile" ? copy.newProfile : copy.newPlaybook}</Button>
    </div>
    <div role="tablist" aria-label={copy.library} className="mt-5 flex gap-2">
      {(["profile", "playbook"] as const).map((kind) => <button key={kind} id={`library-tab-${kind}`} role="tab" aria-controls="library-tabpanel" aria-selected={tab === kind} tabIndex={tab === kind ? 0 : -1} disabled={pending} onKeyDown={(event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === "Home" ? "profile" : event.key === "End" ? "playbook" : kind === "profile" ? "playbook" : "profile";
        setTab(next); setEditing(null); setNotice("");
        document.getElementById(`library-tab-${next}`)?.focus();
      }} onClick={() => { setTab(kind); setEditing(null); setNotice(""); }} className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${tab === kind ? "bg-emerald-50 text-emerald-800" : "text-zinc-500 hover:bg-zinc-100"}`}>
        {kind === "profile" ? <UserRound className="size-4" /> : <BookOpen className="size-4" />}{kind === "profile" ? copy.profiles : copy.playbooks}
      </button>)}
    </div>
    {error && <div role="alert" className="mt-5 text-sm text-red-700">{error}<Button variant="ghost" onClick={() => void refresh()}>{copy.retry}</Button></div>}
    {notice && <p role="status" className="mt-4 text-sm">{notice}</p>}
    <AnimatePresence initial={false}>{editing && <motion.form key="editor" onSubmit={submit} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : 0.18 }} className="my-5 border-y border-zinc-200 py-5">
      <label className="block text-sm font-medium">{copy.name}<input autoFocus required maxLength={80} className={`${fieldClass} mt-2`} value={name} onChange={(e) => setName(e.target.value)} disabled={pending} /></label>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {tab === "profile" ? (Object.keys(emptyProfile) as (keyof ContextProfile)[]).map((key) => <label key={key} className="block text-sm font-medium">{copy[key]}<textarea aria-label={copy[key]} maxLength={1200} className={`${fieldClass} mt-2 min-h-24 resize-y`} value={profile[key]} onChange={(e) => setProfile({ ...profile, [key]: e.target.value })} disabled={pending} /></label>) : <label className="block text-sm font-medium sm:col-span-2">{copy.idea}<textarea aria-label={copy.idea} required maxLength={4000} className={`${fieldClass} mt-2 min-h-32`} value={idea} onChange={(e) => setIdea(e.target.value)} disabled={pending} /></label>}
      </div>
      <div className="mt-4 flex gap-2"><Button type="submit" disabled={pending}><ActionIcon pending={pending} icon={Save} />{copy.save}</Button><Button type="button" variant="ghost" onClick={() => setEditing(null)} disabled={pending}><X className="size-4" />{copy.cancel}</Button></div>
    </motion.form>}</AnimatePresence>
    <div role="tabpanel" id="library-tabpanel" aria-labelledby={`library-tab-${tab}`} className="mt-5 divide-y divide-zinc-200">
      {loading ? <p role="status" className="py-8 text-sm text-zinc-500">{copy.loading}</p> : !error && !items.some((item) => item.kind === tab) ? <p className="py-10 text-sm text-zinc-500">{copy.empty}</p> : items.filter((item) => item.kind === tab).map((item) => <div key={item.id} className="flex flex-wrap items-center gap-3 py-4">
        <div className="min-w-0 flex-1 basis-40"><h2 className="break-words text-sm font-semibold">{item.name}</h2><p className="mt-1 line-clamp-2 break-words text-xs text-zinc-500">{item.kind === "profile" ? item.payload.details || item.payload.audience : item.payload.idea}</p></div>
        <Button variant="outline" size="sm" disabled={pending} onClick={() => handleUseItem(item)}><ArrowUpRight className="size-4" />{copy.use}</Button>
        <Button variant="ghost" size="icon" title={copy.edit} aria-label={`${copy.edit} ${item.name}`} disabled={pending} onClick={() => edit(item)}><Pencil className="size-4" /></Button>
        <Button variant="ghost" size="icon" title={copy.remove} aria-label={`${copy.remove} ${item.name}`} disabled={pending} onClick={() => void deleteItem(item)}><Trash2 className="size-4" /></Button>
      </div>)}
    </div>
  </div>;
}
