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
  FlaskConical,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/app/actions/auth";
import { FeedbackModal } from "@/components/feedback/feedback-modal";
import type { User } from "@supabase/supabase-js";
import { useTranslations } from "@/lib/i18n/use-translations";

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export function Sidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const { t } = useTranslations();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const PRIMARY_NAV: NavItem[] = [
    { href: "/dashboard", labelKey: "nav.dashboard", icon: Home },
    { href: "/history", labelKey: "nav.history", icon: History },
  ];

  const SECONDARY_NAV: NavItem[] = [
    { href: "/templates", labelKey: "nav.templates", icon: Sparkles },
    { href: "/model-lab", labelKey: "nav.modelLab", icon: FlaskConical, badge: t("plan.badge") },
  ];

  const FOOTER_NAV: NavItem[] = [
    { href: "/settings", labelKey: "nav.settings", icon: Settings },
    { href: "/help", labelKey: "nav.help", icon: HelpCircle },
  ];

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
            {t("nav.newPrompt")}
          </Link>
        </Button>
      </div>

      {/* Primary nav */}
      <nav className="flex-1 px-3 py-5 overflow-y-auto">
        <NavGroup label={t("nav.workspace")}>
          {PRIMARY_NAV.map((item) => (
            <NavLink
              key={item.labelKey}
              label={t(item.labelKey)}
              href={item.href}
              icon={item.icon}
              active={pathname === item.href.split("?")[0]}
            />
          ))}
          <NavLink
            label={t("nav.builder")}
            href="/builder"
            icon={Wand2}
            active={pathname.startsWith("/builder")}
          />
        </NavGroup>

        <NavGroup label={t("nav.library")} className="mt-6">
          {SECONDARY_NAV.map((item) => (
            <NavLink
              key={item.labelKey}
              label={t(item.labelKey)}
              href={item.href}
              icon={item.icon}
              active={pathname === item.href}
              badge={item.badge}
            />
          ))}
        </NavGroup>
      </nav>

      {/* Footer */}
      <div className="border-t border-ink-100/60 px-3 py-3">
        <NavGroup>
          {FOOTER_NAV.map((item) => (
            <NavLink
              key={item.labelKey}
              label={t(item.labelKey)}
              href={item.href}
              icon={item.icon}
              active={pathname === item.href}
              muted
            />
          ))}
        </NavGroup>

        {/* Feedback */}
        <button
          type="button"
          onClick={() => setFeedbackOpen(true)}
          className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink-400 hover:bg-cream-100 hover:text-ink-700 transition-colors"
        >
          <MessageSquare className="size-[15px]" />
          {t("nav.feedback")}
        </button>

        {/* Sign out */}
        <form action={signOut}>
          <button
            type="submit"
            className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink-400 hover:bg-cream-100 hover:text-destructive transition-colors mt-0.5"
          >
            <LogOut className="size-[15px]" />
            {t("nav.signOut")}
          </button>
        </form>

        <FeedbackModal
          open={feedbackOpen}
          onClose={() => setFeedbackOpen(false)}
          page={pathname}
        />

        {/* Plan card */}
        <Link
          href="/account"
          className="mt-3 mx-1 rounded-xl border border-ink-100/80 bg-card p-3.5 card-soft flex items-center gap-2 hover:border-ink-200/80 hover:bg-cream-100/60 transition-colors"
        >
          <div className="size-7 rounded-full bg-clay-500/10 flex items-center justify-center shrink-0">
            <Sparkles className="size-3.5 text-clay-600" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-medium text-ink-800 truncate">
              {user?.email ?? t("nav.workspace")}
            </div>
            <div className="text-[10px] text-ink-400 leading-snug">
              {t("plan.free")}
            </div>
          </div>
        </Link>

        {/* Legal links */}
        <div className="mt-3 flex items-center justify-center gap-3 pb-1">
          <Link href="/privacy" className="text-[10px] text-ink-300 hover:text-ink-500 transition-colors">
            {t("nav.privacy")}
          </Link>
          <span className="text-[10px] text-ink-200">·</span>
          <Link href="/terms" className="text-[10px] text-ink-300 hover:text-ink-500 transition-colors">
            {t("nav.terms")}
          </Link>
          <span className="text-[10px] text-ink-200">·</span>
          <Link href="/help" className="text-[10px] text-ink-300 hover:text-ink-500 transition-colors">
            {t("nav.help")}
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
  label,
  href,
  icon: Icon,
  active,
  disabled,
  muted,
  badge,
}: {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  disabled?: boolean;
  muted?: boolean;
  badge?: string;
}) {
  return (
    <Link
      href={disabled ? "#" : href}
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
        {label}
      </span>
      {badge && (
        <span className="text-[10px] uppercase tracking-wider text-[#7A520E] bg-[#D9952F]/10 border border-[#D9952F]/30 rounded-full px-1.5 py-0.5">
          {badge}
        </span>
      )}
    </Link>
  );
}
