const assert = require("node:assert/strict");
const { loadTS } = require("./load-ts.cjs");

async function main() {
  process.loadEnvFile(".env.local");
  const { clarifyIdea } = loadTS("lib/ai/clarify-idea.ts");
  const { generatePromptText } = loadTS("lib/ai/generate-prompt.ts");
  const vague = await clarifyIdea("help me write something for my business", "writing", "en");
  assert.ok(vague.length > 0 && vague.length <= 2);
  for (const item of vague) { assert.ok(item.question && item.options.length >= 2 && item.options.length <= 3); }
  const clear = await clarifyIdea("Write a short email asking my manager for permission to work from home this Friday because a plumber is coming. Do not apologize.", "writing", "en");
  assert.equal(clear.length, 0);
  const result = await generatePromptText({ idea: "help me write something for my business", target_tool: "claude", context: { universal: true, category: "writing", clarifications: vague.map((q) => `${q.question}: ${q.options[0]}`).join("\n") } });
  assert.ok(result.text.trim().length > 30);
  console.log(JSON.stringify({ missing_details: vague, clear_idea_question_count: clear.length, generated_prompt: result.text }, null, 2));
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
