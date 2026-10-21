const DIMENSIONS = [
  ["Clarity", 88],
  ["Context", 84],
  ["Constraints", 76],
  ["Examples", 58],
  ["Output format", 90],
  ["Tool fit", 86],
] as const;

export function BuilderPanel() {
  return (
    <div className="workspace-visual" data-ui>
      <article className="workspace-sheet workspace-composer" data-ui>
        <div className="workspace-sheet__head">
          <span>Composer</span>
          <span>Everyday</span>
        </div>
        <p className="workspace-composer__idea">
          Plan a two-week study schedule for a history exam. I lose focus after forty minutes.
        </p>
        <div className="composer__chips">
          <span className="composer__chip" aria-pressed="true">Writing</span>
          <span className="composer__chip">Coding</span>
          <span className="composer__chip">Research</span>
        </div>
        <span className="button button--accent button--small">Generate prompt</span>
      </article>

      <article className="workspace-sheet workspace-score" data-ui>
        <span className="workspace-score__label">Prompt score</span>
        <div className="workspace-score__total">82<span>/100</span></div>
        <p className="workspace-score__note">Six weighted dimensions</p>
        <div className="workspace-score__rows">
          {DIMENSIONS.map(([name, value]) => (
            <div className="workspace-score__row" key={name}>
              <span>{name}</span>
              <span>{value}</span>
            </div>
          ))}
        </div>
      </article>

      <article className="workspace-sheet workspace-history" data-ui>
        <div className="workspace-sheet__head">
          <span>History</span>
          <span>3 saved</span>
        </div>
        <div className="workspace-history__row"><span>Study plan</span><span>82/100</span></div>
        <div className="workspace-history__row"><span>Launch email</span><span>86/100</span></div>
        <div className="workspace-history__row"><span>Debug hook</span><span>91/100</span></div>
      </article>
    </div>
  );
}
