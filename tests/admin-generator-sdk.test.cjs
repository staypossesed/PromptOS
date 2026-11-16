// These transport tests use the installed SDK with synthetic HTTP responses. No live provider calls.
const test = require("node:test");
const assert = require("node:assert/strict");
const { generateText } = require("ai");
const { loadTS } = require("../scripts/load-ts.cjs");
const { resolveGeneratorModel, VENICE_MODEL_ID } = loadTS("lib/admin-generator/provider.ts");
const { generatorErrorCode } = loadTS("lib/admin-generator/errors.ts");
const { buildAdminGeneratorPrompt } = loadTS("lib/admin-generator/prompt.ts");
const { ADMIN_GENERATOR_SYSTEM_PROMPT } = loadTS("lib/admin-generator/system-prompt.ts");
const transportInput = { action: "generate", model: "configured", idea: "PRIVATE_TRANSPORT_IDEA: a detailed landscape.", constraints: "PRIVATE_TRANSPORT_CONSTRAINT: preserve dramatic lighting.", format: "image", language: "en", negativePrompt: false };

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
    const built = buildAdminGeneratorPrompt({ ...transportInput, model: "venice" });
    const result = await generateText({ model: selected.model, ...built, maxTokens: 120, maxRetries: 0, abortSignal: AbortSignal.timeout(5000) });
    assert.equal(result.finishReason, "stop");
    assert.match(result.text, /requested prompt/);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].headers.get("authorization"), "Bearer synthetic-generator-key");
    assert.equal(requests[0].body.model, VENICE_MODEL_ID);
    assert.equal(requests[0].body.max_tokens, 120);
    assert.equal(requests[0].body.messages[0].role, "system");
    assert.equal(requests[0].body.messages[0].content, built.system);
    assert.ok(requests[0].body.messages[0].content.startsWith(ADMIN_GENERATOR_SYSTEM_PROMPT));
    assert.doesNotMatch(requests[0].body.messages[0].content, /PRIVATE_TRANSPORT_IDEA|PRIVATE_TRANSPORT_CONSTRAINT/);
    assert.equal(requests[0].body.messages[1].role, "user");
    assert.equal(requests[0].body.messages[1].content, built.prompt);
    assert.deepEqual(JSON.parse(requests[0].body.messages[1].content), { idea: transportInput.idea, constraints: transportInput.constraints });
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

async function withClaudeTransport(handler, run) {
  const beforeFetch = global.fetch;
  const names = ["ANTHROPIC_API_KEY", "DEFAULT_AI_PROVIDER", "DEFAULT_AI_MODEL"];
  const before = Object.fromEntries(names.map(name => [name, process.env[name]]));
  const { __resetConfigCacheForTests } = loadTS("lib/ai/config.ts");
  const requests = [];
  process.env.ANTHROPIC_API_KEY = "synthetic-claude-generator-key";
  process.env.DEFAULT_AI_PROVIDER = "anthropic";
  process.env.DEFAULT_AI_MODEL = "claude-sonnet-4-6";
  __resetConfigCacheForTests();
  global.fetch = async (input, init) => {
    const req = new Request(input, init);
    assert.equal(new URL(req.url).hostname, "api.anthropic.com");
    assert.equal(new URL(req.url).pathname, "/v1/messages");
    requests.push({ headers: req.headers, body: await req.json() });
    return handler(req);
  };
  try { await run(requests); }
  finally {
    global.fetch = beforeFetch;
    for (const name of names) { if (before[name] === undefined) delete process.env[name]; else process.env[name] = before[name]; }
    __resetConfigCacheForTests();
  }
}
function claudeResponse(stopReason = "end_turn") {
  return new Response(JSON.stringify({
    id: "msg_synthetic_generator", type: "message", role: "assistant", model: "claude-sonnet-4-6",
    content: [{ type: "text", text: "Create the requested prompt with the supplied style and constraints." }],
    stop_reason: stopReason, stop_sequence: null, usage: { input_tokens: 10, output_tokens: 12 },
  }), { status: 200, headers: { "Content-Type": "application/json" } });
}
test("real Claude SDK uses the existing Anthropic key and Messages API without OpenRouter", async () => {
  await withClaudeTransport(() => claudeResponse(), async requests => {
    const selected = resolveGeneratorModel("configured");
    assert.equal(selected.provider, "anthropic");
    const built = buildAdminGeneratorPrompt(transportInput);
    const result = await generateText({ model: selected.model, ...built, maxTokens: 120, maxRetries: 0 });
    assert.equal(result.finishReason, "stop");
    assert.match(result.text, /requested prompt/);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].headers.get("x-api-key"), "synthetic-claude-generator-key");
    assert.equal(requests[0].body.model, "claude-sonnet-4-6");
    assert.equal(requests[0].body.max_tokens, 120);
    assert.equal(requests[0].body.system[0].text, built.system);
    assert.ok(requests[0].body.system[0].text.startsWith(ADMIN_GENERATOR_SYSTEM_PROMPT));
    assert.doesNotMatch(requests[0].body.system[0].text, /PRIVATE_TRANSPORT_IDEA|PRIVATE_TRANSPORT_CONSTRAINT/);
    assert.equal(requests[0].body.messages.length, 1);
    assert.equal(requests[0].body.messages[0].role, "user");
    assert.equal(requests[0].body.messages[0].content[0].text, built.prompt);
    assert.deepEqual(JSON.parse(requests[0].body.messages[0].content[0].text), { idea: transportInput.idea, constraints: transportInput.constraints });
  });
});
test("real Claude SDK failures remain safe and make no automatic retries", async () => {
  for (const [status, type, code] of [[401,"authentication_error","PROVIDER_AUTH"],[403,"permission_error","PROVIDER_AUTH"],[404,"not_found_error","MODEL_UNAVAILABLE"],[429,"rate_limit_error","PROVIDER_RATE_LIMIT"],[529,"overloaded_error","GENERATOR_UNAVAILABLE"]]) {
    await withClaudeTransport(() => new Response(JSON.stringify({type:"error",error:{type,message:"synthetic upstream private detail"}}),{status,headers:{"Content-Type":"application/json"}}), async requests => {
      let caught;
      try { await generateText({model:resolveGeneratorModel("configured").model,prompt:"Reply OK.",maxTokens:8,maxRetries:0}); } catch(error) { caught=error; }
      assert.ok(caught);assert.equal(generatorErrorCode(caught),code);assert.equal(requests.length,1);
    });
  }
});
test("real Claude SDK exposes token truncation to the route", async () => {
  await withClaudeTransport(() => claudeResponse("max_tokens"), async requests => {
    const result=await generateText({model:resolveGeneratorModel("configured").model,prompt:"Reply OK.",maxTokens:8,maxRetries:0});
    assert.equal(result.finishReason,"length");assert.equal(requests.length,1);
  });
});
