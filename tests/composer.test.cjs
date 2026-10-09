const test = require("node:test");
const assert = require("node:assert/strict");
const { loadTS } = require("../scripts/load-ts.cjs");
const { getSuggestions, getStarterSuggestions, hashSeed, IDEA_SUGGESTIONS } = loadTS("lib/idea-suggestions.ts");
const { buildMetaPrompt } = loadTS("lib/ai/generate-prompt.ts");
const { isTaskCategory } = loadTS("lib/task-categories.ts");
const { parsePromptContext } = loadTS("lib/prompt-context.ts");

test("empty ideas show six distinct kinds of work", () => {
  const suggestions = getSuggestions("", "auto", 12);
  assert.equal(suggestions.length, 6);
  assert.equal(new Set(suggestions.map((s) => s.category)).size, 6);
});

test("first-time examples are familiar, localized, stable and refreshable", () => {
  for (const language of ["en", "es", "ru"]) {
    const first = getStarterSuggestions(12, language);
    assert.equal(first.length, 6);
    assert.equal(new Set(first.map((s) => s.id)).size, 6);
    assert.ok(first.every((s) => s.category !== "coding"));
    assert.deepEqual(first, getStarterSuggestions(12, language));
    assert.notDeepEqual(first, getStarterSuggestions(43, language));
    if (language === "ru") assert.ok(first.every((s) => /[А-Яа-я]/.test(s.title)));
    if (language === "es") assert.ok(first.every((s) => !IDEA_SUGGESTIONS.some((en) => en.title === s.title)));
  }
  assert.equal(getSuggestions("debug", "auto", 12)[0].category, "coding");
});

test("beginner labels distinguish the prepared request from the chatbot's answer", () => {
  const { composerCopy } = loadTS("lib/composer-copy.ts");
  const en = composerCopy("en");
  assert.match(en.title, /ChatGPT/);
  assert.match(en.startTitle, /Simplify your work/);
  assert.equal(en.placeholderIdeas.length, 6);
  assert.equal(new Set(en.placeholderIdeas).size, 6);
  assert.match(en.result, /request/);
  assert.match(en.guestCreate, /Sign in/);
  assert.match(en.category, /optional/);
  assert.equal(en.copy, "Copy request");
  for (const language of ["es", "ru"]) {
    assert.deepEqual(Object.keys(composerCopy(language)).sort(), Object.keys(en).sort());
    assert.equal(composerCopy(language).placeholderIdeas.length, 6);
    assert.ok(composerCopy(language).placeholderIdeas.every((idea) => idea.length < 100));
  }
});
test("the first word ranks related tasks before unrelated inspiration", () => {
  assert.equal(getSuggestions("debug", "auto", 12)[0].id, "debug");
  assert.equal(getSuggestions("meal", "auto", 12)[0].id, "meal");
  assert.equal(getSuggestions("ema", "auto", 12)[0].id, "email");
  assert.ok(getSuggestions("debug", "auto", 12).every((s) => s.keywords.includes("debug")));
});
test("selected categories filter suggestions and input is never inserted into the catalog", () => {
  assert.ok(getSuggestions("write", "coding", 10).every((s) => s.category === "coding"));
  assert.ok(getSuggestions("<script>alert(1)</script>", "auto", 10).every((s) => IDEA_SUGGESTIONS.some((known) => known.id === s.id)));
  assert.equal(new Set(IDEA_SUGGESTIONS.map((s) => s.id)).size, IDEA_SUGGESTIONS.length);
});
test("suggestions are stable per sign-in and rotate across sign-ins", () => {
  const first = getSuggestions("", "auto", hashSeed("user:sign-in-one"));
  assert.deepEqual(first, getSuggestions("", "auto", hashSeed("user:sign-in-one")));
  assert.notDeepEqual(first.map((s) => s.id), getSuggestions("", "auto", hashSeed("user:sign-in-two")).map((s) => s.id));
});
test("portable prompts preserve supplied details without enforcing a vendor template", () => {
  const result = buildMetaPrompt({ idea: "write an email", target_tool: "claude", context: { universal: true, category: "writing", audience: "my team", clarifications: "Tone: friendly" } });
  assert.match(result.system, /Adapt the structure and length/);
  assert.match(result.system, /Never invent/);
  assert.doesNotMatch(result.system, /Follow the output template exactly/);
  assert.match(result.user, /my team/);
  assert.match(result.user, /Tone: friendly/);
});
test("legacy tool-specific generation still uses its existing profile", () => {
  const result = buildMetaPrompt({ idea: "fix a bug", target_tool: "cursor" });
  assert.match(result.system, /Files to read first/);
  assert.match(result.system, /Follow the output template exactly/);
});
test("invalid categories fall back safely and known categories validate", () => {
  assert.equal(isTaskCategory("coding"), true);
  assert.equal(isTaskCategory("unknown"), false);
  const result = buildMetaPrompt({ idea: "help", target_tool: "claude", context: { universal: true, category: "unknown" } });
  assert.match(result.system, /Identify the real task/);
});
test("extra detail validation rejects malformed and oversized input", () => {
  assert.ok(parsePromptContext({ audience: { value: "team" } }).error);
  assert.ok(parsePromptContext({ constraints: "x".repeat(1201) }).error);
  assert.ok(parsePromptContext({ category: "unknown" }).error);
  assert.ok(parsePromptContext({ universal: "yes" }).error);
  assert.deepEqual(parsePromptContext({ universal: true, category: "daily", audience: " family ", unknown: "ignored" }).data, { audience: "family", category: "daily", universal: true });
});
test("suggestions match the interface language and rank localized first words", () => {
  assert.equal(getSuggestions("письмо", "auto", 10, 6, "ru")[0].id, "email");
  assert.equal(getSuggestions("correo", "auto", 10, 6, "es")[0].id, "email");
  assert.match(getSuggestions("", "auto", 10, 6, "ru")[0].idea, /[А-Яа-я]/);
});
