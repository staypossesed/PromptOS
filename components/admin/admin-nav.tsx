"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/generations", label: "Generations" },
  { href: "/admin/billing", label: "Billing" },
  { href: "/admin/feedback", label: "Feedback" },
  { href: "/model-lab", label: "Model lab" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <header className="app-nav">
      <div className="wrap app-nav__inner">
        <Link href="/admin" className="wordmark">Umprompt · Admin</Link>
        <nav className="app-nav__links" aria-label="Admin">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <Link href="/dashboard" className="button button--ghost button--small">Back to app</Link>
      </div>
    </header>
  );
}
