const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");
const { buildSync } = require("esbuild");

const root = path.resolve(__dirname, "..");
const compiled = buildSync({
  stdin: {
    resolveDir: root,
    loader: "tsx",
    contents: `
    import {renderToStaticMarkup} from 'react-dom/server';
    import {PromptSheet} from './components/builder/prompt-sheet';
    import {ScoreMargin} from './components/builder/score-margin';
    import {ContextFields} from './components/builder/context-fields';
    export function sheet(props={}) {
      return renderToStaticMarkup(<PromptSheet prompt="Task: write a short email" targetTool="claude" {...props}/>);
    }
    export function score(props={}) {
      return renderToStaticMarkup(<ScoreMargin score={null} {...props}/>);
    }
    export function context(props={}) {
      return renderToStaticMarkup(<ContextFields value={{}} onChange={()=>{}} {...props}/>);
    }`,
  },
  absWorkingDir: root,
  alias: { "@": root, "next/link": path.join(root, "tests/stubs/link.cjs") },
  bundle: true,
  write: false,
  format: "cjs",
  platform: "node",
  jsx: "automatic",
  packages: "external",
  logLevel: "silent",
});
const loaded = new Module(path.join(__dirname, "composer-layout.fixture.cjs"), module);
loaded.filename = path.join(__dirname, "composer-layout.fixture.cjs");
loaded.paths = module.paths;
loaded._compile(compiled.outputFiles[0].text, loaded.filename);
const render = loaded.exports;

test("an empty prompt sheet is a document, not a fake result", () => {
  const html = render.sheet({ prompt: "" });
  assert.match(html, /Your prompt appears here/);
  assert.doesNotMatch(html, />Copy</);
});

test("a prompt sheet carries the document and its actions", () => {
  const html = render.sheet();
  assert.match(html, /Task: write a short email/);
  assert.match(html, />Copy</);
  assert.match(html, />Edit</);
  assert.match(html, />Download</);
  assert.match(html, />Generate again</);
});

test("an edited prompt is labelled as edited", () => {
  assert.match(render.sheet({ edited: true }), /Edited prompt/);
});

test("context fields stay closed until the writer asks for them", () => {
  const html = render.context();
  assert.match(html, /Add context/);
  assert.doesNotMatch(html, /Project type/);
});

const feedback = {
  overall: 81,
  dimensions: [
    { key: "clarity", label: "Clarity", score: 78, reason: "Ambiguous output", tip: "Specify the required output" },
  ],
};

test("the score margin shows the overall number, dimensions and tips", () => {
  const html = render.score({ score: feedback, onOptimize: () => {} });
  assert.match(html, />81</);
  assert.match(html, /Clarity/);
  assert.match(html, /Specify the required output/);
  assert.match(html, /Optimize this prompt/);
});

test("an empty score margin explains what will appear", () => {
  assert.match(render.score(), /A score appears after a prompt is generated/);
});

test("a scoring error offers a retry without hiding the explanation", () => {
  const html = render.score({ error: "Scoring failed.", onRetry: () => {} });
  assert.match(html, /Try scoring again/);
  assert.match(html, /Scoring failed/);
});

test("optimization is disabled when the page says it cannot run", () => {
  const html = render.score({ score: feedback, onOptimize: () => {}, optimizeDisabled: true });
  assert.match(html, /disabled=""/);
});
