const test = require("node:test");
const assert = require("node:assert/strict");
const { loadTS } = require("../scripts/load-ts.cjs");
const { canExpandIdea, editPromptText, MAX_PROMPT_LENGTH } = loadTS("lib/prompt-editing.ts");
const core = loadTS("extension/src/core.ts");

test("idea validation rejects accidental single characters without requiring a full sentence", () => {
  for (const idea of ["", " ", "f", "я", "!!", "a !", "🙂"]) assert.equal(canExpandIdea(idea), false);
  for (const idea of ["AI", "UX", "C++ help", "ИИ", "café", "预算", "a meal plan"]) assert.equal(canExpandIdea(idea), true);
});

test("manual typing preserves whitespace and checkpoints once per editing session", () => {
  const original = "Write a polite email.";
  const first = editPromptText(original, `${original}\n`, [], true);
  const next = editPromptText(first.prompt, `${original}\nAsk for two days. `, first.versions, false);
  assert.equal(first.prompt.endsWith("\n"), true);
  assert.equal(next.prompt.endsWith(" "), true);
  assert.equal(next.versions.length, 1);
  assert.equal(next.versions[0].prompt, original);
  assert.equal(next.versions[0].action, "Manual edit");
  assert.equal(editPromptText(next.prompt, next.prompt, next.versions, true).changed, false);
  assert.equal(next.versions.length, 1);
});

test("editing changes the copied and saved text, not the task or draft identity", () => {
  const original = core.acceptResult({ ...core.emptyDraft(), idea: "A polite email" }, "Original prompt", "expand");
  const saved = { ...original, savedFingerprint: core.fingerprint(original) };
  const edit = editPromptText(saved.prompt, "My edited prompt", saved.versions, true);
  const next = { ...saved, prompt: edit.prompt, versions: edit.versions, savedFingerprint: "" };
  assert.equal(next.id, original.id);
  assert.equal(next.resultInput, original.resultInput);
  assert.equal(core.isCurrent(next), true);
  assert.equal(core.isSaved(next), false);
  assert.equal(core.draftBody(next).generated_prompt, "My edited prompt");
  assert.equal(next.versions[0].prompt, "Original prompt");
});

test("cleared and whitespace-only prompts remain drafts but cannot be saved as useful results", () => {
  const original = core.acceptResult({ ...core.emptyDraft(), idea: "Plan meals" }, "Original prompt", "expand");
  for (const value of ["", "   "]) {
    const edit = editPromptText(original.prompt, value, original.versions, true);
    const empty = { ...original, prompt: edit.prompt, versions: edit.versions };
    const restored = core.restoreDraft(empty);
    assert.equal(core.isCurrent(restored), false);
    assert.equal(restored.resultInput, original.resultInput);
    assert.equal(restored.versions.at(-1).prompt, original.prompt);
  }
});

test("manual edits respect the server's prompt length and five-version limit", () => {
  let prompt = "First prompt";
  let versions = [];
  for (let i = 0; i < 8; i++) {
    const next = editPromptText(prompt, `Prompt ${i}`, versions, true);
    prompt = next.prompt;
    versions = next.versions;
  }
  assert.equal(versions.length, 5);
  assert.equal(editPromptText(prompt, "x".repeat(MAX_PROMPT_LENGTH + 1), versions, true).prompt.length, MAX_PROMPT_LENGTH);
});

test("legacy one-character results cannot be treated as a current prompt, even after manually editing the response", () => {
  const draft = { ...core.emptyDraft(), idea: "f", prompt: "Your request is too short." };
  draft.resultInput = core.inputFingerprint(draft);
  assert.equal(core.isCurrent(draft), false);
  const edited = { ...draft, prompt: "Suggest three books to read." };
  assert.equal(core.isCurrent(edited), false);
  assert.equal(core.restoreDraft(edited).prompt, edited.prompt, "Recovery does not silently delete the old local text.");
  const newInput = { ...edited, idea: "Suggest books about history" };
  assert.equal(core.isCurrent(newInput), false);
  const next = core.acceptResult(newInput, "Recommend three history books with summaries.", "expand");
  assert.equal(core.isCurrent(next), true);
  assert.notEqual(next.id, draft.id);
  assert.equal(next.idea, newInput.idea);
});
