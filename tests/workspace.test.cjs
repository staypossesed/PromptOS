const test = require("node:test");
const assert = require("node:assert/strict");
const { loadTS } = require("../scripts/load-ts.cjs");
const { parseWorkspaceItem, rememberVersion, nextSteps, nextStepIdea, shouldOfferUpgrade, promptFingerprint } = loadTS("lib/workspace.ts");
const { parsePromptContext, modelContext } = loadTS("lib/prompt-context.ts");
const { validateCreateBody, validateUpdateBody } = loadTS("types/prompt.ts");
const { buildMetaPrompt } = loadTS("lib/ai/generate-prompt.ts");
const { localizedNextSteps } = loadTS("lib/workspace-next-steps.ts");
const { inferTaskCategory } = loadTS("lib/idea-suggestions.ts");

test("profiles validate, trim and discard ownership fields", () => {
  const result = parseWorkspaceItem({ kind: "profile", name: " Shop ", user_id: "someone-else", payload: { audience: " Designers ", secret: "ignored" } });
  assert.deepEqual(result.data, { kind: "profile", name: "Shop", payload: { audience: "Designers", details: "", voice: "", constraints: "" } });
  for (const bad of [null, [], { kind: "bad", name: "test", payload: {} }, { kind: "profile", name: "test", payload: {} }, { kind: "profile", name: "x".repeat(81), payload: { audience: "test" } }, { kind: "profile", name: "test", payload: { details: "x".repeat(1201) } }]) assert.ok(parseWorkspaceItem(bad).error);
});
test("playbooks retain task context but not private profile snapshots, history or one-time answers", () => {
  const result = parseWorkspaceItem({ kind: "playbook", name: "Launch", payload: { idea: " Launch a product ", context: { category: "business", constraints: "no unsupported claims", clarifications: "One time answer", versions: [{ prompt: "Old result", action: "shorter", createdAt: new Date().toISOString() }], profile: { id: "test", name: "Private", details: "private", audience: "", voice: "", constraints: "" } } } });
  assert.deepEqual(result.data.payload, { idea: "Launch a product", context: { category: "business", constraints: "no unsupported claims" } });
});
test("context snapshots and versions are bounded", () => {
  assert.ok(parsePromptContext({ versions: Array(6).fill({}) }).error);
  assert.ok(parsePromptContext({ versions: [{ prompt: "test", action: "shorter", createdAt: "not a date" }] }).error);
  assert.ok(parsePromptContext({ profile: { name: "only a name" } }).error);
  assert.ok(parsePromptContext({ versions: [{ prompt: "x".repeat(16001), action: "shorter", createdAt: new Date().toISOString() }] }).error);
});
test("multibyte playbook payloads respect the database byte budget", () => {
  assert.ok(parseWorkspaceItem({ kind: "playbook", name: "Large task", payload: { idea: "中".repeat(4000), context: { constraints: "中".repeat(1200), audience: "中".repeat(1200) } } }).error);
});
test("version history retains five unique previous results without mutating the input", () => {
  let versions = [];
  for (let i = 0; i < 8; i++) versions = rememberVersion(versions, `Version ${i}`, "shorter");
  assert.equal(versions.length, 5);
  assert.equal(versions[0].prompt, "Version 3");
  const next = rememberVersion(versions, "Version 4", "specific");
  assert.equal(next.length, 5);
  assert.equal(next.at(-1).prompt, "Version 4");
  assert.equal(versions[1].prompt, "Version 4");
});
test("save and update endpoints validate stored context", () => {
  assert.equal(validateCreateBody({ idea: "test", target_tool: "claude", generated_prompt: "test", context: { versions: Array(6).fill({}) } }).valid, false);
  assert.equal(validateUpdateBody({ context: { profile: "invalid" } }).valid, false);
});
test("profiles are excluded from AI context until explicit confirmation; history is always excluded", () => {
  const profile = { id: "test", name: "Studio", details: "Product design", audience: "Students", voice: "Friendly", constraints: "No hype" };
  const input = { category: "business", profile, versions: [{ prompt: "Private old result", action: "shorter", createdAt: new Date().toISOString() }] };
  assert.deepEqual(modelContext(input), { category: "business" });
  assert.deepEqual(modelContext({ ...input, profileConsent: false }), { category: "business" });
  assert.deepEqual(modelContext({ ...input, profileConsent: true }), { category: "business", profile, profileConsent: true });
  assert.equal(input.versions.length, 1);
  const withoutConsent = buildMetaPrompt({ idea: "Draft a message", target_tool: "claude", context: { universal: true, profile } });
  assert.doesNotMatch(withoutConsent.user, /Product design/);
  const withConsent = buildMetaPrompt({ idea: "Draft a message", target_tool: "claude", context: { universal: true, profile, profileConsent: true } });
  assert.match(withConsent.user, /Product design/);
  assert.doesNotMatch(withConsent.user, /Private old result/);
});
test("refinements preserve original task and prompt as task data", () => {
  for (const action of ["shorter", "specific", "steps", "professional"]) {
    const result = buildMetaPrompt({ idea: "Ask permission to work remotely", target_tool: "claude", context: { universal: true }, refinement: { action, prompt: "Ask my manager for permission. Do not announce a decision." } });
    const data = JSON.parse(result.user);
    assert.equal(data.task.idea, "Ask permission to work remotely");
    assert.match(data.existingPrompt, /Do not announce/);
    assert.match(result.system, /Revise the existing prompt/);
    assert.match(result.system, /Preserve|preserv|losing essential/);
  }
});
test("next tasks reference project context, not an answer that Umprompt has never seen", () => {
  assert.equal(nextSteps("unknown").length, 3);
  assert.match(nextSteps("coding")[0], /test plan/);
  const idea = nextStepIdea("Build a shop", "Create a test plan");
  assert.match(idea, /not a completed result/);
  assert.match(idea, /Build a shop/);
  assert.equal(nextStepIdea("x".repeat(4000), "Create a test plan").length, 4000);
  for (const lang of ["en", "es", "ru"]) assert.equal(localizedNextSteps("business", lang).length, 3);
});
test("automatic next-step categories use real keyword matches, not random suggestions", () => {
  assert.equal(inferTaskCategory("debug an error"), "coding");
  assert.equal(inferTaskCategory("meal plan"), "daily");
  assert.equal(inferTaskCategory(""), "auto");
  assert.equal(inferTaskCategory("zzzzzzzz"), "auto");
  assert.equal(inferTaskCategory("письмо", "ru"), "writing");
});
test("upgrade offers require value AND low usage, and exclude every paid plan", () => {
  assert.equal(shouldOfferUpgrade(false, true, 2), true);
  assert.equal(shouldOfferUpgrade(false, false, 0), false);
  assert.equal(shouldOfferUpgrade(false, true, 7), false);
  assert.equal(shouldOfferUpgrade(false, true, null), false);
  assert.equal(shouldOfferUpgrade(true, true, 0), false);
});
test("saved-state fingerprint includes version history and score, but not generated titles", () => {
  const saved = { idea: "Draft email", target_tool: "claude", context: { universal: true }, generated_prompt: "Write an email", score: null };
  assert.equal(promptFingerprint(saved), promptFingerprint({ ...saved, title: "Different title" }));
  assert.notEqual(promptFingerprint(saved), promptFingerprint({ ...saved, score: { overall: 90, dimensions: [] } }));
  assert.notEqual(promptFingerprint(saved), promptFingerprint({ ...saved, context: { ...saved.context, versions: [] } }));
});
