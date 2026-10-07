"use client";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Minimize2, Target, ListOrdered, BriefcaseBusiness, ArrowUpRight, History, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/lib/i18n/use-translations";
import { workspaceCopy } from "@/lib/workspace-copy";
import { REFINEMENTS, type Refinement, type PromptVersion } from "@/lib/workspace";
import { localizedNextSteps } from "@/lib/workspace-next-steps";

const icons = { shorter: Minimize2, specific: Target, steps: ListOrdered, professional: BriefcaseBusiness };
interface Props {
  busy: boolean;
  category?: string;
  versions?: PromptVersion[];
  onRefine: (action: Refinement) => void;
  onRestore: (version: PromptVersion) => void;
}
export function ResultActions({ busy, versions = [], onRefine, onRestore }: Props) {
  const { language } = useTranslations();
  const copy = workspaceCopy(language);
  const [selected, setSelected] = useState("");
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();
  const version = versions[Number(selected)];
  const labels: Record<string, string> = { shorter: copy.shorter, specific: copy.specific, steps: copy.steps, professional: copy.professional, "Quality optimization": copy.quality, "Restored version": copy.restoredAction };
  return <div className="mb-4 border-y border-zinc-200 py-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">{copy.refine}</h3><a href="#next-task-actions" className="inline-flex min-h-9 items-center gap-1.5 text-xs font-medium text-emerald-700"><ArrowUpRight className="size-3.5" />{copy.next}</a></div>
    <div className="mt-3 flex flex-wrap gap-2">{REFINEMENTS.map((action) => { const Icon = icons[action]; return <Button key={action} variant="outline" size="sm" disabled={busy} onClick={() => onRefine(action)} title={copy.usage}><Icon className="size-3.5" />{copy[action]}</Button>; })}</div>
    <p className="mt-2 text-xs text-zinc-500">{copy.usage}</p>
    {!!versions.length && <div className="mt-4">
      <button type="button" disabled={busy} aria-expanded={open} aria-controls="prompt-versions" onClick={() => setOpen(!open)} className="flex items-center gap-2 py-2 text-xs font-medium text-zinc-600"><History className="size-4" />{copy.versions} ({versions.length})</button>
      <AnimatePresence initial={false}>{open && <motion.div id="prompt-versions" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: reduced ? 0 : 0.18 }} className="overflow-hidden">
        <label className="sr-only" htmlFor="version-select">{copy.versions}</label>
        <div className="mt-2 flex flex-wrap gap-2"><select id="version-select" disabled={busy} value={selected} onChange={(e) => setSelected(e.target.value)} className="min-w-0 flex-1 rounded-md border border-zinc-200 px-3 py-2 text-sm"><option value="">{copy.current}</option>{versions.map((v, i) => <option key={`${v.createdAt}-${i}`} value={i}>{i + 1}. {copy.before} {labels[v.action] ?? v.action} · {new Date(v.createdAt).toLocaleTimeString(language, { hour: "2-digit", minute: "2-digit" })}</option>)}</select><Button variant="outline" size="sm" disabled={busy || selected === "" || !version} onClick={() => { onRestore(version); setSelected(""); }}><RotateCcw className="size-3.5" />{copy.restore}</Button></div>
        {selected !== "" && version && <pre className="my-3 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-md bg-zinc-50 p-3 text-xs leading-relaxed">{version.prompt}</pre>}
      </motion.div>}</AnimatePresence>
    </div>}
  </div>;
}

export function NextTaskActions({ busy, category, onNext }: { busy: boolean; category?: string; onNext: (instruction: string, index: number) => void }) {
  const { language } = useTranslations();
  const copy = workspaceCopy(language);
  return <section id="next-task-actions" className="mt-5 scroll-mt-24 border-t border-zinc-200 pt-4" aria-labelledby="next-task-heading">
    <h3 id="next-task-heading" className="text-sm font-semibold">{copy.next}</h3>
    <div className="mt-2 divide-y divide-zinc-100">{localizedNextSteps(category, language).map((label, i) => <button key={i} type="button" disabled={busy} onClick={() => onNext(label, i)} className="flex w-full items-center justify-between gap-3 py-3 text-left text-sm text-zinc-600 transition-colors hover:text-emerald-800 disabled:opacity-50"><span className="min-w-0 break-words">{label}</span><ArrowUpRight className="size-4 shrink-0" /></button>)}</div>
  </section>;
}
