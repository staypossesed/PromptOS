"use client";
import Link from "next/link";
import { useTranslations } from "@/lib/i18n/use-translations";
import { PublicPage, PurchasePolicy } from "@/components/public/public-page";
import { helpCopy } from "@/lib/help-copy";
import { SUPPORT_EMAIL } from "@/lib/purchase-policy";
export function HelpContent(){const {language}=useTranslations();const c=helpCopy[language];return <PublicPage><h1>{c.title}</h1><p>{c.subtitle}</p>{c.steps.map(([title,text])=><section key={title}><h2>{title}</h2><p>{text}</p></section>)}<section className="landing-faq"><div>{c.questions.map(([q,a])=><details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div></section><PurchasePolicy/><p><Link href="/?fresh=1">{c.start} →</Link></p><a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></PublicPage>}
