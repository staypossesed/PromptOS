const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { stripTypeScriptTypes } = require("node:module");
const root = path.resolve(__dirname, "..");
function loader(mocks = {}) {
  const cache = new Map();
  function url(file) {
    if (cache.has(file)) return cache.get(file);
    let source = stripTypeScriptTypes(fs.readFileSync(path.join(root, file), "utf8"));
    source = source.replace(/(from\s+)(["'])([^"']+)\2/g, (_, prefix, quote, name) => {
      const base = name.startsWith("@/") ? name.slice(2) : path.posix.join(path.posix.dirname(file), name);
      const target = name in mocks ? "data:text/javascript;base64," + Buffer.from(mocks[name]).toString("base64") : url(base + ".ts");
      return prefix + JSON.stringify(target);
    });
    const result = "data:text/javascript;base64," + Buffer.from(source).toString("base64"); cache.set(file, result); return result;
  }
  return file => import(url(file));
}
const load = loader();
const owner = { id: "synthetic-owner", email: "vanarnold.etsy@gmail.com", email_confirmed_at: "2026-01-01T00:00:00Z" };
const input = { action: "generate", model: "venice", idea: "Create a detailed fashion photography prompt with an adult model.", constraints: "Keep the requested dramatic style.", format: "image", language: "en", negativePrompt: true };
globalThis[Symbol.for("umprompt:generator-fixtures")] = new Map();
let fixtureId = 0;
async function fixture(options = {}) {
  const f = { user: owner, calls: [], resolved: [], limits: [], text: "Write a detailed image prompt for the requested adult fashion editorial with dramatic lighting and the supplied constraints.", finishReason: "stop", ...options };
  const id = ++fixtureId; globalThis[Symbol.for("umprompt:generator-fixtures")].set(id, f);
  const shared = `const f=globalThis[Symbol.for("umprompt:generator-fixtures")].get(${id});`;
  const route = await loader({
    "next/server": "export const NextResponse={json:(data,options)=>Response.json(data,options)};",
    "@/lib/supabase/server": shared + "export async function createClient(){return {auth:{getUser:async()=>({data:{user:f.user},error:f.authError??null})}};}",
    "@/lib/rate-limit": shared + "export async function rateLimit(id,action){f.limits.push({id,action});if(f.rateFailure)throw Error('distributed-rate-unavailable');return {allowed:f.deniedAction!==action,resetAt:Date.now()+60000};}",
    "@/lib/admin-generator/provider": shared + "export function generatorConfiguration(){return {models:[{value:'configured',configured:true,name:'Claude (default)',provider:'anthropic',modelId:'fixed-claude-model'},{value:'venice',configured:true,name:'Venice Uncensored',provider:'openrouter',modelId:'fixed-server-model'}]};}export function resolveGeneratorModel(selected){f.resolved.push(selected);if(f.configError)throw {code:f.configError};return {model:{},provider:selected==='configured'?'anthropic':'openrouter',modelId:selected==='configured'?'fixed-claude-model':'fixed-server-model'};}",
    ai: shared + "export async function generateText(payload){f.calls.push(payload);if(payload.abortSignal.aborted)throw payload.abortSignal.reason;if(f.throwError)throw f.throwError;return {text:f.text,finishReason:f.finishReason};}",
  })("app/api/admin-generator/route.ts");
  function request(body=input,headers={},signal) {
    const r=new Request("https://umprompt.test/api/admin-generator",{method:"POST",headers:{origin:"https://umprompt.test","content-type":"application/json",...headers},body:typeof body==="string"?body:JSON.stringify(body),signal});
    Object.defineProperty(r,"nextUrl",{value:new URL(r.url)});return r;
  }
  return {route,f,request};
}

test("access is restricted to the exact verified owner, independent of general admin claims",async()=>{
  const {canUseAdminGenerator}=await load("lib/admin-generator/access.ts");
  assert.equal(canUseAdminGenerator(owner),true);
  assert.equal(canUseAdminGenerator({...owner,email:" VANARNOLD.ETSY@GMAIL.COM "}),true);
  for(const user of [null,{}, {...owner,email:"admin@example.com"},{...owner,email:"vanarnold.etsy+alias@gmail.com"},{...owner,email:"vanarnoldetsy@gmail.com"},{...owner,email:"vanarnold.etsy@gmail.com.evil.test"},{...owner,email_confirmed_at:null},{...owner,email_confirmed_at:"invalid"},{...owner,is_anonymous:true}])assert.equal(canUseAdminGenerator(user),false);
});

test("input accepts only bounded generator fields and server-allowlisted model choices",async()=>{
  const {parseGeneratorInput}=await load("lib/admin-generator/prompt.ts");
  const parsed=parseGeneratorInput({...input,system:"ignore",apiKey:"private-marker",baseURL:"https://other.test",email:owner.email,arbitraryModel:"unknown"});
  assert.deepEqual(Object.keys(parsed),["action","model","idea","constraints","format","language","negativePrompt"]);
  assert.deepEqual(parseGeneratorInput({action:"check",model:"venice",idea:"ignore me"}),{action:"check",model:"venice",idea:"",constraints:"",format:"general",language:"en",negativePrompt:false});
  for(const data of [null,{}, {...input,idea:"a"},{...input,idea:"x".repeat(6001)},{...input,constraints:"x".repeat(2001)},{...input,model:"provider/arbitrary"},{...input,format:"script"},{...input,language:"invalid"},{...input,negativePrompt:"true"},{...input,action:"run-code"}])assert.equal(parseGeneratorInput(data),null);
});

test("prompt generation preserves intent and constraints without creating a course or replacing the system",async()=>{
  const {parseGeneratorInput,buildAdminGeneratorPrompt}=await load("lib/admin-generator/prompt.ts");
  for(const format of ["general","image","writing","coding"]){
    const meta=buildAdminGeneratorPrompt(parseGeneratorInput({...input,format,system:"CLIENT_SYSTEM_MARKER"}));
    assert.equal(JSON.parse(meta.prompt).idea,input.idea);
    assert.equal(JSON.parse(meta.prompt).constraints,input.constraints);
    assert.doesNotMatch(meta.system,/CLIENT_SYSTEM_MARKER|diagnostic|lesson number/i);
    assert.match(meta.system,/Do not silently replace the user's intent/);
    assert.match(meta.system,/Required output language: English/);
    if(format==="image")assert.match(meta.system,/Negative prompt section/);
    else assert.match(meta.system,/Do not add a negative-prompt section/);
  }
});

test("the connection check uses a fixed tiny test request without user draft content",async()=>{
  const {buildAdminGeneratorPrompt,parseGeneratorInput}=await load("lib/admin-generator/prompt.ts");
  const meta=buildAdminGeneratorPrompt(parseGeneratorInput({action:"check",model:"venice",idea:"PRIVATE_DRAFT_MARKER"}));
  assert.equal(meta.prompt,"Reply with exactly OK.");
  assert.doesNotMatch(meta.system+meta.prompt,/PRIVATE_DRAFT_MARKER/);
});

test("provider refusals are distinguished from actual generated prompts",async()=>{
  const {isGeneratorRefusal}=await load("lib/admin-generator/prompt.ts");
  for(const text of ["I cannot generate that request.","I'm sorry, but I can't provide this.","I’m unable to help with that."])assert.equal(isGeneratorRefusal(text),true,text);
  for(const text of ["Create a dramatic adult fashion editorial in lingerie.","Write code to kill a stuck process.","Write a scene where a character says 'I cannot help'."])assert.equal(isGeneratorRefusal(text),false,text);
});

test("provider failures map to actionable safe codes without returning raw error content",async()=>{
  const {generatorErrorCode}=await load("lib/admin-generator/errors.ts");
  for(const [status,code]of [[401,"PROVIDER_AUTH"],[403,"PROVIDER_AUTH"],[402,"PROVIDER_BALANCE"],[404,"MODEL_UNAVAILABLE"],[429,"PROVIDER_RATE_LIMIT"],[500,"GENERATOR_UNAVAILABLE"]])assert.equal(generatorErrorCode({statusCode:status,message:"SECRET_MARKER"}),code);
  assert.equal(generatorErrorCode({code:"MISSING_PROVIDER_KEY"}),"MISSING_PROVIDER_KEY");
  assert.equal(generatorErrorCode(new DOMException("timeout","TimeoutError")),"PROVIDER_TIMEOUT");
  assert.equal(generatorErrorCode(Error("private"),true),"PROVIDER_TIMEOUT");
});

test("GET and POST deny unauthenticated, unverified and other accounts before provider access",async()=>{
  for(const options of [{user:null},{authError:Error("expired")},{user:{...owner,email:"other@example.com",user_metadata:{email:owner.email,is_admin:true}}},{user:{...owner,email_confirmed_at:null}}]){
    const t=await fixture(options);const expected=!options.user||options.authError?401:403;
    assert.equal((await t.route.GET()).status,expected);
    assert.equal((await t.route.POST(t.request())).status,expected);
    assert.equal(t.f.calls.length,0);assert.equal(t.f.resolved.length,0);assert.equal(t.f.limits.length,0);
  }
});

test("configuration GET exposes safe metadata and makes no inference request",async()=>{
  const t=await fixture();const response=await t.route.GET();const body=await response.json();
  assert.equal(response.status,200);assert.equal(body.models[0].value,"configured");assert.equal(t.f.calls.length,0);
  assert.equal(response.headers.get("cache-control"),"private, no-store");
});

test("origin, JSON type, malformed input and actual body size are checked before inference",async()=>{
  const t=await fixture();
  for(const [body,headers,status]of [[input,{origin:"https://foreign.test"},403],[input,{origin:""},403],[input,{"content-type":"text/plain"},415],[input,{"content-type":"application/jsonx"},415],["{broken",{},400],["x".repeat(32769),{"content-length":"1"},400],[{...input,idea:" "},{},422]]){
    assert.equal((await t.route.POST(t.request(body,headers))).status,status);
  }
  assert.equal(t.f.calls.length,0);
});

test("successful generation uses the selected model, no retries and the user's exact data",async()=>{
  const t=await fixture();const response=await t.route.POST(t.request({...input,system:"INJECTED_SYSTEM_MARKER",apiKey:"CLIENT_SECRET_MARKER"}));const body=await response.json();
  assert.equal(response.status,200);assert.equal(body.prompt,t.f.text);assert.deepEqual(t.f.resolved,["venice"]);
  const call=t.f.calls[0];assert.equal(call.maxRetries,0);assert.equal(call.maxTokens,2400);
  assert.equal(JSON.parse(call.prompt).idea,input.idea);assert.doesNotMatch(call.system,/INJECTED_SYSTEM_MARKER|CLIENT_SECRET_MARKER/);
  assert.equal(t.f.limits.length,0);
});

test("a connection check verifies a provider response but never returns a draft as a prompt",async()=>{
  const t=await fixture({text:"OK"});const response=await t.route.POST(t.request({action:"check",model:"venice"}));const body=await response.json();
  assert.equal(response.status,200);assert.equal(body.ok,true);assert.equal(body.prompt,undefined);assert.ok(Date.parse(body.checkedAt));assert.equal(t.f.calls[0].maxTokens,8);assert.equal(t.f.calls[0].temperature,0);
});

test("missing configuration never calls the model",async()=>{
  const t=await fixture({configError:"MISSING_PROVIDER_KEY"});
  const response=await t.route.POST(t.request());
  assert.equal(response.status,503);
  assert.equal((await response.json()).error,"MISSING_PROVIDER_KEY");
  assert.equal(t.f.calls.length,0);
});

test("the verified owner can exceed former daily and minute caps without quota or Redis dependencies",async()=>{
  const t=await fixture({rateFailure:true,deniedAction:"admin_generator"});
  for(let i=0;i<205;i++){
    const response=await t.route.POST(t.request({...input,model:"configured"}));
    assert.equal(response.status,200,"generation "+(i+1));
    assert.equal((await response.json()).provider,"anthropic");
  }
  assert.equal(t.f.calls.length,205);
  assert.equal(t.f.limits.length,0);
  assert.equal(t.f.resolved.every(model=>model==="configured"),true);
  const check=await t.route.POST(t.request({action:"check",model:"configured"}));
  assert.equal(check.status,200);
  assert.equal(t.f.limits.length,0);
});

test("provider auth, balance, unavailable-model and rate errors are safe and never become prompts",async()=>{
  for(const [status,code]of [[401,"PROVIDER_AUTH"],[402,"PROVIDER_BALANCE"],[404,"MODEL_UNAVAILABLE"],[429,"PROVIDER_RATE_LIMIT"],[500,"GENERATOR_UNAVAILABLE"]]){
    const t=await fixture({throwError:{statusCode:status,message:"PRIVATE_API_KEY_MARKER"}});const response=await t.route.POST(t.request());const body=await response.json();
    assert.equal(body.error,code);assert.equal(body.prompt,undefined);assert.doesNotMatch(JSON.stringify(body),/PRIVATE_API_KEY_MARKER/);assert.equal(t.f.calls.length,1);
  }
});

test("refusals, empty results, wrong languages and truncation are explicit failures",async()=>{
  for(const options of [{text:""},{text:"I cannot generate that request."},{finishReason:"content-filter"},{finishReason:"error"},{finishReason:"length"},{text:"Escribe un mensaje breve para dar las gracias por la tarta."}]){
    const t=await fixture(options);const response=await t.route.POST(t.request());const body=await response.json();assert.ok(response.status>=400);assert.equal(body.prompt,undefined);assert.ok(body.error);
  }
});

test("cancellation is passed to inference and returned without leaking internal errors",async()=>{
  const t=await fixture();const abort=new AbortController();abort.abort(new Error("PRIVATE_ABORT_MARKER"));
  const response=await t.route.POST(t.request(input,{},abort.signal));const body=await response.json();
  assert.equal(t.f.calls[0].abortSignal.aborted,true);assert.equal(body.error,"PROVIDER_TIMEOUT");assert.doesNotMatch(JSON.stringify(body),/PRIVATE_ABORT_MARKER/);
});

test("private provider configuration defaults to Claude, keeps provider selection explicit and never exposes keys",async()=>{
  const oldRouter=process.env.OPENROUTER_API_KEY;
  const oldClaude=process.env.ANTHROPIC_API_KEY;
  process.env.OPENROUTER_API_KEY="SYNTHETIC_ROUTER_KEY";
  process.env.ANTHROPIC_API_KEY="SYNTHETIC_CLAUDE_KEY";
  const state={defaultProvider:"anthropic",defaultModel:"claude-opus-4-7",factories:[]};
  globalThis[Symbol.for("umprompt:private-provider-state")]=state;
  const provider=await loader({
    "@openrouter/ai-sdk-provider":"export function createOpenRouter(){return {chat:id=>({id})};}",
    "@/lib/ai/config":`const state=globalThis[Symbol.for("umprompt:private-provider-state")];export function resolveModel(override){const provider=override?.model?"anthropic":state.defaultProvider;const model=override?.model??state.defaultModel;return {provider,model,config:{displayName:provider==="anthropic"?"Claude":"Other provider",factory:()=>{state.factories.push({provider,model});return {id:model};}}};}`,
    "@/lib/ai/bounded-fetch":"export async function boundedProviderFetch(){throw Error('no network in this test');}",
  })("lib/admin-generator/provider.ts");
  try {
    const config=provider.generatorConfiguration();
    assert.equal(config.models[0].value,"configured");
    assert.equal(config.models[0].provider,"anthropic");
    assert.equal(config.models[0].modelId,"claude-opus-4-7");
    assert.equal(config.models[0].configured,true);
    assert.doesNotMatch(JSON.stringify(config),/SYNTHETIC_ROUTER_KEY|SYNTHETIC_CLAUDE_KEY/);
    assert.equal(state.factories.length,0);
    assert.equal(provider.resolveGeneratorModel("configured").modelId,"claude-opus-4-7");
    state.defaultProvider="openrouter";state.defaultModel="moonshotai/kimi-k2.6";
    const privateDefault=provider.generatorConfiguration().models[0];
    assert.equal(privateDefault.provider,"anthropic");
    assert.equal(privateDefault.modelId,"claude-sonnet-4-6");
    assert.equal(provider.resolveGeneratorModel("configured").provider,"anthropic");
    delete process.env.OPENROUTER_API_KEY;
    assert.equal(provider.resolveGeneratorModel("configured").provider,"anthropic");
    assert.throws(()=>provider.resolveGeneratorModel("venice"),/MISSING_PROVIDER_KEY/);
    process.env.OPENROUTER_API_KEY="SYNTHETIC_ROUTER_KEY";
    const selected=provider.resolveGeneratorModel("venice");
    assert.equal(selected.modelId,"cognitivecomputations/dolphin-mistral-24b-venice-edition");
    assert.equal(selected.model.id,selected.modelId);
    delete process.env.ANTHROPIC_API_KEY;
    assert.equal(provider.generatorConfiguration().models[0].configured,false);
    assert.throws(()=>provider.resolveGeneratorModel("configured"),/MISSING_PROVIDER_KEY/);
    assert.throws(()=>provider.resolveGeneratorModel("other"),/MODEL_CONFIGURATION/);
  } finally {
    if(oldRouter===undefined)delete process.env.OPENROUTER_API_KEY;else process.env.OPENROUTER_API_KEY=oldRouter;
    if(oldClaude===undefined)delete process.env.ANTHROPIC_API_KEY;else process.env.ANTHROPIC_API_KEY=oldClaude;
  }
});

test("cancelled study-coach routes are removed and deployment stays manual",()=>{
  for(const file of ["app/study-coach/page.tsx","app/api/study-coach/route.ts","components/study-coach/study-coach.tsx"])assert.equal(fs.existsSync(path.join(root,file)),false);
  const middleware=fs.readFileSync(path.join(root,"middleware.ts"),"utf8");assert.match(middleware,/canUseAdminGenerator/);assert.match(middleware,/pathname === "\/admin" \|\| pathname.startsWith\("\/admin\/"\)/);assert.doesNotMatch(middleware,/study-coach/);
  const ui=fs.readFileSync(path.join(root,"components/admin-generator/admin-prompt-generator.tsx"),"utf8");assert.match(ui,/Check API connection/);assert.match(ui,/useState<GeneratorModel>\("configured"\)/);assert.match(ui,/No Umprompt generation quota for this account/);assert.doesNotMatch(ui,/localStorage|sessionStorage|\/api\/prompts/);assert.equal(ui.slice(ui.indexOf("  async function run("),ui.indexOf("  async function refreshConfiguration(")).includes("setResult(null)"),false);
  const config=JSON.parse(fs.readFileSync(path.join(root,"vercel.json"),"utf8"));assert.equal(config.git.deploymentEnabled,false);assert.equal(config.github.silent,true);
});

test("the detailed server template stays separate from user data for every format and UI language",async()=>{
  const {ADMIN_GENERATOR_SYSTEM_PROMPT}=await load("lib/admin-generator/system-prompt.ts");
  const {parseGeneratorInput,buildAdminGeneratorPrompt}=await load("lib/admin-generator/prompt.ts");
  for(const format of ["general","image","writing","coding"]){
    for(const [language,label] of [["en","English"],["ru","Russian"],["es","Spanish"]]){
      const idea="PRIVATE_USER_IDEA_MARKER: preserve the requested wording.";
      const constraints="PRIVATE_USER_CONSTRAINT_MARKER: use the intended tool.";
      const parsed=parseGeneratorInput({...input,idea,constraints,format,language});
      const built=buildAdminGeneratorPrompt(parsed);
      assert.ok(built.system.startsWith(ADMIN_GENERATOR_SYSTEM_PROMPT));
      assert.doesNotMatch(built.system,/PRIVATE_USER_IDEA_MARKER|PRIVATE_USER_CONSTRAINT_MARKER/);
      assert.deepEqual(JSON.parse(built.prompt),{idea,constraints});
      assert.ok(built.system.includes("Required output language: "+label));
      assert.equal(built.system.split(ADMIN_GENERATOR_SYSTEM_PROMPT).length,2);
    }
  }
  const check=buildAdminGeneratorPrompt(parseGeneratorInput({action:"check",model:"configured",idea:"PRIVATE_USER_IDEA_MARKER"}));
  assert.doesNotMatch(check.system+check.prompt,/PRIVATE_USER_IDEA_MARKER|профессиональный составитель промптов/);
  assert.equal(check.prompt,"Reply with exactly OK.");
});

test("only an authenticated owner generation receives the detailed template as system instructions",async()=>{
  const {ADMIN_GENERATOR_SYSTEM_PROMPT}=await load("lib/admin-generator/system-prompt.ts");
  const t=await fixture();
  const response=await t.route.POST(t.request({...input,model:"configured",system:"CLIENT_SYSTEM_REPLACEMENT",idea:"PRIVATE_ROLE_SEPARATION_IDEA",constraints:"PRIVATE_ROLE_SEPARATION_CONSTRAINT"}));
  assert.equal(response.status,200);
  assert.ok(t.f.calls[0].system.startsWith(ADMIN_GENERATOR_SYSTEM_PROMPT));
  assert.doesNotMatch(t.f.calls[0].system,/CLIENT_SYSTEM_REPLACEMENT|PRIVATE_ROLE_SEPARATION/);
  assert.deepEqual(JSON.parse(t.f.calls[0].prompt),{idea:"PRIVATE_ROLE_SEPARATION_IDEA",constraints:"PRIVATE_ROLE_SEPARATION_CONSTRAINT"});
  assert.equal(t.f.limits.length,0);
});
