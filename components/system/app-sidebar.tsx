"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/actions/auth";
import { ButtonLink } from "./button";

const groups = [
  {
    label: "Create",
    links: [{ href: "/builder", label: "Builder" }],
  },
  {
    label: "Workspace",
    links: [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/history", label: "History" },
      { href: "/library", label: "Library" },
      { href: "/templates", label: "Templates" },
    ],
  },
  {
    label: "You",
    links: [
      { href: "/account", label: "Account" },
      { href: "/plan", label: "Plans" },
      { href: "/help", label: "Help" },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="app-sidebar">
      <div className="stack">
        <Link href="/" className="wordmark" aria-label="Umprompt home">Umprompt</Link>
        <ButtonLink href="/builder" variant="accent" full>New prompt</ButtonLink>
      </div>

      <nav className="app-sidebar__nav" aria-label="Workspace">
        {groups.map((group) => (
          <div className="app-sidebar__group" key={group.label}>
            <p className="app-sidebar__label">{group.label}</p>
            {group.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="app-sidebar__link"
                aria-current={pathname === link.href || pathname.startsWith(link.href + "/") ? "page" : undefined}
              >
                {link.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="app-sidebar__foot">
        <p className="small muted">English interface</p>
        <form action={signOut}>
          <button type="submit" className="button button--ghost button--small">Sign out</button>
        </form>
      </div>
    </aside>
  );
}
