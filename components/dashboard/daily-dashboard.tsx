"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, Mail, CalendarDays, Lightbulb, Star, Settings2 } from "lucide-react";
import { useTranslations } from "@/lib/i18n/use-translations";
import { dailyCopy } from "@/lib/daily-copy";
import { beginnerCopy } from "@/lib/beginner-copy";
import { BEGINNER_DRAFT_KEY } from "@/lib/beginner-draft";
import { canExpandIdea } from "@/lib/prompt-editing";
import { dailyTaskKind } from "@/lib/daily-tasks";
import type { WorkspaceItem } from "@/lib/workspace";
import type { PromptSummary } from "@/types/prompt";
import { PromptCard } from "./prompt-card";
import { PromptFilters } from "./saved-work-filters";

export function DailyDashboard({ ownerId, prompts, favorites, query, delivery, error, favoriteError }: {
  ownerId: string; prompts: PromptSummary[]; favorites: WorkspaceItem[]; query: string; delivery: "prompt" | "answer" | ""; error: boolean; favoriteError: boolean;
}) {
  const { language, t } = useTranslations(); const c = dailyCopy(language);
  const b=beginnerCopy(language);const router=useRouter();const [idea,setIdea]=useState("");const [startError,setStartError]=useState("");
  function start(event:React.FormEvent){event.preventDefault();if(!canExpandIdea(idea))return;try{sessionStorage.setItem(BEGINNER_DRAFT_KEY,JSON.stringify({owner:ownerId,idea,answers:{},extra:"",delivery:"prompt",result:null,metric:null,outcome:null,createdAt:Date.now()}));router.push("/builder");}catch{setStartError(b.storageError);}}
  const latest = prompts[0];
  return <main className="daily-home">
    <header className="daily-heading"><p className="beginner-eyebrow">Umprompt</p><h1>{c.title}</h1><p>{c.subtitle}</p></header>
    {error && <p className="beginner-error" role="alert">{c.loadError}</p>}
    {latest && !query && !delivery && <section className="daily-continue" aria-label={c.continue}><div><span>{c.continue}</span><h2>{latest.title}</h2><p>{latest.idea}</p></div><Link className="beginner-primary" href={`/builder?id=${latest.id}`}>{c.open}<ArrowRight size={18}/></Link></section>}
    <section className="daily-section"><div className="daily-section-heading"><div><h2>{c.favorites}</h2><p>{c.favoriteHelp}</p></div><Link href="/library"><Settings2 size={17}/>{c.settings}</Link></div>
      {favoriteError ? <p role="alert">{c.loadError}</p> : favorites.length ? <div className="daily-favorites">{favorites.map(item => {
        if (item.kind !== "playbook") return null;
        const study = dailyTaskKind(item.payload.idea) === "study";
        return <Link className="daily-favorite" href={`/builder?routine=${item.id}`} key={item.id}><span className="daily-task-icon">{study ? <BookOpen size={21}/> : <Star size={21}/>}</span><h3>{item.name}</h3><p>{item.payload.idea}</p>{study && <small>{c.sessions}: {item.payload.routine?.completedSessions ?? 0}</small>}<span className="daily-favorite-action">{study ? c.nextSession : c.open}<ArrowRight size={17}/></span></Link>;
      })}</div> : <p className="daily-empty-note">{c.noFavorites}</p>}
    </section>
    <section className="daily-section"><h2>{c.quick}</h2><form className="daily-composer" onSubmit={start}><label htmlFor="daily-new-idea">{b.ideaLabel}</label><textarea id="daily-new-idea" rows={3} maxLength={4000} value={idea} placeholder={b.placeholder} onChange={e=>{setIdea(e.target.value);setStartError("");}}/><button className="beginner-primary" disabled={!canExpandIdea(idea)}>{b.continue}<ArrowRight size={18}/></button>{startError&&<p role="alert">{startError}</p>}</form><div className="daily-quick-grid">{[
      { id: "study", title: c.study, help: c.studyHelp, Icon: BookOpen }, { id: "email", title: c.email, help: c.emailHelp, Icon: Mail },
      { id: "plan", title: c.plan, help: c.planHelp, Icon: CalendarDays }, { id: "explain", title: c.explain, help: c.explainHelp, Icon: Lightbulb },
    ].map(({ id, title, help, Icon }) => <Link key={id} href={`/builder?task=${id}`} className="daily-quick"><Icon size={22}/><h3>{title}</h3><p>{help}</p><ArrowRight size={17}/></Link>)}</div></section>
    <section className="daily-section"><div className="daily-section-heading"><h2>{c.recent}</h2><Link href="/history">{c.allWork}<ArrowRight size={16}/></Link></div>
      <PromptFilters path="/dashboard" query={query} delivery={delivery}/>
      {!error && (prompts.length ? <div className="daily-recent-grid">{prompts.slice(0,6).map((prompt,i) => <PromptCard key={prompt.id} prompt={prompt} index={i}/>)}</div> : <div className="daily-empty-note"><h3>{query || delivery ? t("dashboard.noPromptsMatch") : c.empty}</h3><p>{c.emptyHelp}</p></div>)}
    </section>
  </main>;
}
