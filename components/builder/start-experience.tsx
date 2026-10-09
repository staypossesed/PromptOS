"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IdeaComposer } from "@/components/builder/idea-composer";
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
    <div className="mx-auto mb-8 max-w-3xl">
      <h1 className="text-3xl font-semibold leading-tight text-zinc-900">{copy.startTitle}</h1>
      <p className="mt-3 text-base leading-relaxed text-zinc-600">{copy.startSubtitle}</p>
    </div>
    <IdeaComposer guest idea={idea} onIdeaChange={setIdea} context={context} onContextChange={setContext}
      onGenerate={(nextContext) => {
        try { sessionStorage.setItem("ump:idea_draft", JSON.stringify({ idea, context: nextContext })); }
        catch { throw new Error("Your browser could not keep this draft. Please open the builder to continue."); }
        router.push("/builder");
      }}
    />
  </>;
}
