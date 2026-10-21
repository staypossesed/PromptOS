import Link from "next/link";
import { ButtonLink } from "./button";

export function Nav() {
  return (
    <header className="nav">
      <div className="wrap nav__inner">
        <Link href="/" className="wordmark" aria-label="Umprompt home">Umprompt</Link>
        <nav className="nav__links" aria-label="Product">
          <a href="#product">Product</a>
          <a href="#how">How it works</a>
          <a href="#pricing">Plans</a>
        </nav>
        <div className="nav__action">
          <Link href="/login" className="small nav__signin">Sign in</Link>
          <ButtonLink href="/builder" variant="accent" size="sm">Start free</ButtonLink>
          <details className="nav__mobile">
            <summary className="button button--ghost button--small">Menu</summary>
            <div className="nav__mobile-panel">
              <a href="#product">Product</a>
              <a href="#how">How it works</a>
              <a href="#pricing">Plans</a>
              <Link href="/help">Help</Link>
              <Link href="/login">Sign in</Link>
              <ButtonLink href="/builder" variant="accent" size="sm">Start free</ButtonLink>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
