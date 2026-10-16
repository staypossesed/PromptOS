const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const http = require("node:http");
const { build } = require("esbuild");
const postcss = require("postcss");
const tailwind = require("tailwindcss");
const { chromium } = require("playwright");
const { loadTS } = require("./load-ts.cjs");
const { composerCopy } = loadTS("lib/composer-copy.ts");

async function main() {
  const root = path.resolve(__dirname, "..");
  const serveOnly = process.argv.includes("--serve");
  const artifacts = process.env.UMPROMPT_TEST_ARTIFACTS || path.join(root, "extension/artifacts");
  await fs.mkdir(artifacts, { recursive: true });
  const shell = {
    "next/link": `export default function Link({href,children,...props}){return <a href={typeof href==='string'?href:href.pathname} {...props}>{children}</a>}`,
    "next/navigation": `import {useMemo,useSyncExternalStore} from 'react';
      const subscribe=cb=>{addEventListener('popstate',cb);return()=>removeEventListener('popstate',cb)};
      const move=url=>{history.replaceState(null,'',url);dispatchEvent(new Event('popstate'))};
      const router={replace:move,push:move,refresh:()=>{}};
      export const useRouter=()=>router;
      export const useSearchParams=()=>{const search=useSyncExternalStore(subscribe,()=>location.search);return useMemo(()=>new URLSearchParams(search),[search])};`,
    "@/components/layout/app-shell": `export function AppShell({children}){return <div>{children}</div>}`,
    "@/components/layout/topbar": `export function Topbar(){return null}`,
    "@/components/workspace/builder-library": `export function BuilderLibrary(){return null}`,
    "@/hooks/usePromptUsage": `export function usePromptUsage(){return {isPaid:false,remainingThisWeek:7,isLoading:false}}`,
    "@/lib/analytics": `export function track() {}`,
    "@/lib/supabase/client": `const user={id:'synthetic-owner',last_sign_in_at:'2026-01-01T00:00:00Z'};
      export function createClient(){return {auth:{getUser:async()=>({data:{user}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}}}`,
  };
  // Mount the actual builder and result components; only the outer app/session services are fixtures.
  const bundle = await build({
    stdin: { contents: `import {createRoot} from 'react-dom/client';
      import {useEffect} from 'react';
      import BuilderPage from './app/builder/page';
      import {LanguageProvider,useLanguage} from './lib/i18n/language-provider';
      function TestPage(){const {language,setLanguage}=useLanguage();useEffect(()=>{document.documentElement.lang=language},[language]);
        return <><header style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'16px 24px',borderBottom:'1px solid #e4e4e7',background:'white'}}>
        <span style={{display:'flex',alignItems:'center',gap:8,fontWeight:600}}><img src='/brand.png' width='32' height='32' alt=''/>Umprompt</span>
        <select id='test-language' aria-label='Language' value={language} onChange={e=>setLanguage(e.target.value)}><option value='en'>EN</option><option value='es'>ES</option><option value='ru'>RU</option></select>
        </header><BuilderPage/></>};
      createRoot(document.getElementById('root')).render(<LanguageProvider><TestPage/></LanguageProvider>);`, resolveDir: root, loader: "tsx" },
    absWorkingDir: root, bundle: true, write: false, format: "iife", platform: "browser", jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' }, alias: { "@": root }, logLevel: "silent",
    plugins: [{ name: "isolated-editor-fixtures", setup(builder) {
      builder.onResolve({ filter: /.*/ }, (args) => args.path in shell ? { path: args.path, namespace: "fixture" } : undefined);
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, (args) => ({ contents: shell[args.path], loader: "tsx", resolveDir: root }));
    } }],
  });
  const styles = await postcss([tailwind({ ...loadTS("tailwind.config.ts").default, content: [path.join(root, "app/**/*.tsx"), path.join(root, "components/**/*.tsx")] })]).process(await fs.readFile(path.join(root, "app/globals.css"), "utf8"), { from: path.join(root, "app/globals.css") });
  const fonts = {
    "/geist.woff2": await fs.readFile(path.join(root, "node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2")),
    "/geist-mono.woff2": await fs.readFile(path.join(root, "node_modules/geist/dist/fonts/geist-mono/GeistMono-Variable.woff2")),
  };
  const fontStyles = "@font-face{font-family:'Editor Geist';src:url('/geist.woff2') format('woff2');font-weight:100 900;font-display:swap}@font-face{font-family:'Editor Geist Mono';src:url('/geist-mono.woff2') format('woff2');font-weight:100 900;font-display:swap}:root{--font-geist-sans:'Editor Geist',Arial,sans-serif;--font-geist-mono:'Editor Geist Mono',monospace}";
  const brand = await fs.readFile(path.join(root, "app/icon.png"));
  const server = http.createServer(async (req, res) => {
    if (serveOnly && req.url.startsWith("/api/")) {
      try { await serveFixture(req, res); } catch { res.statusCode = 500; res.end(JSON.stringify({ error: "Local fixture failed" })); }
      return;
    }
    if (req.url === "/editor.js") { res.setHeader("Content-Type", "text/javascript"); res.end(bundle.outputFiles[0].contents); }
    else if (req.url === "/editor.css") { res.setHeader("Content-Type", "text/css"); res.end(fontStyles + styles.css); }
    else if (fonts[req.url]) { res.setHeader("Content-Type", "font/woff2"); res.end(fonts[req.url]); }
    else if (req.url === "/brand.png") { res.setHeader("Content-Type", "image/png"); res.end(brand); }
    else { res.setHeader("Content-Type", "text/html"); res.end('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Umprompt editor verification</title><link rel="stylesheet" href="/editor.css"></head><body><div id="root"></div><script src="/editor.js"></script></body></html>'); }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  let releaseScore;
  const requests = [];
  const saved = new Map();
  const id = "12345678-1234-4123-8123-123456789abc";
  const nextId = "12345678-1234-4123-8123-123456789abd";
  const original = "Write a polite email asking for two extra days.\n\nUse [recipient] and [task] for missing details.\nReturn a short subject line and a concise email.";
  const improved = `${original}\n\nKeep the original deadline and do not invent an excuse.`;
  const simplified = "Write a short, polite email asking for two more days. Use brackets for unknown details.";
  const replacementIdea = "Suggest three books about history";
  const recoveredPrompt = "Recommend three history books. Include each title, author, and a brief reason to read it.";
  let holdScore = true;
  let failOptimize = false;
  async function serveFixture(req, res) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : null;
    const pathname = new URL(req.url, origin).pathname;
    requests.push({ pathname, method: req.method, body });
    await fs.writeFile(path.join(artifacts, "browser-request-log.json"), JSON.stringify(requests, null, 2));
    const json = (value, status = 200) => { res.statusCode = status; res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(value)); };
    if (pathname === "/api/prompts/clarify") {
      await new Promise(resolve => setTimeout(resolve, 2000));
      if (body.idea.includes("simulate clarification failure")) return json({ error: "Synthetic clarification failure" }, 503);
      return json({ data: body.idea.includes("no questions") ? [] : [
        { question: "Who will receive this email?", options: ["My manager", "A customer"] },
        { question: "What tone should the email use?", options: ["Friendly", "Professional"] },
      ] });
    }
    if (pathname === "/api/prompts/generate") {
      if (body.idea.includes("simulate generation failure")) return json({ error: "Synthetic generation failure" }, 503);
      res.setHeader("Content-Type", "text/plain");
      res.setHeader("X-Request-Id", "synthetic-generation");
      return res.end(body.refinement ? simplified : original);
    }
    if (pathname === "/api/prompts/score") {
      if (body.generated_prompt.includes("simulate rescore failure") && body.generated_prompt.includes("Apply the score feedback")) return json({ error: "Synthetic score failure" }, 503);
      const overall = body.generated_prompt.includes("Apply the score feedback") ? 91 : 81;
      return json({ data: { overall, dimensions: ["Clarity", "Context", "Constraints", "Examples", "Output Format", "Tool Fit"].map((label, i) => ({ key: label.toLowerCase().replaceAll(" ", "_"), label, score: overall - i, reason: "Synthetic verification fixture", tip: "Make the requested output and supplied constraints explicit without inventing facts." })) } });
    }
    if (pathname === "/api/prompts/optimize") {
      await new Promise(resolve => setTimeout(resolve, 700));
      if (body.generated_prompt.includes("simulate optimization failure")) return json({ error: "Synthetic optimization failure" }, 503);
      return json({ data: { improved_prompt: body.generated_prompt + "\n\nApply the score feedback: keep the task specific, preserve the supplied facts, and return a concise subject line and email." } });
    }
    if (pathname === "/api/prompts" && req.method === "POST") {
      const key = saved.has(id) ? nextId : id;
      saved.set(key, { ...body, id: key }); return json({ data: { id: key } });
    }
    if (pathname.startsWith("/api/prompts/") && req.method === "PATCH") {
      const key = pathname.split("/").at(-1); saved.set(key, { ...body, id: key }); return json({ data: { id: key } });
    }
    if (pathname.startsWith("/api/prompts/") && req.method === "GET") return json({ data: saved.get(pathname.split("/").at(-1)) });
    return json({ error: "Unknown local fixture endpoint" }, 404);
  }
  if (serveOnly) {
    console.log(JSON.stringify({ url: origin + "/builder", mode: "isolated session and synthetic AI responses", artifacts }));
    return;
  }
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
    await context.addInitScript(() => { localStorage.setItem("umprompt_language", "en"); localStorage.setItem("umprompt_language_manual", "1"); });
    await context.route("**/*", async (route) => {
      if (!route.request().url().startsWith(origin + "/")) return route.abort("blockedbyclient");
      return route.continue();
    });
    await context.route(`${origin}/api/**`, async (route) => {
      const req = route.request();
      const pathname = new URL(req.url()).pathname;
      const body = req.postData() ? req.postDataJSON() : null;
      requests.push({ pathname, method: req.method(), body });
      const json = (value) => route.fulfill({ contentType: "application/json", body: JSON.stringify(value) });
      if (pathname === "/api/prompts/clarify") return json({ data: [] });
      if (pathname === "/api/prompts/generate") return route.fulfill({ contentType: "text/plain", headers: { "X-Request-Id": "synthetic-generation" }, body: body.refinement ? simplified : body.idea === replacementIdea ? recoveredPrompt : original });
      if (pathname === "/api/prompts/score") {
        if (holdScore) await new Promise((resolve) => { releaseScore = resolve; });
        return json({ data: { overall: 81, dimensions: [{ key: "clarity", label: "Clarity", score: 80, reason: "Synthetic fixture", tip: "Synthetic fixture" }] } }).catch(() => {});
      }
      if (pathname === "/api/prompts/optimize") return failOptimize
        ? route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Synthetic optimization failure" }) })
        : json({ data: { improved_prompt: improved } });
      if (pathname === "/api/prompts" && req.method() === "POST") { const key = saved.has(id) ? nextId : id; saved.set(key, { ...body, id: key }); return json({ data: { id: key } }); }
      if (pathname.startsWith("/api/prompts/") && req.method() === "GET") return json({ data: saved.get(pathname.split("/").at(-1)) });
      if (pathname.startsWith("/api/prompts/") && req.method() === "PATCH") { const key = pathname.split("/").at(-1); saved.set(key, { ...body, id: key }); return json({ data: { id: key } }); }
      throw new Error(`Unmocked editor API: ${req.method()} ${pathname}`);
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => { errors.push(error.message); console.error(`Editor browser error: ${error.message}`); });
    page.on("dialog", (dialog) => dialog.accept());
    await page.goto(`${origin}/builder`);
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => { navigator.clipboard.writeText = async (text) => { if (globalThis.failSyntheticCopy) throw new Error("Synthetic denied clipboard"); globalThis.syntheticCopiedText = text; }; });
    const editor = page.locator("[data-prompt-output] textarea");
    const editOutput = async () => { if (!await editor.count()) await page.getByRole("button", { name: composerCopy("en").editPrompt, exact: true }).click(); };
    const waitPreview = (value) => page.waitForFunction((text) => document.querySelector("[data-prompt-content]")?.innerText.replace(/\s+/g, " ").trim() === text.replace(/\s+/g, " ").trim(), value);
    const inputAction = composerCopy("en").optimizeRequest;
    assert.equal(await page.locator("[data-expansion-example]").count(), 1, "The example is available before starting a request.");
    await page.locator("#studio-idea").fill("f");
    assert.equal(await page.getByRole("button", { name: inputAction, exact: true }).isDisabled(), true);
    assert.equal(requests.length, 0);
    await page.locator("#studio-idea").fill("email asking for two extra days");
    await page.getByRole("button", { name: inputAction, exact: true }).click();
    await waitPreview(original);
    await page.getByText(composerCopy("en").checkingQuality, { exact: true }).waitFor();
    assert.equal(await page.locator("#studio-idea").count(), 0, "After generation, the original idea is read-only, not another editor.");
    assert.equal(await page.locator("textarea:visible").count(), 0, "A generated result is read-only by default.");
    assert.equal(await page.getByRole("button", { name: "Optimize prompt", exact: true }).count(), 0, "Optimization is not an output action.");
    for (const lang of ["en", "es", "ru"]) {
      await page.locator("#test-language").selectOption(lang);
      await page.getByText(composerCopy(lang).checkingQuality, { exact: true }).waitFor();
      await page.setViewportSize({ width: 320, height: 1000 });
      assert.equal(await page.locator("[data-prompt-output]").evaluate((el) => el.scrollWidth <= el.clientWidth), true, `${lang}: quality-check controls stay inside the editor`);
      await page.locator("[data-prompt-output]").screenshot({ path: path.join(artifacts, `website-editor-${lang}-320-checking.png`) });
    }
    await page.locator("#test-language").selectOption("en");
    await page.getByText(composerCopy("en").checkingQuality, { exact: true }).waitFor();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await editOutput();
    assert.equal(await editor.getAttribute("readonly"), null, "Explicit Edit is available during background quality checking.");
    const manual = `${original}\nKeep it under 150 words.`;
    await editor.fill(`${original}\n`);
    await editor.pressSequentially("Keep it under 150 words.");
    assert.equal(await editor.inputValue(), manual);
    holdScore = false;
    releaseScore();
    await page.getByRole("button", { name: "Copy AI prompt", exact: true }).click();
    assert.equal(await page.evaluate(() => globalThis.syntheticCopiedText), manual);
    assert.equal(await editor.count(), 0, "Copy returns the result to read-only mode.");
    assert.equal(saved.size, 0, "Copy is not Save.");
    await page.getByRole("button", { name: "Quality check", exact: true }).click();
    await page.getByText(loadTS("lib/i18n/dictionaries/en.ts").en.score.emptyTitle, { exact: true }).waitFor();
    await waitPreview(manual);
    await page.getByRole("button", { name: "Quality check", exact: true }).click();
    await page.getByRole("button", { name: /Previous versions/ }).click();
    assert.equal(await page.locator("#version-select option").count(), 2, "Typing made one version checkpoint.");
    await editOutput();
    await page.getByRole("button", { name: "Done", exact: true }).click();
    assert.equal((await page.locator("[data-prompt-content]").innerText()).replace(/\s+/g, " "), manual.replace(/\s+/g, " "));
    assert.equal(await editor.count(), 0);
    await page.getByRole("button", { name: "Edit prompt", exact: true }).click();
    assert.equal(await editor.inputValue(), manual);
    await page.getByRole("button", { name: "Done", exact: true }).click();
    assert.equal(await page.getByRole("tab", { name: "Example", exact: true }).count(), 0, "A generated prompt has no Example tab.");
    assert.equal(await page.locator("[data-expansion-example]").count(), 0, "Example content is not mounted in a generated result.");
    await waitPreview(manual);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByRole("button", { name: "Saved", exact: true }).waitFor();
    assert.equal(saved.get(id).generated_prompt, manual);
    assert.equal(saved.get(id).context.versions[0].prompt, original);
    const secondEdit = `${manual}\nUse a friendly greeting.`;
    await editOutput();
    await editor.fill(secondEdit);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByRole("button", { name: "Saved", exact: true }).waitFor();
    assert.equal(saved.size, 1);
    assert.equal(saved.get(id).generated_prompt, secondEdit);
    await page.reload();
    await waitPreview(secondEdit);
    assert.equal(await editor.count(), 0, "A reopened saved result defaults to read-only.");
    await page.evaluate(() => { navigator.clipboard.writeText = async (text) => { if (globalThis.failSyntheticCopy) throw new Error("Synthetic denied clipboard"); globalThis.syntheticCopiedText = text; }; });
    await editOutput();
    await editor.fill("");
    assert.equal(await editor.count(), 1, "Clearing the result must not unmount its editor.");
    for (const name of ["Copy AI prompt", "Save", "Simplify"]) assert.equal(await page.getByRole("button", { name, exact: true }).isDisabled(), true);
    if (!await page.locator("#version-select").isVisible()) await page.getByRole("button", { name: /Previous versions/ }).click();
    const previous = await page.locator("#version-select option").last().getAttribute("value");
    await page.locator("#version-select").selectOption(previous);
    await page.getByRole("button", { name: "Restore", exact: true }).click();
    await waitPreview(secondEdit);
    await editOutput();
    assert.equal(await editor.inputValue(), secondEdit);
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download prompt", exact: true }).click();
    assert.equal(await fs.readFile(await (await download).path(), "utf8"), secondEdit);
    await editor.fill("x".repeat(16001));
    assert.equal((await editor.inputValue()).length, 16000);
    await editor.fill(manual);
    await page.evaluate(() => { globalThis.failSyntheticCopy = true; });
    await page.getByRole("button", { name: "Copy AI prompt", exact: true }).click();
    await page.getByText(composerCopy("en").copyError, { exact: true }).waitFor();
    assert.equal(await editor.inputValue(), manual);
    await page.evaluate(() => { globalThis.failSyntheticCopy = false; });
    await page.getByRole("button", { name: "Simplify", exact: true }).click();
    await waitPreview(simplified);
    assert.equal(requests.filter((request) => request.pathname === "/api/prompts/generate").at(-1).body.refinement.prompt, manual, "Simplify uses the current manual edit.");
    await page.waitForFunction(() => document.querySelector("[data-prompt-output]").getAttribute("aria-busy") === "false");
    await editOutput();
    await editor.fill(manual);
    await page.getByRole("button", { name: "Copy AI prompt", exact: true }).click();
    for (const lang of ["en", "es", "ru"]) {
      await page.locator("#test-language").selectOption(lang);
      await page.waitForFunction((value) => document.documentElement.lang === value, lang);
      for (const width of [1440, 390, 320]) {
        await page.setViewportSize({ width, height: 1000 });
        for (const mode of ["edit", "preview"]) {
          await page.getByRole("button", { name: mode === "edit" ? composerCopy(lang).editPrompt : composerCopy(lang).done, exact: true }).click();
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${lang} ${width} ${mode}: no page overflow`);
          assert.equal(await page.locator("#studio-idea").count(), 0, `${lang} ${width}: no competing idea editor`);
          await page.locator("[data-prompt-output]").screenshot({ path: path.join(artifacts, `website-editor-${lang}-${width}-${mode}.png`) });
        }
      }
    }
    assert.equal(requests.filter((request) => request.pathname === "/api/prompts/generate").length, 2, "Only optimizing the input and explicit Simplify generate AI requests.");
    assert.equal(requests.filter((request) => request.pathname === "/api/prompts/optimize").length, 0, "Output is never passed to an Optimize action.");
    assert.deepEqual(errors, []);
    await page.locator("#test-language").selectOption("en");
    await page.setViewportSize({ width: 390, height: 1000 });
    await page.screenshot({ path: path.join(artifacts, "website-single-editor-en-390.png"), fullPage: true });
    await page.getByRole("button", { name: "New idea", exact: true }).click();
    await page.locator("#studio-idea").waitFor();
    assert.equal(await page.locator("#studio-idea").inputValue(), "");
    assert.equal(await editor.count(), 0, "A new idea has one input, not a second result editor.");
    assert.equal(saved.size, 1, "Starting a new idea preserves history.");
    assert.equal(await page.locator("[data-expansion-example]").count(), 1, "Starting a new blank idea restores the introductory example.");
    saved.set(id, { ...saved.get(id), idea: "f", generated_prompt: "Your request is too short. Please share your idea.", context: { universal: true }, score: null });
    await page.goto(`${origin}/builder?id=${id}`);
    await page.waitForFunction(() => document.getElementById("studio-idea")?.value === "f");
    assert.equal(await page.locator("[data-prompt-output]").count(), 0, "A legacy warning is not a prompt result.");
    assert.equal(await page.getByRole("button", { name: inputAction, exact: true }).isDisabled(), true);
    await page.locator("#studio-idea").fill(replacementIdea);
    assert.equal(await page.locator("[data-prompt-output]").count(), 0, "A replacement idea does not inherit an old result.");
    await page.getByRole("button", { name: inputAction, exact: true }).click();
    await waitPreview(recoveredPrompt);
    assert.equal(await page.getByText("f", { exact: true }).count(), 0, "The previous f is not left above the new result.");
    assert.equal(requests.filter((request) => request.pathname === "/api/prompts/generate").at(-1).body.idea, replacementIdea);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByRole("button", { name: "Saved", exact: true }).waitFor();
    assert.equal(saved.get(id).idea, "f", "Recovering the request never silently rewrites its old saved record.");
    assert.equal(saved.get(nextId).idea, replacementIdea);
    await page.getByRole("button", { name: "Quality check", exact: true }).click();
    const optimizeLabel = loadTS("lib/i18n/dictionaries/en.ts").en.score.autoFix;
    await page.getByRole("button", { name: optimizeLabel, exact: true }).click();
    await waitPreview(improved);
    const optimization = requests.filter(request => request.pathname === "/api/prompts/optimize").at(-1);
    assert.equal(optimization.body.generated_prompt, recoveredPrompt, "Criteria optimization uses the current prompt, not the original rough idea.");
    assert.equal(optimization.body.score.overall, 81);
    assert.ok(optimization.body.score.dimensions[0].tip);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByRole("button", { name: "Saved", exact: true }).waitFor();
    assert.equal(saved.get(nextId).generated_prompt, improved);
    assert.equal(saved.get(nextId).context.versions.at(-1).prompt, recoveredPrompt);
    failOptimize = true;
    await page.getByRole("button", { name: optimizeLabel, exact: true }).click();
    await page.getByText(composerCopy("en").optimizeError, { exact: true }).waitFor();
    await waitPreview(improved);
    assert.equal(saved.get(nextId).generated_prompt, improved, "A failed optimization does not change saved history.");
    await page.reload();
    await waitPreview(improved);
    assert.equal(await page.locator("[data-expansion-example]").count(), 0, "Saved prompts never restore the introductory example.");
    console.log("PASS: request-only optimization, default read-only result, explicit Edit/Done, legacy f recovery, no stale source or output, stale-score protection, version checkpoints, copy/download, explicit Save/update/reopen, clear/restore, example only before starting, 21 desktop/mobile layouts.");
    console.log("The browser uses isolated session/API fixtures; it does not sign into or change a live user account.");
  } finally {
    if (releaseScore) releaseScore();
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
