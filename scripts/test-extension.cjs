const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { chromium } = require("playwright");
const { loadTS } = require("./load-ts.cjs");
const { extensionCopy } = loadTS("extension/src/copy.ts");
const { composerCopy } = loadTS("lib/composer-copy.ts");
const { buildExtension } = require("./build-extension.cjs");
const inputAction = composerCopy("en").optimizeRequest;

async function main() {
  const root = path.resolve(__dirname, "..");
  const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), "umprompt-extension-test-"));
  const extension = path.join(sandbox, "package");
  await buildExtension({ local: true, outputDirectory: extension });
  const artifacts = path.join(root, "extension/artifacts");
  const manifest = JSON.parse(await fs.readFile(path.join(extension, "manifest.json"), "utf8"));
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions.sort(), ["clipboardWrite", "identity", "sidePanel", "storage"]);
  assert.equal(manifest.content_scripts, undefined);
  assert.equal(manifest.externally_connectable, undefined);
  assert.equal(manifest.host_permissions.some((host) => host.includes("*") && !host.endsWith("/*")), false);
  const supabase = manifest.host_permissions.find((host) => host.startsWith("https:")).slice(0, -2);
  await fs.mkdir(artifacts, { recursive: true });
  const profile = path.join(sandbox, "profile");
  const context = await chromium.launchPersistentContext(profile, {
    channel: "chromium", headless: true,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
    viewport: { width: 420, height: 900 },
  });
  const errors = [];
  const requests = [];
  const saved = new Map();
  let failSave = false;
  let limit = false;
  let expired = false;
  let holdGeneration = false;
  let paid = false;
  let backendMode = "ready";
  let responseMode = "ready";
  const original = "Write a polite email asking for two extra days. Use placeholders for the recipient and task. Return a subject line and a concise email.";
  const improved = `${original}\n\nPreserve the original deadline and do not invent an excuse.`;
  const simplified = "Write a short, polite email asking for two more days. Leave unknown details in brackets.";
  try {
    const worker = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker");
    const id = new URL(worker.url()).host;
    assert.equal((await worker.evaluate(() => chrome.sidePanel.getPanelBehavior())).openPanelOnActionClick, true);
    // Fixtures live only in this fresh test process, never in the extension package.
    await worker.evaluate(({ supabase }) => {
      const user = { id: "12345678-1234-4123-8123-123456789abc", email: "synthetic@example.test", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() };
      globalThis.authFixture = { signIns: 0, refreshes: 0, user, mode: "success", flows: [], exchanges: [] };
      const encode = (value) => btoa(JSON.stringify(value)).replaceAll("=", "").replaceAll("+", "-").replaceAll("/", "_");
      const token = () => `${encode({ alg: "HS256" })}.${encode({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600, role: "authenticated", aud: "authenticated" })}.synthetic`;
      globalThis.fetch = async (input, options = {}) => {
        const url = new URL(typeof input === "string" ? input : input.url ?? String(input));
        if (url.origin !== supabase) throw new Error("Test blocked a non-fixture auth request.");
        if (url.pathname.endsWith("/token")) {
          if (url.searchParams.get("grant_type") === "pkce") {
            if (globalThis.authFixture.mode === "exchange") return new Response(JSON.stringify({ error: "invalid_grant", error_description: "private-provider-detail" }), { status: 400, headers: { "Content-Type": "application/json" } });
            const body = JSON.parse(options.body);
            const flow = globalThis.authFixture.flows.at(-1);
            if (!body.code_verifier || body.auth_code !== `synthetic-${flow.provider}-pkce-code`) throw new Error("Missing PKCE proof.");
            const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body.code_verifier));
            const challenge = btoa(String.fromCharCode(...new Uint8Array(digest))).replaceAll("=", "").replaceAll("+", "-").replaceAll("/", "_");
            if (challenge !== flow.challenge) throw new Error("PKCE challenge does not match the verifier.");
            globalThis.authFixture.exchanges.push(flow.provider);
            globalThis.authFixture.signIns++;
          } else globalThis.authFixture.refreshes++;
          return new Response(JSON.stringify({ access_token: token(), refresh_token: "synthetic-refresh", expires_in: 3600, token_type: "bearer", user }), { headers: { "Content-Type": "application/json" } });
        }
        if (url.pathname.endsWith("/user")) return new Response(JSON.stringify(user), { headers: { "Content-Type": "application/json" } });
        if (url.pathname.endsWith("/logout")) return new Response("{}", { headers: { "Content-Type": "application/json" } });
        throw new Error(`Unmocked auth path ${url.pathname}`);
      };
      chrome.identity.launchWebAuthFlow = async ({ url }) => {
        const target = new URL(url);
        if (target.origin !== supabase || target.pathname !== "/auth/v1/authorize") throw new Error("Unexpected authorization endpoint.");
        if (!target.searchParams.get("code_challenge")) throw new Error("PKCE challenge missing.");
        if (target.searchParams.get("code_challenge_method") !== "s256") throw new Error("PKCE must use S256.");
        if (target.searchParams.get("redirect_to") !== chrome.identity.getRedirectURL("auth")) throw new Error("Unexpected callback.");
        const provider = target.searchParams.get("provider");
        if (!["google", "github"].includes(provider)) throw new Error("Unexpected OAuth provider.");
        globalThis.authFixture.flows.push({ provider, challenge: target.searchParams.get("code_challenge") });
        const callback = chrome.identity.getRedirectURL("auth");
        if (globalThis.authFixture.mode === "website") return "https://www.umprompt.com/login?code=wrong-destination-code";
        if (globalThis.authFixture.mode === "missing") return callback;
        if (globalThis.authFixture.mode === "denied") return `${callback}#error=access_denied&error_description=private-provider-detail`;
        if (globalThis.authFixture.mode === "closed") throw new Error("The user did not approve access.");
        if (globalThis.authFixture.mode === "busy") throw new Error("Only one web auth flow is allowed at a time.");
        if (globalThis.authFixture.mode === "network") throw new Error("Authorization page could not be loaded.");
        if (globalThis.authFixture.mode === "window") throw new Error("Couldn't create a browser window to display an authorization page.");
        if (globalThis.authFixture.mode === "failed") throw new Error("Unknown browser failure with private-provider-detail");
        return `${callback}?code=synthetic-${provider}-pkce-code`;
      };
    }, { supabase });
    await context.route("http://localhost:3000/api/extension/**", async (route) => {
      const req = route.request();
      const pathname = new URL(req.url()).pathname.replace("/api/extension/", "");
      if (pathname === "health") {
        if (backendMode === "offline") return route.abort("connectionrefused");
        if (backendMode === "missing") return route.fulfill({ status: 404, contentType: "text/html", body: "<h1>Not found</h1>" });
        return route.fulfill({ contentType: "application/json", body: JSON.stringify({ service: "umprompt-extension", version: 1 }) });
      }
      assert.match(req.headers().authorization, /^Bearer /);
      assert.equal(req.headers().cookie, undefined);
      requests.push({ pathname, method: req.method(), body: req.postDataJSON() });
      const json = (body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
      if (expired) return json({ error: "Expired session" }, 401);
      if (pathname === "status") return json({ data: { isPaid: paid, remainingThisWeek: paid ? null : 5 } });
      if (pathname === "prompts") return json({ data: [...saved.values()] });
      if (pathname === "generate") {
        if (holdGeneration) await new Promise((resolve) => setTimeout(resolve, 1000));
        if (limit) return json({ error: "FREE_LIMIT_REACHED", upgradeRequired: true }, 402);
        if (responseMode === "html") return route.fulfill({ contentType: "text/html", body: "<h1>Sign in</h1>" });
        if (responseMode === "empty") return route.fulfill({ contentType: "text/plain", body: " " });
        if (responseMode === "limited") return json({ error: "Slow down" }, 429);
        return route.fulfill({ contentType: "text/plain", body: req.postDataJSON().refinement ? simplified : original });
      }
      if (pathname === "score") return json({ data: { overall: 75, dimensions: [{ key: "clarity", label: "Clarity", score: 70, reason: "Synthetic reason", tip: "Synthetic tip" }] } });
      if (pathname === "optimize") throw new Error("Result optimization must not be called by the panel.");
      if (pathname.startsWith("prompts/") && req.method() === "PUT") {
        if (failSave) return json({ error: "Synthetic failure" }, 500);
        const draftId = pathname.slice(8);
        saved.set(draftId, { ...req.postDataJSON(), id: draftId, title: "Synthetic saved prompt", updated_at: new Date().toISOString() });
        return json({ data: { id: draftId } });
      }
      throw new Error(`Unmocked API path ${pathname}`);
    });
    const page = await context.newPage();
    const outputText = () => page.locator(".output").evaluate((el) => el instanceof HTMLTextAreaElement ? el.value : el.textContent);
    const waitOutput = (value) => page.waitForFunction((text) => { const el = document.querySelector(".output"); return (el?.value ?? el?.textContent) === text; }, value);
    const editOutput = async () => { if (!await page.locator("textarea.output").count()) await page.getByRole("button", { name: "Edit prompt", exact: true }).click(); };
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (msg) => {
      if (msg.type() === "error" && !/^Failed to load resource: (the server responded with a status of (401|402|404|429|500) |net::ERR_CONNECTION_REFUSED)/.test(msg.text())) errors.push(msg.text());
    });
    page.on("dialog", (dialog) => dialog.accept());
    await page.goto(`chrome-extension://${id}/panel.html`);
    await page.evaluate(() => {
      const write = navigator.clipboard.writeText.bind(navigator.clipboard);
      navigator.clipboard.writeText = async (text) => { await write(text); globalThis.syntheticCopiedText = text; };
    });
    await page.getByRole("button", { name: "Continue with Google", exact: true }).waitFor();
    assert.equal(await page.getByRole("alert").count(), 0, "Opening the panel does not report a failed prompt operation.");
    assert.equal(await page.getByRole("button", { name: inputAction, exact: true }).isDisabled(), true);
    assert.equal(await page.getByRole("tab").count(), 0, "No result tabs before a prompt exists.");
    assert.equal(await page.locator(".output").count(), 0);
    assert.equal(await page.getByRole("heading", { name: "Example expansion", exact: true }).count(), 1);
    assert.equal(await page.getByText("Expanded AI prompt", { exact: true }).count(), 1);
    await page.getByRole("button", { name: "Use this idea", exact: true }).click();
    assert.equal(await page.locator("#idea").inputValue(), "email asking for 2 extra days");
    assert.equal(requests.length, 0, "Choosing an example does not generate or save anything.");
    await page.locator("#idea").fill("email asking for two extra days");
    for (const mode of ["missing", "offline"]) {
      backendMode = mode;
      await page.reload();
      const message = mode === "offline" ? extensionCopy("en").localOffline : extensionCopy("en").serviceErrors.missing;
      await page.getByText(message, { exact: true }).waitFor();
      assert.equal(await page.locator("#idea").inputValue(), "email asking for two extra days");
      assert.equal(await page.getByRole("button", { name: inputAction, exact: true }).isDisabled(), true);
      await page.screenshot({ path: path.join(artifacts, `backend-${mode}-en-420.png`), fullPage: true });
      backendMode = "ready";
      await page.getByRole("button", { name: "Try again", exact: true }).click();
      await page.waitForFunction(() => !document.querySelector(".error"));
      assert.equal(requests.length, 0, "Connection recovery never generates, saves, or reads private history.");
    }
    await page.evaluate(() => { navigator.clipboard.writeText = async (text) => { globalThis.syntheticCopiedText = text; }; });
    for (const provider of ["Google", "GitHub"]) {
      for (const mode of ["website", "missing", "denied", "closed", "busy", "network", "window", "failed", "exchange"]) {
        await worker.evaluate((value) => { globalThis.authFixture.mode = value; }, mode);
        await page.getByRole("button", { name: `Continue with ${provider}`, exact: true }).click();
        await page.getByRole("alert").waitFor();
        const reason = ["website", "missing"].includes(mode) ? "redirect" : ["denied", "closed"].includes(mode) ? "cancelled" : mode;
        assert.equal(await page.getByRole("alert").innerText(), extensionCopy("en").signInErrors[reason]);
        assert.equal(await page.locator(".auth-details").getAttribute("open"), reason === "redirect" ? "" : null);
        assert.equal(await page.locator(".callback-row code").textContent(), `https://${id}.chromiumapp.org/auth`);
        assert.equal(await page.locator(".callback-row code").isVisible(), reason === "redirect");
        assert.equal(await page.getByRole("button", { name: `Continue with ${provider}`, exact: true }).isEnabled(), true);
        assert.equal((await page.locator(".connection").innerText()).includes("private-provider-detail"), false);
        assert.equal(await page.locator("#idea").inputValue(), "email asking for two extra days");
        assert.equal(await page.locator(".output").count(), 0);
        assert.equal(await worker.evaluate(async () => (await chrome.storage.local.get("umprompt-extension-auth-code-verifier"))["umprompt-extension-auth-code-verifier"]), undefined);
      }
    }
    assert.equal(await worker.evaluate(() => globalThis.authFixture.signIns), 0);
    assert.equal(requests.length, 0, "Invalid callbacks never sign in, read history or generate prompts.");
    const sendMessage = await page.evaluateHandle(() => chrome.runtime.sendMessage);
    await page.evaluate(() => { chrome.runtime.sendMessage = async () => { throw new Error("Could not establish connection. Receiving end does not exist."); }; });
    await page.getByRole("button", { name: "Continue with Google", exact: true }).click();
    assert.equal(await page.getByRole("alert").innerText(), extensionCopy("en").signInErrors.connection);
    assert.equal(await page.locator(".auth-details").getAttribute("open"), null);
    await page.evaluate((original) => { chrome.runtime.sendMessage = original; }, sendMessage);
    await sendMessage.dispose();
    await page.locator(".auth-details summary").click();
    await page.getByRole("button", { name: "Copy sign-in callback", exact: true }).click();
    assert.equal(await page.evaluate(() => globalThis.syntheticCopiedText), `https://${id}.chromiumapp.org/auth`);
    await page.setViewportSize({ width: 320, height: 900 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, "Sign-in help fits a narrow panel.");
    await page.screenshot({ path: path.join(artifacts, "sign-in-help-en-320.png"), fullPage: true });
    await page.locator(".auth-details summary").click();
    for (const language of ["en", "ru", "es"]) {
      await page.locator("#language").selectOption(language);
      const google = extensionCopy(language).google;
      await page.getByRole("button", { name: google, exact: true }).click();
      await page.getByRole("alert").waitFor();
      assert.equal(await page.getByRole("alert").innerText(), extensionCopy(language).signInErrors.exchange);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Sign-in error fits ${language}.`);
      await page.screenshot({ path: path.join(artifacts, `sign-in-error-${language}-320.png`), fullPage: true });
    }
    await page.locator("#language").selectOption("en");
    await page.setViewportSize({ width: 420, height: 900 });
    await worker.evaluate(() => { globalThis.authFixture.mode = "success"; });
    await page.getByRole("button", { name: "Continue with Google", exact: true }).click();
    await page.getByRole("button", { name: inputAction, exact: true }).waitFor({ state: "visible" });
    await page.waitForFunction(() => !document.querySelector(".expand").disabled);
    assert.equal(await page.locator("#idea").inputValue(), "email asking for two extra days");
    assert.equal(await worker.evaluate(() => globalThis.authFixture.signIns), 1);
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await page.getByRole("button", { name: "Continue with GitHub", exact: true }).waitFor();
    await page.locator("#idea").fill("email asking for two extra days");
    await page.getByRole("button", { name: "Continue with GitHub", exact: true }).click();
    await page.waitForFunction(() => !document.querySelector(".expand").disabled);
    assert.equal(await page.locator("#idea").inputValue(), "email asking for two extra days");
    assert.deepEqual(await worker.evaluate(() => globalThis.authFixture.exchanges), ["google", "github"]);
    await page.locator("#idea").fill("f");
    assert.equal(await page.getByRole("button", { name: inputAction, exact: true }).isDisabled(), true);
    assert.equal(await page.locator("#idea-feedback").innerText(), "Add a few words about what you want help with.");
    assert.equal(requests.filter((request) => request.pathname === "generate").length, 0);
    await page.locator("#idea").fill("email asking for two extra days");
    for (const lang of ["en", "ru", "es"]) {
      for (const width of [420, 320, 280]) {
        await page.setViewportSize({ width, height: 900 });
        await page.locator("#language").selectOption(lang);
        await page.waitForFunction((language) => document.documentElement.lang === language, lang);
        assert.equal(await page.getByRole("tab").count(), 0, "Signing in keeps the example, not a fake result.");
        assert.equal(await page.locator(".example").count(), 1);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `example ${lang} ${width}: overflow`);
        await page.screenshot({ path: path.join(artifacts, `example-${lang}-${width}.png`), fullPage: true });
      }
    }
    await page.setViewportSize({ width: 420, height: 900 });
    await page.locator("#language").selectOption("en");
    await worker.evaluate(async () => {
      const idea = "f";
      await chrome.storage.local.set({ "draft:12345678-1234-4123-8123-123456789abc": { id: crypto.randomUUID(), idea, details: "", category: "auto", prompt: "Your request is too short. Please share your idea.", resultInput: JSON.stringify([idea, "", "auto"]), savedFingerprint: "", versions: [] } });
    });
    await page.reload();
    await page.locator("#idea").waitFor();
    await page.evaluate(() => { navigator.clipboard.writeText = async (text) => { globalThis.syntheticCopiedText = text; }; });
    assert.equal(await page.locator("#idea").inputValue(), "f");
    assert.equal(await page.locator(".output").count(), 0, "A legacy short-request response is not a prompt or an editable result.");
    assert.equal(await page.getByRole("button", { name: "Edit prompt", exact: true }).count(), 0);
    assert.equal(await page.getByRole("button", { name: inputAction, exact: true }).isDisabled(), true);
    await page.locator("#idea").fill("email asking for two extra days");
    assert.equal(await page.locator(".output").count(), 0, "Typing a replacement request does not reveal the previous f response.");
    holdGeneration = true;
    await page.getByRole("button", { name: inputAction, exact: true }).click();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await page.getByRole("alert").waitFor();
    assert.equal(await page.getByRole("tab").count(), 0, "Cancelling the first generation does not leave a pretend result.");
    assert.equal(await page.locator(".example").count(), 1);
    assert.equal(await page.locator("#idea").inputValue(), "email asking for two extra days");
    holdGeneration = false;
    await page.getByRole("button", { name: inputAction, exact: true }).click();
    await page.getByRole("button", { name: "Copy AI prompt", exact: true }).waitFor();
    assert.equal(await outputText(), original);
    assert.equal(requests.filter((request) => request.pathname === "generate").at(-1).body.idea, "email asking for two extra days");
    assert.equal(requests.filter((request) => request.pathname === "generate").at(-1).body.generated_prompt, "", "Optimize request uses the input, not a stale output.");
    assert.equal(await page.locator("#idea").count(), 0, "The original idea editor is removed after generation.");
    assert.equal(await page.getByRole("button", { name: "Edit idea", exact: true }).count(), 0, "There is no competing Edit idea control.");
    assert.equal(await page.locator("textarea:visible").count(), 0, "Results are read-only until Edit is selected.");
    assert.equal(await page.getByRole("button", { name: "Optimize prompt", exact: true }).count(), 0);
    assert.equal(saved.size, 0);
    assert.equal(await page.getByRole("tab").count(), 2);
    assert.equal(await page.locator(".example").count(), 0);
    await page.getByRole("tab", { name: "Example", exact: true }).click();
    assert.equal(await page.getByRole("tabpanel").getByText("Goal", { exact: true }).count(), 1);
    assert.equal(await page.locator(".output").count(), 0, "Example and real result are independent views.");
    assert.equal(await page.getByRole("button", { name: "Copy AI prompt", exact: true }).count(), 0);
    assert.equal(await page.getByRole("tabpanel").getByText("Expanded AI prompt", { exact: true }).count(), 1);
    await page.screenshot({ path: path.join(artifacts, "example-tab-en-420.png"), fullPage: true });
    await page.getByRole("tab", { name: "Your prompt", exact: true }).click();
    assert.equal(await outputText(), original);
    await page.getByRole("tab", { name: "Your prompt", exact: true }).press("ArrowRight");
    assert.equal(await page.getByRole("tab", { name: "Example", exact: true }).getAttribute("aria-selected"), "true");
    await page.getByRole("tab", { name: "Example", exact: true }).press("Home");
    await page.getByRole("button", { name: "Copy AI prompt", exact: true }).click();
    await page.getByRole("button", { name: "Copied", exact: true }).waitFor();
    assert.equal(await page.evaluate(() => globalThis.syntheticCopiedText), original);
    assert.equal(saved.size, 0);
    const generatedCalls = requests.filter((request) => ["generate", "score", "optimize"].includes(request.pathname)).length;
    await editOutput();
    await page.locator(".output").fill(`${original}\n`);
    await page.locator(".output").pressSequentially("Keep it under 150 words.");
    const manual = `${original}\nKeep it under 150 words.`;
    assert.equal(await outputText(), manual);
    assert.equal(requests.filter((request) => ["generate", "score", "optimize"].includes(request.pathname)).length, generatedCalls, "Typing never calls AI.");
    await page.getByRole("button", { name: "Copy AI prompt", exact: true }).click();
    assert.equal(await page.evaluate(() => globalThis.syntheticCopiedText), manual);
    await page.screenshot({ path: path.join(artifacts, "edited-panel-en-420.png"), fullPage: true });
    await page.reload();
    await page.locator(".output").waitFor();
    assert.equal(await outputText(), manual);
    assert.equal(await page.locator("textarea.output").count(), 0, "Reopening edited text defaults to a read-only result.");
    const manualVersions = await worker.evaluate(async (owner) => (await chrome.storage.local.get(`draft:${owner}`))[`draft:${owner}`].versions, "12345678-1234-4123-8123-123456789abc");
    assert.equal(manualVersions.length, 1, "An editing session creates one checkpoint, not a version per keystroke.");
    assert.equal(manualVersions[0].prompt, original);
    await page.getByRole("button", { name: "Previous version", exact: true }).click();
    assert.equal(await outputText(), original);
    await editOutput();
    await page.locator(".output").fill("");
    assert.equal(await page.locator(".output").count(), 1);
    for (const name of ["Copy AI prompt", "Save to my history", "Simplify"]) assert.equal(await page.getByRole("button", { name, exact: true }).isDisabled(), true);
    await page.reload();
    await page.locator(".output").waitFor();
    await editOutput();
    assert.equal(await outputText(), "", "A cleared draft can explicitly enter edit mode after reopening.");
    await page.getByRole("button", { name: "Previous version", exact: true }).click();
    assert.equal(await outputText(), original);
    await editOutput();
    await page.locator(".output").fill(improved);
    await page.getByRole("button", { name: "Done", exact: true }).click();
    assert.equal(await page.locator("textarea.output").count(), 0);
    await page.getByRole("button", { name: "Simplify", exact: true }).click();
    await waitOutput(simplified);
    await page.getByRole("button", { name: "Previous version", exact: true }).click();
    assert.equal(await outputText(), improved);
    for (const mode of ["html", "empty", "limited"]) {
      responseMode = mode;
      await page.getByRole("button", { name: "Simplify", exact: true }).click();
      await page.getByText(extensionCopy("en").serviceErrors[mode === "limited" ? "rateLimit" : "invalid"], { exact: true }).waitFor();
      assert.equal(await outputText(), improved, "A failed response cannot replace the previous prompt.");
    }
    responseMode = "ready";
    failSave = true;
    await page.getByRole("button", { name: "Save to my history", exact: true }).click();
    await page.getByRole("alert").waitFor();
    assert.equal(await page.getByRole("alert").innerText(), extensionCopy("en").saveError);
    assert.equal(saved.size, 0);
    failSave = false;
    await page.getByRole("button", { name: "Save to my history", exact: true }).click();
    await page.getByRole("button", { name: "Saved to your history", exact: true }).waitFor();
    assert.equal(saved.size, 1);
    const firstId = [...saved.keys()][0];
    await page.reload();
    await page.locator(".output").waitFor();
    assert.equal(await outputText(), improved);
    const savedEdit = `${improved}\nKeep the subject line short.`;
    await editOutput();
    await page.locator(".output").fill(savedEdit);
    assert.equal(await page.getByRole("button", { name: "Save to my history", exact: true }).isEnabled(), true);
    await page.getByRole("button", { name: "Save to my history", exact: true }).click();
    await page.getByRole("button", { name: "Saved to your history", exact: true }).waitFor();
    assert.equal(saved.size, 1);
    assert.equal(saved.get(firstId).generated_prompt, savedEdit);
    await page.reload();
    await page.locator(".output").waitFor();
    assert.equal(await outputText(), savedEdit);
    await page.getByRole("button", { name: "Simplify", exact: true }).click();
    await waitOutput(simplified);
    assert.equal(requests.filter((request) => request.pathname === "generate").at(-1).body.refinement.prompt, savedEdit, "Simplify uses the saved manual edit, not an older generated result.");
    await page.getByRole("button", { name: "Save to my history", exact: true }).click();
    await page.getByRole("button", { name: "Saved to your history", exact: true }).waitFor();
    assert.equal(saved.size, 1); assert.equal([...saved.keys()][0], firstId);
    for (const lang of ["en", "ru", "es"]) {
      for (const width of [420, 320, 280]) {
        await page.setViewportSize({ width, height: 900 });
        await page.locator("#language").selectOption(lang);
        await page.waitForFunction((language) => document.documentElement.lang === language, lang);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${lang} ${width}: overflow`);
        assert.equal(await page.locator(".brand img").evaluate((image) => image.complete && image.naturalWidth > 0), true);
        await page.screenshot({ path: path.join(artifacts, `panel-${lang}-${width}.png`), fullPage: true });
      }
    }
    await page.setViewportSize({ width: 420, height: 900 });
    await page.locator("#language").selectOption("en");
    await page.getByRole("button", { name: "History", exact: true }).click();
    await page.getByRole("button", { name: /Synthetic saved prompt/ }).waitFor();
    await page.getByRole("button", { name: /Synthetic saved prompt/ }).click();
    assert.equal(await outputText(), simplified);
    holdGeneration = true;
    await page.getByRole("button", { name: "Simplify", exact: true }).click();
    assert.equal(await page.locator("textarea.output").count(), 0, "Generation never turns a result into an editable request box.");
    assert.equal(await page.getByRole("button", { name: "Edit prompt", exact: true }).isDisabled(), true);
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await page.getByRole("alert").waitFor();
    assert.equal(await outputText(), simplified);
    holdGeneration = false;
    limit = true;
    await page.getByRole("button", { name: "Simplify", exact: true }).click();
    await page.getByRole("link", { name: "View plans", exact: true }).waitFor();
    assert.equal(await outputText(), simplified);
    paid = true;
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await page.getByText("Pro account", { exact: true }).waitFor();
    assert.equal(await page.getByRole("link", { name: "View plans", exact: true }).count(), 0);
    paid = false;
    limit = false; expired = true;
    await page.getByRole("button", { name: "Simplify", exact: true }).click();
    await page.getByRole("button", { name: "Continue with Google", exact: true }).waitFor();
    assert.equal(await outputText(), simplified);
    expired = false;
    await page.getByRole("button", { name: "Continue with Google", exact: true }).click();
    await page.waitForFunction(() => !document.querySelector(".result-actions button:last-child").disabled);
    await worker.evaluate(async () => {
      const key = "umprompt-extension-auth";
      const value = JSON.parse((await chrome.storage.local.get(key))[key]);
      value.expires_at = Math.floor(Date.now() / 1000) - 60;
      await chrome.storage.local.set({ [key]: JSON.stringify(value) });
    });
    await page.getByRole("button", { name: "Simplify", exact: true }).click();
    await waitOutput(simplified);
    assert.ok(await worker.evaluate(() => globalThis.authFixture.refreshes) >= 1);
    await page.getByRole("button", { name: "New prompt", exact: true }).click();
    assert.equal(await page.locator(".output").count(), 0);
    assert.equal(await page.locator("#idea").inputValue(), "");
    assert.equal(await page.locator("textarea:visible").count(), 1, "A new task returns to one idea input.");
    assert.equal(saved.size, 1, "A new task never removes cloud history.");
    await page.locator("#idea").fill("Plan a new polite email");
    await page.getByRole("button", { name: inputAction, exact: true }).click();
    await waitOutput(original);
    const secondPanel = await context.newPage();
    await secondPanel.goto(`chrome-extension://${id}/panel.html`);
    await secondPanel.locator(".output").waitFor();
    // Explicit logout must also clear the owner's draft after the session has disappeared.
    await worker.evaluate(() => chrome.storage.local.remove("umprompt-extension-auth"));
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await page.getByRole("button", { name: "Continue with Google", exact: true }).waitFor();
    await secondPanel.getByRole("button", { name: "Continue with Google", exact: true }).waitFor();
    assert.equal(await secondPanel.locator(".output").count(), 0);
    assert.equal(await page.getByRole("tab").count(), 0);
    assert.equal(await secondPanel.getByRole("tab").count(), 0);
    assert.equal(await page.locator(".example").count(), 1);
    assert.equal(await secondPanel.locator(".example").count(), 1);
    assert.equal(await page.locator("#idea").inputValue(), "");
    const storage = await worker.evaluate(() => chrome.storage.local.get(null));
    assert.equal(Object.keys(storage).some((key) => key.startsWith("umprompt-extension-auth") || key.startsWith("draft:12345678")), false);
    assert.equal(saved.size, 1);
    assert.deepEqual(errors, []);
    assert.equal(requests.filter((req) => req.method === "PUT").length, 4);
    assert.equal(requests.filter((req) => req.pathname === "optimize").length, 0, "The result has no AI optimization action.");
    console.log(`PASS: packaged Chrome extension ${id}`);
    console.log(`Callback: https://${id}.chromiumapp.org/auth`);
    console.log("PASS: Google/GitHub PKCE fixtures, invalid callbacks, cancellation, native window/network failures, disconnected worker, exchange failure, safe sign-in diagnostics, independent example, read-only result/Edit/Done, input-only optimization, legacy f recovery, draft restore, simplify/undo/copy, explicit idempotent Save, history, failures, limits, expiration, refresh, sign-out, 18 layouts.");
    console.log("Real Google/GitHub sign-in, live database persistence and store review still require separate verification.");
    console.log(`Screenshots: ${artifacts}`);
  } finally {
    await context.close();
    const resolved = await fs.realpath(sandbox);
    const temp = await fs.realpath(os.tmpdir());
    if (resolved.startsWith(temp + path.sep) && path.basename(resolved).startsWith("umprompt-extension-test-")) {
      await fs.rm(resolved, { recursive: true, force: true });
    }
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
