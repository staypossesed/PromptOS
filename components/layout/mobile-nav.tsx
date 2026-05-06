"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, Home, Wand2, History, Sparkles, Settings, HelpCircle, Plus } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
}

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/builder", label: "New Prompt", icon: Wand2 },
  { href: "/history", label: "History", icon: History },
  { href: "#templates", label: "Templates", icon: Sparkles, disabled: true },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/help", label: "Help & Docs", icon: HelpCircle },
];

export function MobileNav({ open, onClose }: MobileNavProps) {
  const pathname = usePathname();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-ink-900/30 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed left-0 top-0 z-50 flex h-screen w-72 flex-col bg-cream-50 border-r border-ink-100 lg:hidden"
          >
            <div className="flex h-16 items-center justify-between px-5 border-b border-ink-100/60">
              <Logo />
              <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
                <X className="size-5" />
              </Button>
            </div>

            <div className="px-4 pt-4">
              <Button asChild className="w-full" onClick={onClose}>
                <Link href="/builder">
                  <Plus className="size-4" />
                  New Prompt
                </Link>
              </Button>
            </div>

            <nav className="flex-1 px-3 py-5 flex flex-col gap-0.5">
              {NAV.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href.split("?")[0];
                return (
                  <Link
                    key={item.label}
                    href={item.disabled ? "#" : item.href}
                    onClick={(e) => {
                      if (item.disabled) e.preventDefault();
                      else onClose();
                    }}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-clay-500/10 text-clay-700"
                        : "text-ink-700 hover:bg-cream-100",
                      item.disabled && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
