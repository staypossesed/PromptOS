"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Check, Star, Save, BookOpen } from "lucide-react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useTranslations } from "@/lib/i18n/use-translations";
import { dailyCopy } from "@/lib/daily-copy";
import { beginnerQuestions } from "@/lib/beginner-copy";
import { dailyTaskKind, usefulNextTask, recordStudySession } from "@/lib/daily-tasks";
import type { ContextProfile, WorkspaceItem } from "@/lib/workspace";
import type { PromptContext } from "@/types/prompt";

export function ProfileChooser({ onApply, applied, initialId }: {
  onApply: (profile: (ContextProfile & { id: string; name: string }) | null) => void;
  applied: (ContextProfile & { id: string; name: string }) | null;
  initialId?: string;
}) {
  const { language } = useTranslations(); const c = dailyCopy(language);
  const { items, loading, error } = useWorkspace(); const [selected,setSelected] = useState(initialId ?? ""); const [consent,setConsent] = useState(false);
  const profiles = items.filter(item => item.kind === "profile"); const profile = profiles.find(item => item.id === selected);
  if (loading || error) return <p className="daily-muted">{loading ? c.loading : c.loadError} <Link href="/library">{c.settings}</Link></p>;
  if (!profiles.length) return <Link className="daily-settings-link" href="/library?new=profile">{c.settings}<ArrowRight size={15}/></Link>;
  return <details className="daily-details"><summary>{c.profileTitle}{applied ? ` · ${applied.name}` : ""}</summary><div className="daily-details-body">
    <select aria-label={c.profileTitle} value={selected} onChange={e => {setSelected(e.target.value);setConsent(false);onApply(null);}}><option value="">{c.profileNone}</option>{profiles.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
    {profile?.kind === "profile" && <><h3>{c.profilePreview}</h3><div className="daily-notes">{Object.values(profile.payload).filter(Boolean).map((value,i)=><p key={i}>{value}</p>)}</div>
      <label className="daily-check"><input type="checkbox" checked={consent} onChange={e=>{setConsent(e.target.checked);if(!e.target.checked)onApply(null);}}/>{c.profileConsent}</label>
      <button type="button" className="beginner-secondary" disabled={!consent} onClick={()=>onApply({...profile.payload,id:profile.id,name:profile.name})}>{applied ? <Check size={17}/> : null}{applied ? c.profileApplied : c.profileApply}</button>
      {applied && <button type="button" className="beginner-back" onClick={()=>{onApply(null);setConsent(false);}}>{c.profileRemove}</button>}</>}
  </div></details>;
}

export function SavedTaskDetails({ item, applied, onApply, onSaved }: { item: WorkspaceItem; applied: boolean; onApply: () => void; onSaved: (item:WorkspaceItem)=>void }) {
  const { language } = useTranslations(); const c=dailyCopy(language);
  const {save}=useWorkspace();const [progress,setProgress]=useState(item.kind==="playbook"?item.payload.routine?.progress??"":"");const [complete,setComplete]=useState(false);const [pending,setPending]=useState(false);const [notice,setNotice]=useState("");const [error,setError]=useState("");
  if(item.kind !== "playbook")return null;
  const settings=item.payload.routine; const questions=beginnerQuestions(item.payload.idea,settings?.language ?? language);
  async function checkpoint(){if(item.kind!=="playbook"||pending)return;setPending(true);setError("");setNotice("");try{const next=recordStudySession({answers:settings?.answers??{},extra:settings?.extra??"",language:settings?.language??language,progress,completedSessions:settings?.completedSessions??0,...(settings?.lastCompletedAt?{lastCompletedAt:settings.lastCompletedAt}:{})},complete);const saved=await save({kind:"playbook",name:item.name,payload:{...item.payload,routine:next}},item.id);onSaved(saved);setComplete(false);setNotice(c.progressSaved);}catch{setError(c.error);}finally{setPending(false);}}
  return <aside className="daily-memory"><h2>{c.savedDetails}: {item.name}</h2><p>{c.detailsHelp}</p>
    <dl>{Object.entries(settings?.answers ?? {}).map(([key,value])=>value ? <div key={key}><dt>{questions.find(q=>q.id===key)?.label ?? key}</dt><dd>{value}</dd></div> : null)}</dl>
    {settings?.extra && <p className="daily-notes">{settings.extra}</p>}
    {dailyTaskKind(item.payload.idea)==="study" && <div><h3>{c.studyProgress}</h3><p>{c.progressHelp}</p><label>{c.progress}<textarea maxLength={1200} rows={3} value={progress} placeholder={c.progressPlaceholder} onChange={e=>setProgress(e.target.value)}/></label><label className="daily-check"><input type="checkbox" checked={complete} onChange={e=>setComplete(e.target.checked)}/>{c.completed}</label><small>{c.sessions}: {settings?.completedSessions ?? 0}</small><button type="button" className="beginner-secondary" disabled={pending} onClick={()=>void checkpoint()}>{pending?c.saving:c.saveProgress}</button></div>}
    {notice&&<p role="status" className="daily-success">{notice}</p>}{error&&<p role="alert" className="beginner-error">{error}</p>}
    <button type="button" className="beginner-secondary" disabled={applied||pending} onClick={onApply}>{applied ? <Check size={17}/> : null}{applied?c.applied:c.applyDetails}</button>
  </aside>;
}

export function DailyResultTools({ idea, answers, extra, context, routine, onSaved, onNext, disabled }: {
  idea:string; answers:Record<string,string>; extra:string; context:PromptContext; routine:WorkspaceItem|null;
  onSaved:(item:WorkspaceItem)=>void; onNext:(idea:string)=>void; disabled:boolean;
}) {
  const {language}=useTranslations(); const c=dailyCopy(language); const {save}=useWorkspace();
  const [open,setOpen]=useState(false);const [name,setName]=useState(routine?.name ?? idea.slice(0,80));
  const [pending,setPending]=useState(false);const [notice,setNotice]=useState(""); const [error,setError]=useState("");
  const savedSettings=routine?.kind==="playbook"?routine.payload.routine:undefined;
  const [progress,setProgress]=useState(savedSettings?.progress ?? ""); const [complete,setComplete]=useState(false);
  useEffect(()=>{if(routine?.kind==="playbook"){setName(routine.name);setProgress(routine.payload.routine?.progress??"");}},[routine]);
  const study=dailyTaskKind(idea)==="study"; const next=usefulNextTask(idea,language,savedSettings?.progress);
  async function persist(checkpoint=false) {
    if(pending||disabled)return;setPending(true);setError("");setNotice("");
    try {
      const settings=recordStudySession({answers,extra,language,progress:checkpoint?progress:savedSettings?.progress ?? "",completedSessions:savedSettings?.completedSessions ?? 0,...(savedSettings?.lastCompletedAt?{lastCompletedAt:savedSettings.lastCompletedAt}:{})},checkpoint&&complete);
      const item=await save({kind:"playbook",name:name.trim(),payload:{idea,context,routine:settings}},routine?.kind==="playbook"?routine.id:undefined);
      onSaved(item);setOpen(false);setComplete(false);setNotice(checkpoint?c.progressSaved:c.saved);
    } catch {setError(c.error);}finally{setPending(false);}
  }
  return <section className="daily-result-tools" aria-label={c.favoriteTitle}>
    <div className="daily-section-heading"><h2>{c.favoriteTitle}</h2><button type="button" className="beginner-secondary" disabled={disabled||pending} onClick={()=>{setOpen(!open);setNotice("");}}><Star size={17}/>{c.favorite}</button></div>
    {open && <form className="daily-memory" onSubmit={e=>{e.preventDefault();void persist();}}><label>{c.favoriteName}<input required maxLength={80} value={name} onChange={e=>setName(e.target.value)}/></label><p>{c.memoryNote}</p><div className="daily-notes"><p>{idea}</p>{Object.values(answers).filter(Boolean).map((answer,i)=><p key={i}>{answer}</p>)}{extra&&<p>{extra}</p>}</div><button className="beginner-primary" disabled={pending||!name.trim()}><Save size={17}/>{pending?c.saving:c.save}</button></form>}
    {study && routine?.kind==="playbook" && <form className="daily-memory" onSubmit={e=>{e.preventDefault();void persist(true);}}><h2><BookOpen size={20}/>{c.studyProgress}</h2><p>{c.progressHelp}</p><label>{c.progress}<textarea maxLength={1200} rows={4} value={progress} placeholder={c.progressPlaceholder} onChange={e=>setProgress(e.target.value)}/></label><label className="daily-check"><input type="checkbox" checked={complete} onChange={e=>setComplete(e.target.checked)}/>{c.completed}</label><p>{c.sessions}: {savedSettings?.completedSessions??0}</p><button className="beginner-secondary" disabled={pending||disabled}>{pending?c.saving:c.saveProgress}</button></form>}
    {notice&&<p role="status" className="daily-success">{notice}</p>}{error&&<p role="alert" className="beginner-error">{error}</p>}
    <div className="daily-next"><h2>{c.next}</h2><p>{c.nextHelp}</p><button type="button" className="beginner-secondary" disabled={disabled||pending} onClick={()=>onNext(next.idea)}>{next.label}<ArrowRight size={17}/></button></div>
  </section>;
}
