"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { hashSeed } from "@/lib/idea-suggestions";

export function useIdeaSuggestions() {
  const [seed, setSeed] = useState(0);
  useEffect(() => {
    let active = true;
    const supabase = createClient();
    function update(user: { id: string; last_sign_in_at?: string } | null) {
      const sessionKey = user ? `${user.id}:${user.last_sign_in_at ?? "initial"}` : "guest";
      let nextSeed = hashSeed(sessionKey);
      try {
        const previous = JSON.parse(localStorage.getItem("ump:inspiration") ?? "null") as { key: string; seed: number } | null;
        if (previous?.key === sessionKey && Number.isFinite(previous.seed)) nextSeed = previous.seed;
        else {
          nextSeed = Math.floor(Math.random() * 0xffffffff);
          localStorage.setItem("ump:inspiration", JSON.stringify({ key: sessionKey, seed: nextSeed }));
        }
      } catch { /* Storage is optional; the sign-in timestamp still changes the seed. */ }
      if (active) setSeed(nextSeed);
    }
    void supabase.auth.getUser().then(({ data }) => update(data.user)).catch(() => update(null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") update(session?.user ?? null);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);
  return { seed, refresh: () => setSeed((current) => hashSeed(String(current + 1))) };
}
