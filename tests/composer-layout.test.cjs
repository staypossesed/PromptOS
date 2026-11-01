const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");
const { buildSync } = require("esbuild");

const root = path.resolve(__dirname, "..");
const compiled = buildSync({
  stdin: { resolveDir: root, loader: "tsx", contents: `
    import {renderToStaticMarkup} from 'react-dom/server';
    import {IdeaComposer} from './components/builder/idea-composer';
    import {ExpansionExample} from './components/builder/expansion-example';
    import {ScorePanel} from './components/builder/score-panel';
    import {LanguageProvider} from './lib/i18n/language-provider';
    import {composerCopy} from './lib/composer-copy';
    import {AppRouterContext} from 'next/dist/shared/lib/app-router-context.shared-runtime';
    function Frame({children}) { return <AppRouterContext.Provider value={{refresh(){}}}><LanguageProvider>{children}</LanguageProvider></AppRouterContext.Provider>; }
    export function composer(props={}) {
      return renderToStaticMarkup(<Frame><IdeaComposer
        idea="Write a polite email" context={{universal:true}}
        onIdeaChange={()=>{}} onContextChange={()=>{}} onGenerate={()=>{}} onSave={()=>{}}
        result={<p>Current generated prompt</p>}
        example={<ExpansionExample copy={composerCopy('en').expansionExample}/>}
        {...props}/></Frame>);
    }
    export function score(props={}) {
      return renderToStaticMarkup(<Frame><ScorePanel score={null} onRetry={()=>{}} onOptimize={()=>{}} {...props}/></Frame>);
    }`,
  },
  absWorkingDir: root, alias: { "@": root }, bundle: true, write: false,
  format: "cjs", platform: "node", jsx: "automatic", packages: "external",
  logLevel: "silent",
});
const loaded = new Module(path.join(__dirname, "composer-layout.fixture.cjs"), module);
loaded.filename = path.join(__dirname, "composer-layout.fixture.cjs");
loaded.paths = module.paths;
loaded._compile(compiled.outputFiles[0].text, loaded.filename);
const render = loaded.exports;

test("the introductory example remains available before a request starts", () => {
  assert.match(render.composer(), /data-expansion-example/);
});

test("streaming and existing results contain no example or competing result tabs", () => {
  for (const props of [{ generating: true }, { hasResult: true }]) {
    const html = render.composer(props);
    assert.doesNotMatch(html, /data-expansion-example|role="tab|>Example</);
    assert.match(html, /Current generated prompt/);
    assert.match(html, />Save</);
  }
});

test("saved results show the complete original idea and an explicit Edit action", () => {
  const idea = "A long original idea with all its details. ".repeat(40) + "FINAL DETAIL MUST REMAIN VISIBLE";
  const html = render.composer({ hasResult: true, idea });
  assert.match(html, /aria-label="Edit idea"/);
  assert.match(html, /data-rough-idea/);
  assert.match(html, /FINAL DETAIL MUST REMAIN VISIBLE/);
  assert.doesNotMatch(html, /line-clamp|text-overflow/);
});

test("copying reveals explicit usefulness choices beside the result, before next tasks and quality", () => {
  const html = render.composer({ hasResult: true, outcomeEligible: true, nextActions: "Next task marker" });
  assert.match(html, /Did you get a useful answer/);
  assert.match(html, /Not tried yet/);
  assert.ok(html.indexOf("data-outcome-feedback") < html.indexOf("Next task marker"));
});

test("confirmed feedback survives result remounting instead of asking for the same vote again", () => {
  for (const outcomeValue of [true, false]) {
    const html = render.composer({ hasResult: true, outcomeEligible: true, outcomeValue });
    assert.match(html, /Thanks for the feedback/);
    assert.doesNotMatch(html, />Not tried yet</);
  }
});

const feedback = { overall: 81, dimensions: [
  { key: "clarity", label: "Clarity", score: 78, reason: "Ambiguous output", tip: "Specify the required output" },
] };

test("criteria-based optimization is visible beside the score, before the criteria list", () => {
  const html = render.score({ score: feedback });
  assert.equal((html.match(/Optimize using feedback/g) || []).length, 1);
  assert.ok(html.indexOf("Optimize using feedback") < html.indexOf("Clarity"));
  assert.doesNotMatch(html, /disabled=""/);
});

test("score actions prevent overlapping optimization, scoring and saving", () => {
  for (const props of [{ isOptimizing: true }, { isScoring: true }, { optimizeDisabled: true }]) {
    assert.match(render.score({ score: feedback, ...props }), /disabled=""/);
  }
});

test("an edited prompt without a current score can be checked again", () => {
  assert.match(render.score(), />Quality check</);
});

test("failed optimization is reported without hiding the current score", () => {
  const html = render.score({ score: feedback, optimizeError: "Your original is unchanged." });
  assert.match(html, /role="alert"/);
  assert.match(html, /Your original is unchanged/);
  assert.match(html, /Clarity/);
});
