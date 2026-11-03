"use client";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { useTranslations } from "@/lib/i18n/use-translations";
import { purchaseCopy, SUPPORT_EMAIL, SELLER, SELLER_LOCATION, POLICY_UPDATED } from "@/lib/purchase-policy";
export function PublicPage({children}:{children:React.ReactNode}) {
 const {language,setLanguage}=useTranslations();const c=purchaseCopy[language];
 return <div className="beginner-shell"><header className="beginner-header public-header"><Link href="/?fresh=1"><Logo size={42} className="beginner-brand"/></Link><nav className="beginner-nav"><select aria-label={language==='ru'?'Язык':language==='es'?'Idioma':'Language'} value={language} onChange={e=>setLanguage(e.target.value as 'en'|'ru'|'es')}><option value="en">English</option><option value="ru">Русский</option><option value="es">Español</option></select><Link href="/?fresh=1">{c.back}</Link></nav></header><main className="beginner-main public-content">{children}</main><footer className="beginner-footer"><span>{SELLER} · {SELLER_LOCATION}</span><nav><Link href="/help">{c.help}</Link><Link href="/terms">{c.terms}</Link><Link href="/privacy">{c.privacy}</Link><a href={`mailto:${SUPPORT_EMAIL}`}>{c.support}</a></nav></footer></div>;
}
export function PurchasePolicy({compact=false}:{compact?:boolean}) {
 const {language}=useTranslations(); const c=purchaseCopy[language];
 return <section className="purchase-policy" id="purchase-terms"><h2>{c.policy}</h2><p>{c.limits}</p><details open={!compact}><summary>{c.policy}</summary><p>{c.counting}</p><p>{c.history}</p><p>{c.checkout}</p><p>{c.refunds}</p><p>{c.founder}</p></details><p><Link href="/terms">{c.terms}</Link> · <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></p></section>;
}
export function TermsContent(){const {language}=useTranslations();const c=purchaseCopy[language];return <PublicPage><h1>{c.legalTitle}</h1><p>{c.updated}: {POLICY_UPDATED}</p><section><h2>{c.operator}</h2><p>{SELLER} · {SELLER_LOCATION}</p><a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></section>{c.legal.slice(0,2).map(([title,text])=><section key={title}><h2>{title}</h2><p>{text}</p></section>)}<PurchasePolicy/>{c.legal.slice(2).map(([title,text])=><section key={title}><h2>{title}</h2><p>{text}</p></section>)}</PublicPage>}
