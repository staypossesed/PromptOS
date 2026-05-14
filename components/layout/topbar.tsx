"use client";

import Link from "next/link";
import { Search, Menu, LogOut, Settings, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MobileNav } from "@/components/layout/mobile-nav";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/app/actions/auth";
import { motion, AnimatePresence } from "framer-motion";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface TopbarProps {
  title?: string;
  breadcrumb?: { label: string; href?: string }[];
  actions?: React.ReactNode;
}

export function Topbar({ title, breadcrumb, actions }: TopbarProps) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const q = searchValue.trim();
      if (!q) return;
      router.push(`/history?q=${encodeURIComponent(q)}`);
    },
    [searchValue, router]
  );

  // Resolve current user on the client
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));

    // Keep in sync if auth state changes (e.g. token refresh, sign-out in another tab)
    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // Close menu on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [menuOpen]);

  // Derive initials and display name from the user object
  const displayEmail = user?.email ?? "";
  const initials = displayEmail
    ? displayEmail.slice(0, 2).toUpperCase()
    : "??";

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-ink-100/70 bg-cream-50/85 backdrop-blur-md px-4 lg:px-8">
        {/* Left: mobile menu + breadcrumb */}
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-5" />
          </Button>

          {breadcrumb && breadcrumb.length > 0 ? (
            <nav className="flex items-center gap-1.5 text-sm text-ink-400 min-w-0">
              {breadcrumb.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1.5 min-w-0">
                  <span
                    className={
                      i === breadcrumb.length - 1
                        ? "text-ink-800 font-medium truncate"
                        : "truncate"
                    }
                  >
                    {crumb.label}
                  </span>
                  {i < breadcrumb.length - 1 && (
                    <span className="text-ink-200">/</span>
                  )}
                </span>
              ))}
            </nav>
          ) : title ? (
            <h1 className="font-serif text-lg font-medium text-ink-900 truncate">
              {title}
            </h1>
          ) : null}
        </div>

        {/* Right: search · actions · notifications · user menu */}
        <div className="flex items-center gap-2">
          <form
            onSubmit={handleSearch}
            className="hidden md:flex items-center gap-2 h-9 w-64 xl:w-72 rounded-full bg-white border border-ink-200/60 px-3.5 text-sm focus-within:border-ink-300 focus-within:ring-1 focus-within:ring-ink-200/60 transition-all"
          >
            <Search className="size-4 shrink-0 text-ink-300" />
            <input
              type="search"
              placeholder="Search prompts…"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="flex-1 bg-transparent outline-none text-ink-700 placeholder:text-ink-300 text-sm"
            />
          </form>

          {actions}

          {/* Avatar + dropdown */}
          <div className="relative ml-1" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="size-9 rounded-full bg-gradient-to-br from-clay-300 to-clay-500 text-white text-xs font-semibold flex items-center justify-center ring-2 ring-white/60 hover:ring-clay-200 transition-all focus-visible:outline-none focus-visible:ring-clay-400"
              aria-label="Account menu"
              aria-expanded={menuOpen}
              aria-haspopup="true"
            >
              {initials}
            </button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -6 }}
                  transition={{ duration: 0.14, ease: "easeOut" }}
                  className="absolute right-0 top-11 z-50 w-60 rounded-2xl border border-ink-100/70 bg-card card-soft-lg overflow-hidden"
                >
                  {/* User info */}
                  <div className="px-4 py-3.5 border-b border-ink-100/60">
                    <div className="flex items-center gap-2.5">
                      <div className="size-8 rounded-full bg-gradient-to-br from-clay-300 to-clay-500 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-ink-900 truncate">
                          {displayEmail || "Loading…"}
                        </div>
                        <div className="text-[11px] text-ink-400">Free plan</div>
                      </div>
                    </div>
                  </div>

                  {/* Menu items */}
                  <div className="p-1.5">
                    <UserMenuLink href="/settings" icon={User} label="Account" onClick={() => setMenuOpen(false)} />
                    <UserMenuLink href="/settings" icon={Settings} label="Settings" onClick={() => setMenuOpen(false)} />
                  </div>

                  <div className="border-t border-ink-100/60 p-1.5">
                    {/* Sign out via server action in a form */}
                    <form action={signOut}>
                      <button
                        type="submit"
                        className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/5 transition-colors"
                      >
                        <LogOut className="size-4 shrink-0" />
                        Sign out
                      </button>
                    </form>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  );
}

function UserMenuLink({
  href,
  icon: Icon,
  label,
  onClick,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink-700 hover:bg-cream-100 transition-colors"
    >
      <Icon className="size-4 shrink-0 text-ink-400" />
      {label}
    </Link>
  );
}
