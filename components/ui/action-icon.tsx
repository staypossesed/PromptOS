"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Loader2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function ActionIcon({ pending, success, icon, className }: {
  pending?: boolean;
  success?: boolean;
  icon: LucideIcon;
  className?: string;
}) {
  const reducedMotion = useReducedMotion();
  const state = pending ? "pending" : success ? "success" : "idle";
  const Icon = pending ? Loader2 : success ? Check : icon;
  return (
    <span aria-hidden="true" className={cn("inline-grid size-4 shrink-0 place-items-center", className)}>
      <AnimatePresence initial={false} mode="wait">
        <motion.span key={state} className="col-start-1 row-start-1 inline-flex"
          initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.6, rotate: reducedMotion ? 0 : -15 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: reducedMotion ? 1 : 0.85 }}
          transition={{ duration: reducedMotion ? 0 : 0.18 }}>
          <Icon className={cn("size-4", pending && "animate-spin")} />
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
