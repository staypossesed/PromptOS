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
    <header className="nav">
      <div className="wrap nav__inner">
        <Link href="/admin" className="wordmark">Umprompt · Admin</Link>
        <nav className="nav__links" aria-label="Admin">
          {links.map((link) => (
            <Link key={link.href} href={link.href} aria-current={pathname === link.href ? "page" : undefined}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="nav__action">
          <Link href="/dashboard" className="small nav__signin">Back to app</Link>
          <details className="nav__mobile">
            <summary className="button button--ghost button--small">Menu</summary>
            <div className="nav__mobile-panel">
              {links.map((link) => (
                <Link key={link.href} href={link.href} aria-current={pathname === link.href ? "page" : undefined}>
                  {link.label}
                </Link>
              ))}
              <Link href="/dashboard">Back to app</Link>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
