import Link from "next/link";

export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer__wordmark" aria-hidden="true">Umprompt</div>
        <div className="footer__grid">
          <div className="footer__col">
            <p className="small" style={{ maxWidth: "28ch" }}>
              Turn a rough everyday idea into a clear, structured prompt for any assistant.
            </p>
          </div>
          <div className="footer__col">
            <Link href="/builder">Builder</Link>
            <Link href="/plan">Plans</Link>
            <Link href="/templates">Templates</Link>
          </div>
          <div className="footer__col">
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/history">History</Link>
            <Link href="/library">Library</Link>
          </div>
          <div className="footer__col">
            <Link href="/help">Help</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </div>
        </div>
        <div className="footer__meta">
          <span>Umprompt. Built for people who would rather think than prompt.</span>
          <span>English interface</span>
        </div>
      </div>
    </footer>
  );
}
