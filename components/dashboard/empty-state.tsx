"use client";
import Link from "next/link";
import { ArrowRight, BookOpen, Mail, CalendarDays } from "lucide-react";
import { useTranslations } from "@/lib/i18n/use-translations";
import { dailyCopy } from "@/lib/daily-copy";
export function EmptyState() {
  const {language}=useTranslations();const c=dailyCopy(language);
  return <section className="daily-empty-note"><h2 className="text-2xl font-semibold">{c.empty}</h2><p className="mt-2">{c.emptyHelp}</p><div className="daily-quick-grid">
    {[{id:"study",title:c.study,Icon:BookOpen},{id:"email",title:c.email,Icon:Mail},{id:"plan",title:c.plan,Icon:CalendarDays}].map(({id,title,Icon})=><Link className="daily-quick" key={id} href={"/builder?task="+id}><Icon size={22}/><h3>{title}</h3><ArrowRight size={17}/></Link>)}
  </div></section>;
}
