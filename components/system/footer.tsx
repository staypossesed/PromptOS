import Link from "next/link";
import Image from "next/image";

export function Footer({ strip = false }: { strip?: boolean }) {
  return (
    <footer className="footer">
      {strip ? (
        <div className="footer__strip" aria-hidden="true">
          <Image src="/images/type-case.webp" width={1024} height={683} alt="" sizes="25vw" />
          <Image src="/images/card-catalogue.webp" width={1600} height={1353} alt="" sizes="25vw" />
          <Image src="/images/printed-book.webp" width={1024} height={888} alt="" sizes="25vw" />
          <Image src="/images/manuscript.webp" width={1200} height={1469} alt="" sizes="25vw" />
        </div>
      ) : null}
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
            <Link href="/help">Help</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </div>
          <div className="footer__col">
            <span className="muted">English interface</span>
            <a href="mailto:hello@umprompt.com">hello@umprompt.com</a>
          </div>
        </div>
        <div className="footer__meta">
          <span>Umprompt. Built for people who would rather think than prompt.</span>
          <span>Type case and printed book: CC0, via rawpixel. Card catalogue: Dr. Marcus Gossler, CC BY-SA 3.0. Manuscript: Ms Sarah Welch, CC BY-SA 4.0. Via Wikimedia Commons.</span>
        </div>
      </div>
    </footer>
  );
}
