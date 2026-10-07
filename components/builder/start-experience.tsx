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
      <h1 className="font-serif text-3xl font-semibold text-zinc-900">Umprompt</h1>
      <h2 className="mt-5 text-xl font-medium text-zinc-800">{copy.title}</h2>
      <p className="mt-2 text-sm text-zinc-500">{copy.subtitle}</p>
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
