"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IdeaComposer } from "@/components/builder/idea-composer";
import { ExpansionExample } from "@/components/builder/expansion-example";
import { ArrowRight } from "lucide-react";
import type { PromptContext } from "@/types/prompt";
import { composerCopy } from "@/lib/composer-copy";
import { useTranslations } from "@/lib/i18n/use-translations";

export function StartExperience() {
  const [idea, setIdea] = useState("");
  const [context, setContext] = useState<PromptContext>({ category: "auto", universal: true });
  const { language } = useTranslations();
  const copy = composerCopy(language);
  const router = useRouter();
  return <>
    <div className="mx-auto mb-8 max-w-5xl">
      <h1 className="text-3xl font-semibold leading-tight text-zinc-900">{copy.startTitle}</h1>
      <ol aria-label={copy.startTitle} className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-600">
        {[copy.workflow.idea, copy.workflow.prompt, copy.workflow.chatbot].map((step, index) => <li key={step} className="flex items-center gap-3">
          {index > 0 && <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-zinc-400" />}
          <span className="font-medium">{step}</span>
        </li>)}
      </ol>
    </div>
    <IdeaComposer guest idea={idea} onIdeaChange={setIdea} context={context} onContextChange={setContext}
      example={<ExpansionExample copy={copy.expansionExample} onUse={!idea.trim() ? () => {
        setIdea(copy.expansionExample.idea);
        setContext({ ...context, category: "writing", universal: true, clarifications: undefined });
        document.getElementById("studio-idea")?.focus();
      } : undefined} />}
      onGenerate={(nextContext) => {
        try { sessionStorage.setItem("ump:idea_draft", JSON.stringify({ idea, context: nextContext })); }
        catch { throw new Error("Your browser could not keep this draft. Please open the builder to continue."); }
        router.push("/builder");
      }}
    />
  </>;
}
