"use client";

import { MotionConfig, useReducedMotion } from "framer-motion";

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const reducedMotion = useReducedMotion();
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: reducedMotion ? 0 : 0.2, ease: "easeOut" }}>
      {children}
    </MotionConfig>
  );
}
