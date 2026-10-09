"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Pause, Play } from "lucide-react";

export function IdeaPlaceholder({ active, examples, pauseLabel, resumeLabel }: {
  active: boolean;
  examples: string[];
  pauseLabel: string;
  resumeLabel: string;
}) {
  const reducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setMounted(true);
    const updateVisibility = () => setVisible(!document.hidden);
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  useEffect(() => {
    if (!active || paused || !visible || reducedMotion !== false || examples.length < 2) return;
    const timer = setInterval(() => setIndex((current) => (current + 1) % examples.length), 4500);
    return () => clearInterval(timer);
  }, [active, paused, visible, reducedMotion, examples]);

  if (!active || !examples.length) return null;
  const example = examples[reducedMotion ? 0 : index % examples.length];
  return <>
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 p-5 sm:p-6">
      <AnimatePresence mode="wait" initial={false}>
        <motion.p key={example} data-idea-example
          initial={{ opacity: 0, y: reducedMotion ? 0 : 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reducedMotion ? 0 : -6 }}
          transition={{ duration: reducedMotion ? 0 : 0.22 }}
          className="text-base leading-relaxed text-zinc-500">{example}</motion.p>
      </AnimatePresence>
    </div>
    {mounted && reducedMotion === false && <button type="button" aria-pressed={paused} aria-label={paused ? resumeLabel : pauseLabel} title={paused ? resumeLabel : pauseLabel}
      onClick={() => setPaused((current) => !current)}
      className="absolute bottom-3 right-4 flex size-11 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700">
      {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
    </button>}
  </>;
}
