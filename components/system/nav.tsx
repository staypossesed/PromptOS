import Link from "next/link";
import { ButtonLink } from "./button";

export function Nav() {
  return (
    <header className="nav">
      <div className="wrap nav__inner">
        <Link href="/" className="wordmark" aria-label="Umprompt home">Umprompt</Link>
        <nav className="nav__links" aria-label="Main">
          <Link href="/#how">How it works</Link>
          <Link href="/#pricing">Plans</Link>
          <Link href="/help">Help</Link>
        </nav>
        <div className="nav__action">
          <Link href="/login" className="small nav__signin">Sign in</Link>
          <ButtonLink href="/builder" variant="accent" size="sm">Start with an idea</ButtonLink>
          <details className="nav__mobile">
            <summary className="button button--ghost button--small">Menu</summary>
            <div className="nav__mobile-panel">
              <Link href="/#how">How it works</Link>
              <Link href="/plan">Plans</Link>
              <Link href="/help">Help</Link>
              <Link href="/login">Sign in</Link>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
