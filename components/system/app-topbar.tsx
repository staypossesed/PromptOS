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
  { href: "/templates", label: "Templates" },
  { href: "/account", label: "Account" },
  { href: "/help", label: "Help" },
  { href: "/plan", label: "Plans" },
];

export function AppTopbar() {
  const pathname = usePathname();

  return (
    <>
      <header className="app-topbar">
        <Link href="/" className="wordmark" aria-label="Umprompt home">Umprompt</Link>
        <div className="nav__action">
          <ButtonLink href="/builder" variant="accent" size="sm">New</ButtonLink>
          <details className="app-topbar__menu">
            <summary className="button button--ghost button--small">Menu</summary>
            <div className="app-topbar__panel">
              {links.map((link) => (
                <Link key={link.href} href={link.href} aria-current={pathname === link.href ? "page" : undefined}>
                  {link.label}
                </Link>
              ))}
              <form action={signOut}>
                <button type="submit" className="button button--ghost button--small">Sign out</button>
              </form>
            </div>
          </details>
        </div>
      </header>

      <nav className="app-bottomnav" aria-label="Primary">
        <Link href="/builder" aria-current={pathname === "/builder" ? "page" : undefined}>Create</Link>
        <Link href="/dashboard" aria-current={pathname === "/dashboard" ? "page" : undefined}>Dashboard</Link>
        <Link href="/library" aria-current={pathname === "/library" ? "page" : undefined}>Library</Link>
        <Link href="/account" aria-current={pathname === "/account" ? "page" : undefined}>Account</Link>
      </nav>
    </>
  );
}
