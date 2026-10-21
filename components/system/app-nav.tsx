"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/actions/auth";
import { ButtonLink } from "./button";

const links = [
  { href: "/builder", label: "Builder" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/history", label: "History" },
  { href: "/library", label: "Library" },
  { href: "/account", label: "Account" },
];

export function AppNav() {
  const pathname = usePathname();
  return (
    <header className="app-nav">
      <div className="wrap app-nav__inner">
        <Link href="/" className="wordmark" aria-label="Umprompt home">Umprompt</Link>
        <nav className="app-nav__links" aria-label="Workspace">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href || pathname.startsWith(link.href + "/") ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="nav__action">
          <ButtonLink href="/builder" variant="accent" size="sm">New prompt</ButtonLink>
          <form action={signOut} className="app-nav__signout">
            <button type="submit" className="button button--ghost button--small">Sign out</button>
          </form>
          <details className="app-nav__mobile">
            <summary className="button button--ghost button--small">Menu</summary>
            <div className="app-nav__mobile-panel">
              {links.map((link) => (
                <Link key={link.href} href={link.href} aria-current={pathname === link.href ? "page" : undefined}>
                  {link.label}
                </Link>
              ))}
              <Link href="/help">Help</Link>
              <form action={signOut}>
                <button type="submit" className="button button--ghost button--small">Sign out</button>
              </form>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
