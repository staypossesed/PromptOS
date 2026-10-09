"use client";

import { useEffect, useId, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";

export function Disclosure({ label, open, onOpenChange, children }: {
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  const id = useId();
  const reducedMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => { panelRef.current?.toggleAttribute("inert", !open); }, [open]);
  return (
    <div className="mt-4 border-b border-zinc-200 pb-4">
      <button type="button" aria-expanded={open} aria-controls={id}
        onClick={() => onOpenChange(!open)}
        className="motion-press flex min-h-11 items-center gap-2 text-base text-zinc-600 hover:text-emerald-700 transition-colors">
        <ChevronDown className={`size-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        {label}
      </button>
      <motion.div id={id} initial={false} aria-hidden={!open}
        ref={panelRef}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="overflow-hidden">
        {children}
      </motion.div>
    </div>
  );
}
