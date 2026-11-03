"use client";
import Link from "next/link";
import { publicExamples } from "@/lib/public-examples";
import { useTranslations } from "@/lib/i18n/use-translations";
import { SUPPORT_EMAIL } from "@/lib/purchase-policy";
import type { AppLanguage } from "@/types/language";
export function Examples({language,onTry}:{language:AppLanguage;onTry?:(idea:string)=>void}){const c=publicExamples[language];return <section className="public-examples"><div className="beginner-section-heading"><div><h2>{c.title}</h2><p>{c.label}</p></div></div>{c.cases.map(item=><details key={item.id}><summary>{item.title}</summary><div className="example-journey">{[[c.idea,item.idea],[c.details,item.details],[c.prompt,item.prompt],[c.answer,item.answer]].map(([title,text])=><div key={title}><h3>{title}</h3><p>{text}</p></div>)}</div><p className="daily-muted">{c.sampleNote}</p>{onTry?<button type="button" className="beginner-secondary" onClick={()=>onTry(item.idea)}>{c.try} →</button>:<Link href={`/builder?task=${item.id}`}>{c.try} →</Link>}</details>)}</section>}
export function FounderNote({language}:{language:AppLanguage}){const c=publicExamples[language];return <section className="public-founder"><h2>{c.founderTitle}</h2><p>{c.founder}</p><p>{c.support}</p><a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></section>}
export function PublicExamples(){const {language}=useTranslations();return <><Examples language={language}/><FounderNote language={language}/></>}
