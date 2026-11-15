const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { stripTypeScriptTypes } = require("node:module");

// Run these pure-module regressions without credentials or provider calls.
// Node 22.13+ supports native type stripping (the project requires Node 22+).
const root = path.resolve(__dirname, "..");
function moduleLoader(mocks = {}) {
  const urls = new Map();
  function url(filename) {
    if (urls.has(filename)) return urls.get(filename);
    let source = stripTypeScriptTypes(fs.readFileSync(path.join(root, filename), "utf8"));
    source = source.replace(/(from\s+)(["'])([^"']+)\2/g, (_, prefix, quote, specifier) => {
      let target;
      if (specifier in mocks) target = "data:text/javascript;base64," + Buffer.from(mocks[specifier]).toString("base64");
      else {
        const resolved = specifier.startsWith("@/") ? specifier.slice(2) : path.posix.join(path.posix.dirname(filename), specifier);
        target = url(resolved.endsWith(".ts") ? resolved : resolved + ".ts");
      }
      return prefix + JSON.stringify(target);
    });
    const target = "data:text/javascript;base64," + Buffer.from(source).toString("base64");
    urls.set(filename, target);
    return target;
  }
  return filename => import(url(filename));
}

const load = moduleLoader();
const fixture = { outputs: [], calls: [] };
globalThis[Symbol.for("umprompt:adam-test")] = fixture;
const ai = `
  const fixture = globalThis[Symbol.for("umprompt:adam-test")];
  export async function generateText(input) {
    fixture.calls.push(input);
    if (input.abortSignal?.aborted) throw input.abortSignal.reason;
    return { text: fixture.outputs.shift(), usage: { promptTokens: 1, completionTokens: 1 } };
  }
  export function streamText(input) { fixture.calls.push(input); return {}; }
`;
const modelMocks = {
  ai,
  "@/lib/ai/config": "export function resolveModel() { return { config: { factory: () => ({}) } }; }",
  "@/lib/workspace": 'export const REFINEMENT_INSTRUCTIONS = { simplify: "Simplify without changing the facts." };',
};
const loadModel = moduleLoader(modelMocks);
const spanish = "Escribe un mensaje breve para dar las gracias por la tarta de boda.";
const english = "Write a brief message to thank José at the bakery for the wedding cake.";
const score = { overall: 70, dimensions: [{ key: "clarity", label: "Clarity", score: 70, reason: "Unclear", tip: "Be clear" }] };

test("English output checks ignore José, Zoë and café but reject Spanish prose", async () => {
  const { outputMatchesLanguage, detectedOutputLanguage } = await load("lib/ai/output-policy.ts");
  for (const idea of [
    "thank José at the bakery for my wedding cake",
    "thank Zoë at the café for my wedding cake",
    "write to Zoë’s café about my wedding cake",
    english,
  ]) assert.equal(outputMatchesLanguage(idea, "en"), true, idea);
  assert.equal(detectedOutputLanguage(spanish), "es");
  assert.equal(outputMatchesLanguage(spanish, "en"), false);
  assert.equal(outputMatchesLanguage(spanish, "es"), true);
  assert.equal(outputMatchesLanguage("Напиши сообщение для пекарни и поблагодари за торт.", "en"), false);
});

test("generation explicitly honors every selected UI language in prompt, answer and refinement modes", async () => {
  const { buildMetaPrompt } = await loadModel("lib/ai/generate-prompt.ts");
  for (const outputLanguage of ["en", "ru", "es"]) {
    for (const delivery of ["prompt", "answer"]) {
      for (const idea of ["thank José at the bakery for my wedding cake", "thank Zoë’s café for my wedding cake", "ask Zoë at the café about my wedding cake"]) {
        const input = { idea, target_tool: "claude", outputLanguage, context: { universal: true, delivery } };
        for (const refinement of [undefined, { action: "simplify", prompt: spanish }]) {
          const meta = buildMetaPrompt({ ...input, refinement });
          assert.match(meta.system, new RegExp("Required output language: .*\\(" + outputLanguage + "\\)"));
          assert.match(meta.system, /takes precedence over.*names and places/);
          assert.ok(meta.user.includes(idea));
        }
      }
    }
  }
});

test("firm and formal cannot authorize invented landlord facts, deadlines or legal claims", async () => {
  const { buildMetaPrompt } = await loadModel("lib/ai/generate-prompt.ts");
  for (const delivery of ["prompt", "answer"]) {
    const meta = buildMetaPrompt({ idea: "ask my landlord to fix the broken heater", target_tool: "claude", outputLanguage: "en", context: { universal: true, delivery, clarifications: "Tone: Firm and formal" } });
    assert.match(meta.system, /firm and formal does not authorize/);
    assert.match(meta.system, /Do not add deadlines \(including 48 hours\)/);
    assert.match(meta.system, /legal claims.*tenancy laws/);
    assert.match(meta.system, /unsafe and uninhabitable/);
    assert.match(meta.system, /\[check this: deadline\]/);
    assert.match(meta.system, /existing generated draft is not a source of facts/);
  }
});

test("guest generation rejects a wrong-language response instead of returning it as success", async () => {
  const { generatePromptText } = await loadModel("lib/ai/generate-prompt.ts");
  fixture.outputs = [spanish]; fixture.calls = [];
  await assert.rejects(generatePromptText({ idea: "thank José", target_tool: "claude", outputLanguage: "en", context: { universal: true } }), /OUTPUT_LANGUAGE_MISMATCH/);
});

test("improvement corrects Spanish into the selected English and preserves fact rules", async () => {
  const { optimizePrompt } = await loadModel("lib/ai/optimize-prompt.ts");
  fixture.outputs = [spanish, english]; fixture.calls = [];
  assert.equal(await optimizePrompt({ idea: "thank José at the bakery", target_tool: "claude", context: { universal: true }, generated_prompt: spanish, score, outputLanguage: "en" }), english);
  assert.equal(fixture.calls.length, 2);
  assert.match(fixture.calls[0].system, /Required output language: English \(en\)/);
  assert.doesNotMatch(fixture.calls[0].system, /Preserve the language of the original prompt/);
  assert.match(fixture.calls[0].system, /Do not add deadlines/);
  fixture.outputs = [spanish, spanish]; fixture.calls = [];
  await assert.rejects(optimizePrompt({ idea: "thank José", target_tool: "claude", context: { universal: true }, generated_prompt: spanish, score, outputLanguage: "en" }), /OUTPUT_LANGUAGE_MISMATCH/);
});

test("optimization passes cancellation through to the provider", async () => {
  const { optimizePrompt } = await loadModel("lib/ai/optimize-prompt.ts");
  const controller = new AbortController(); controller.abort(new Error("cancelled"));
  await assert.rejects(optimizePrompt({ idea: "thank José", target_tool: "claude", generated_prompt: english, context: { universal: true }, score, outputLanguage: "en", signal: controller.signal }), /cancelled/);
});

test("handoff offers the three assistants, and study guidance only for study tasks", async () => {
  const { assistantLinks, handoffSteps, beginnerFeedback } = await load("lib/beginner-feedback.ts");
  assert.deepEqual(assistantLinks.map(item => item.name), ["ChatGPT", "Gemini", "Claude"]);
  for (const language of ["en", "ru", "es"]) {
    const copy = beginnerFeedback(language);
    assert.equal(handoffSteps("thank José at the bakery for my wedding cake", language).includes(copy.study), false);
    assert.equal(handoffSteps("Help me prepare for the NCLEX", language).includes(copy.study), true);
    assert.ok(copy.here && copy.estimate && copy.languageError);
  }
});

test("beginner actions keep the selected language, pointer target and nearby progress controls", () => {
  const ui = fs.readFileSync(path.join(root, "components/builder/start-experience.tsx"), "utf8");
  assert.doesNotMatch(ui, /detectTextLanguage/);
  assert.equal((ui.match(/outputLanguage: language/g) || []).length, 2);
  assert.match(ui, /type="submit" aria-busy=\{continuing\} onPointerDown=\{event => event.preventDefault\(\)\}/);
  assert.match(ui, /id="beginner-improve-status" role="status"/);
  assert.match(ui, /feedback\.estimate/);
  assert.match(ui, /controller\.current\?\.abort\(\)/);
  assert.match(ui, /void generate\("answer"\)/);
  assert.match(ui, /outputMatchesLanguage\(text, language\)/);
});
