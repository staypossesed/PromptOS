"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Home,
  Wand2,
  History,
  Sparkles,
  Settings,
  HelpCircle,
  Plus,
  LogOut,
  MessageSquare,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/app/actions/auth";
import { FeedbackModal } from "@/components/feedback/feedback-modal";
import type { User } from "@supabase/supabase-js";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const PRIMARY_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/history", label: "History", icon: History },
];

const SECONDARY_NAV: NavItem[] = [
  { href: "#templates", label: "Templates", icon: Sparkles, badge: "Soon" },
];

const FOOTER_NAV: NavItem[] = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/help", label: "Help & Docs", icon: HelpCircle },
];

export function Sidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <aside className="hidden lg:flex h-screen w-64 shrink-0 flex-col border-r border-ink-100/70 bg-cream-50/60 backdrop-blur-sm sticky top-0">
      {/* Brand */}
      <div className="flex h-16 items-center px-5 border-b border-ink-100/60">
        <Link href="/dashboard" className="flex items-center">
          <Logo />
        </Link>
      </div>

      {/* New Prompt CTA */}
      <div className="px-4 pt-4">
        <Button asChild className="w-full" size="default">
          <Link href="/builder">
            <Plus className="size-4" />
            New Prompt
          </Link>
        </Button>
      </div>

      {/* Primary nav */}
      <nav className="flex-1 px-3 py-5 overflow-y-auto">
        <NavGroup label="Workspace">
          {PRIMARY_NAV.map((item) => (
            <NavLink
              key={item.label}
              item={item}
              active={pathname === item.href.split("?")[0]}
            />
          ))}
          {/* Builder gets its own active check */}
          <NavLink
            item={{ href: "/builder", label: "Builder", icon: Wand2 }}
            active={pathname.startsWith("/builder")}
          />
        </NavGroup>

        <NavGroup label="Library" className="mt-6">
          {SECONDARY_NAV.map((item) => (
            <NavLink key={item.label} item={item} active={false} disabled />
          ))}
        </NavGroup>
      </nav>

      {/* Footer */}
      <div className="border-t border-ink-100/60 px-3 py-3">
        <NavGroup>
          {FOOTER_NAV.map((item) => (
            <NavLink key={item.label} item={item} active={pathname === item.href} muted />
          ))}
        </NavGroup>

        {/* Feedback */}
        <button
          type="button"
          onClick={() => setFeedbackOpen(true)}
          className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink-400 hover:bg-cream-100 hover:text-ink-700 transition-colors"
        >
          <MessageSquare className="size-[15px]" />
          Feedback
        </button>

        {/* Sign out */}
        <form action={signOut}>
          <button
            type="submit"
            className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink-400 hover:bg-cream-100 hover:text-destructive transition-colors mt-0.5"
          >
            <LogOut className="size-[15px]" />
            Sign out
          </button>
        </form>

        <FeedbackModal
          open={feedbackOpen}
          onClose={() => setFeedbackOpen(false)}
          page={pathname}
        />

        {/* Plan card */}
        <div className="mt-3 mx-1 rounded-xl border border-ink-100/80 bg-white p-3.5 card-soft">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-full bg-clay-500/10 flex items-center justify-center">
              <Sparkles className="size-3.5 text-clay-600" />
            </div>
            <div className="text-xs font-medium text-ink-800 truncate">
              {user?.email ?? "Free plan"}
            </div>
          </div>
          <div className="mt-2 text-[11px] leading-relaxed text-ink-400">
            Free plan · 20 gen/day
          </div>
        </div>

        {/* Legal links */}
        <div className="mt-3 flex items-center justify-center gap-3 pb-1">
          <Link href="/privacy" className="text-[10px] text-ink-300 hover:text-ink-500 transition-colors">
            Privacy
          </Link>
          <span className="text-[10px] text-ink-200">·</span>
          <Link href="/terms" className="text-[10px] text-ink-300 hover:text-ink-500 transition-colors">
            Terms
          </Link>
          <span className="text-[10px] text-ink-200">·</span>
          <Link href="/help" className="text-[10px] text-ink-300 hover:text-ink-500 transition-colors">
            Help
          </Link>
        </div>
      </div>
    </aside>
  );
}

function NavGroup({
  children,
  label,
  className,
}: {
  children: React.ReactNode;
  label?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      {label && (
        <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-300">
          {label}
        </div>
      )}
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

function NavLink({
  item,
  active,
  disabled,
  muted,
}: {
  item: NavItem;
  active: boolean;
  disabled?: boolean;
  muted?: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={disabled ? "#" : item.href}
      aria-disabled={disabled}
      onClick={disabled ? (e) => e.preventDefault() : undefined}
      className={cn(
        "group flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-clay-500/10 text-clay-700"
          : muted
          ? "text-ink-400 hover:bg-cream-100 hover:text-ink-700"
          : "text-ink-600 hover:bg-cream-100 hover:text-ink-900",
        disabled && "cursor-not-allowed opacity-60 hover:bg-transparent"
      )}
    >
      <span className="flex items-center gap-2.5">
        <Icon
          className={cn(
            "size-[15px]",
            active ? "text-clay-600" : "text-ink-300 group-hover:text-ink-500"
          )}
        />
        {item.label}
      </span>
      {item.badge && (
        <span className="text-[10px] uppercase tracking-wider text-ink-300 border border-ink-200/60 rounded-full px-1.5 py-0.5">
          {item.badge}
        </span>
      )}
    </Link>
  );
}
