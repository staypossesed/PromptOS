export function ExampleSpread() {
  return (
    <div className="split">
      <div className="split__page split__page--dark">
        <p className="split__text">
          “Make a study plan for my history exam. I have two weeks and I keep getting distracted.”
        </p>
        <p className="split__hint">
          No prompt knowledge. No template. Just the request as it arrives.
        </p>
      </div>
      <div className="split__page split__page--light">
        <div className="prompt-doc" style={{ padding: 0 }} data-ui>
          <div className="prompt-doc__section">
            <span className="prompt-doc__label">Task</span>
            <p>Build a two-week study schedule for a history exam.</p>
          </div>
          <div className="prompt-doc__section">
            <span className="prompt-doc__label">Context</span>
            <p>A student with two weeks, limited focus, and a large body of material.</p>
          </div>
          <div className="prompt-doc__section">
            <span className="prompt-doc__label">Constraints</span>
            <p>Use only the material supplied. Keep sessions under forty minutes. Leave one rest day in each week.</p>
          </div>
          <div className="prompt-doc__section">
            <span className="prompt-doc__label">Output</span>
            <p>A day-by-day table with the topic, the activity, and the time. Add a short note on what to do when focus drops.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
