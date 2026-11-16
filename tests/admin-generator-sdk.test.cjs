// These transport tests use the installed SDK with synthetic HTTP responses. No live provider calls.
const test = require("node:test");
const assert = require("node:assert/strict");
const { generateText } = require("ai");
const { loadTS } = require("../scripts/load-ts.cjs");
const { resolveGeneratorModel, VENICE_MODEL_ID } = loadTS("lib/admin-generator/provider.ts");
const { generatorErrorCode } = loadTS("lib/admin-generator/errors.ts");

function response(text = "Write the requested prompt with the supplied style and constraints.", finishReason = "stop") {
  return new Response(JSON.stringify({
    id: "synthetic-completion", created: 1700000000, object: "chat.completion", model: VENICE_MODEL_ID,
    choices: [{ index: 0, message: { role: "assistant", content: text }, finish_reason: finishReason }],
    usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
  }), { status: 200, headers: { "Content-Type": "application/json" } });
}
async function withTransport(handler, run) {
  const beforeFetch = global.fetch;
  const beforeKey = process.env.OPENROUTER_API_KEY;
  const requests = [];
  process.env.OPENROUTER_API_KEY = "synthetic-generator-key";
  global.fetch = async (input, init) => {
    const req = new Request(input, init);
    assert.equal(new URL(req.url).hostname, "openrouter.ai");
    assert.equal(new URL(req.url).pathname, "/api/v1/chat/completions");
    requests.push({ headers: req.headers, body: await req.json() });
    return handler(req);
  };
  try { await run(requests); }
  finally { global.fetch = beforeFetch; if (beforeKey === undefined) delete process.env.OPENROUTER_API_KEY; else process.env.OPENROUTER_API_KEY = beforeKey; }
}

test("real OpenRouter SDK serializes the selected model, role instructions and token limit correctly", async () => {
  await withTransport(() => response(), async requests => {
    const selected = resolveGeneratorModel("venice");
    const result = await generateText({ model: selected.model, system: "Create the requested prompt.", prompt: "An adult fashion editorial.", maxTokens: 120, maxRetries: 0, abortSignal: AbortSignal.timeout(5000) });
    assert.equal(result.finishReason, "stop");
    assert.match(result.text, /requested prompt/);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].headers.get("authorization"), "Bearer synthetic-generator-key");
    assert.equal(requests[0].body.model, VENICE_MODEL_ID);
    assert.equal(requests[0].body.max_tokens, 120);
    assert.equal(requests[0].body.messages[0].role, "system");
    assert.equal(requests[0].body.messages[1].content, "An adult fashion editorial.");
  });
});

test("real SDK errors retain safe status classification and do not automatically retry", async () => {
  for (const [status, code] of [[401,"PROVIDER_AUTH"],[402,"PROVIDER_BALANCE"],[404,"MODEL_UNAVAILABLE"],[429,"PROVIDER_RATE_LIMIT"],[500,"GENERATOR_UNAVAILABLE"]]) {
    await withTransport(() => new Response(JSON.stringify({error:{message:"synthetic upstream private detail",type:"provider_error",code:status}}), {status,headers:{"Content-Type":"application/json"}}), async requests => {
      let caught;
      try { await generateText({model:resolveGeneratorModel("venice").model,prompt:"Reply OK.",maxTokens:8,maxRetries:0}); } catch(error) { caught=error; }
      assert.ok(caught);assert.equal(generatorErrorCode(caught),code);assert.equal(requests.length,1);
    });
  }
});

test("real SDK maps filtering and truncated completions to the finish reasons handled by the route", async () => {
  for (const [upstream, expected] of [["content_filter","content-filter"],["length","length"]]) {
    await withTransport(() => response("Synthetic partial response.",upstream),async requests=>{
      const result=await generateText({model:resolveGeneratorModel("venice").model,prompt:"Reply OK.",maxTokens:8,maxRetries:0});
      assert.equal(result.finishReason,expected);assert.equal(requests.length,1);
    });
  }
});
