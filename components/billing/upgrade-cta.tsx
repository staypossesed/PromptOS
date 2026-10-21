import Link from "next/link";

export function UpgradeCta({ returnTo = "/builder?resume=checkout" }: { returnTo?: string }) {
  return (
    <div className="sheet sheet--surface">
      <div className="stack">
        <p className="small muted">Two or fewer free prompts left this week.</p>
        <p className="body">
          Keep the task and remove the limit. Pro adds prompt packs, library profiles, and
          playbooks.
        </p>
        <Link href={`/plan?returnTo=${encodeURIComponent(returnTo)}`} className="button button--accent button--small">
          See the plans
        </Link>
      </div>
    </div>
  );
}
