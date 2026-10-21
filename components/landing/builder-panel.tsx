export function BuilderPanel() {
  return (
    <div className="notes__panel" data-ui>
      <div className="composer__mode" style={{ marginBottom: 18 }}>
        <button type="button" aria-pressed="true">Single prompt</button>
        <button type="button" aria-pressed="false">Prompt pack</button>
      </div>
      <label className="field__label" htmlFor="panel-idea">What do you want to do?</label>
      <textarea
        id="panel-idea"
        className="field__textarea"
        defaultValue="Plan a two-week study schedule for a history exam. I lose focus after forty minutes."
        rows={3}
        readOnly
        style={{ marginBottom: 16 }}
      />
      <div className="composer__chips" style={{ marginBottom: 18 }}>
        <span className="composer__chip" aria-pressed="true">Writing</span>
        <span className="composer__chip">Coding</span>
        <span className="composer__chip">Research</span>
        <span className="composer__chip">Everyday</span>
      </div>
      <div className="score" data-ui style={{ background: "var(--surface)", padding: 18 }}>
        <div className="score__total">82</div>
        <div className="score__row"><span className="score__name">Clarity</span><span className="score__value">88</span></div>
        <div className="score__row"><span className="score__name">Context</span><span className="score__value">84</span></div>
        <div className="score__row"><span className="score__name">Constraints</span><span className="score__value">76</span></div>
        <div className="score__row"><span className="score__name">Examples</span><span className="score__value">58</span></div>
        <div className="score__row"><span className="score__name">Output format</span><span className="score__value">90</span></div>
        <div className="score__row"><span className="score__name">Tool fit</span><span className="score__value">86</span></div>
      </div>
      <div className="composer__actions" style={{ marginTop: 18 }}>
        <span className="button button--accent button--small">Generate prompt</span>
        <span className="small muted">7 free prompts a week</span>
      </div>
    </div>
  );
}
