const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const { parseWorkspaceItem } = require("./load-ts.cjs").loadTS("lib/workspace.ts");
const { composerCopy } = require("./load-ts.cjs").loadTS("lib/composer-copy.ts");
const base = "http://localhost:3000";
const screenshots = process.env.UI_SCREENSHOT_DIR;
const id = "12345678-1234-1234-1234-123456789abc";
const profileId = "12345678-1234-1234-1234-123456789abd";
const original = "Write a clear product launch email for students. Preserve supplied facts, avoid invented claims, and return a subject line plus a concise email.";
const shorter = "Draft a launch email for students, with a subject line. Use only supplied facts.";
const optimized = "Write a concise product launch email for students. Use only supplied product facts and avoid invented claims. Return a subject line followed by a friendly, professional email.";
const score = { overall: 82, dimensions: [] };
const fixture = { id, user_id: "synthetic-owner", title: "Launch email", idea: "Write a product launch email", context: { universal: true, category: "business" }, target_tool: "claude", generated_prompt: original, score };
// Generate isolated fixture routes for this run, then remove only those files.
// No real session, account content, provider requests, or payments are used.
const root = path.resolve(__dirname, "..");
const fixtures = [["interaction-check", 'export { default } from "../builder/page";\n'], ["qa-library", 'export { default } from "../library/page";\n']];
const owned = [];
function setupFixtures() {
  for (const [name, source] of fixtures) {
    const directory = path.join(root, "app", name);
    const file = path.join(directory, "page.tsx");
    if (fs.existsSync(file) && fs.readFileSync(file, "utf8") !== source) throw new Error(`Refusing to overwrite an existing route: ${name}`);
    fs.mkdirSync(directory, { recursive: true });
    if (!fs.existsSync(file)) fs.writeFileSync(file, source, { flag: "wx" });
    owned.push(name);
  }
}
function cleanupFixtures() {
  for (const name of owned) {
    for (const [base, filename] of [["app", "page.tsx"], [".next-dev/types/app", "page.ts"]]) {
      const directory = path.resolve(root, base, name);
      assert.ok(directory.startsWith(`${path.resolve(root, base)}${path.sep}`));
      const file = path.join(directory, filename);
      if (fs.existsSync(file)) fs.unlinkSync(file);
      if (fs.existsSync(directory) && fs.readdirSync(directory).length === 0) fs.rmdirSync(directory);
    }
  }
}
let browser;
(async () => {
  setupFixtures();
  browser = await chromium.launch();
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: width === 390 ? "reduce" : "no-preference", permissions: ["clipboard-read", "clipboard-write"] });
    const page = await context.newPage();
    const errors = [];
    const consoleErrors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error" && !/Failed to load resource/.test(message.text())) consoleErrors.push(message.text()); });
    let generated = 0;
    let itemSequence = 0;
    let failNext = false;
    let failScoreNext = false;
    let failOptimizeNext = false;
    let scoreRequests = 0;
    const optimizeRequests = [];
    let optimizationResponse = optimized;
    let holdOptimization = false;
    let releaseOptimization;
    let optimizationStarted;
    let saved;
    let checkoutReady = false;
    let verification = "pending";
    let checkoutRequests = [];
    let paid = false;
    let items = [{ id: profileId, kind: "profile", name: "Synthetic studio", payload: { details: "Design studio", audience: "Students", voice: "Friendly", constraints: "No exaggerated claims" }, updated_at: new Date().toISOString() }];
    await page.route("**/api/**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      let body;
      try { body = request.postDataJSON(); } catch {}
      let data = {};
      let status = 200;
      if (url.pathname === "/api/usage") data = { plan: paid ? "pro_monthly" : "free", isPaid: paid, remainingThisWeek: 2, weeklyLimit: 7, usedThisWeek: 5 };
      else if (url.pathname === "/api/workspace") {
        if (request.method() === "POST") { const item = { ...parseWorkspaceItem(body).data, id: `12345678-1234-1234-1234-123456789${(++itemSequence).toString(16).padStart(3, "0")}`, updated_at: new Date().toISOString() }; items = [item, ...items]; data = { data: item }; }
        else if (request.method() === "PATCH") { const item = { ...body, id: url.searchParams.get("id"), updated_at: new Date().toISOString() }; items = items.map((i) => i.id === item.id ? item : i); data = { data: item }; }
        else if (request.method() === "DELETE") { items = items.filter((i) => i.id !== url.searchParams.get("id")); data = { success: true }; }
        else data = { data: items };
      } else if (url.pathname === `/api/prompts/${id}`) {
        if (request.method() === "PATCH") { saved = body; data = { data: { ...fixture, ...body } }; }
        else data = { data: fixture };
      } else if (url.pathname === "/api/prompts/generate") {
        generated++;
        assert.equal(body.context.profileConsent, true);
        assert.equal(body.context.profile.name, "Synthetic studio");
        if (failNext) { failNext = false; status = 503; data = { error: "Synthetic provider unavailable" }; }
        else { await route.fulfill({ status: 200, contentType: "text/plain", body: shorter, headers: { "X-Request-Id": "synthetic-refinement" } }); return; }
      } else if (url.pathname === "/api/prompts/score") {
        scoreRequests++;
        if (failScoreNext) { failScoreNext = false; status = 503; data = { error: "Synthetic scoring unavailable" }; }
        else data = { data: score };
      } else if (url.pathname === "/api/prompts/optimize") {
        optimizeRequests.push(body);
        assert.deepEqual(body.score, score);
        if (holdOptimization) { optimizationStarted(); await new Promise((resolve) => { releaseOptimization = resolve; }); }
        if (failOptimizeNext) { failOptimizeNext = false; status = 503; data = { error: "Synthetic optimization unavailable" }; }
        else data = { data: { improved_prompt: optimizationResponse } };
      }
      else if (url.pathname === "/api/billing/founder-count") data = { count: 0 };
      else if (url.pathname === "/api/billing/checkout") {
        checkoutRequests.push(body);
        if (checkoutReady) data = { url: "https://checkout.stripe.com/c/pay/cs_test_synthetic" };
        else { status = 503; data = { error: "MISSING_CONFIG" }; }
      } else if (url.pathname === "/api/billing/sync-checkout") {
        if (verification === "success") { paid = true; data = { ok: true, billing: { isPaid: true, plan: "pro_monthly", isFounder: true }, returnTo: "/builder?resume=checkout" }; }
        else { status = 409; data = { error: "PAYMENT_PENDING" }; }
      }
      await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
    });
    const copy = composerCopy("en");
    await page.goto(`${base}/interaction-check`);
    const initialExample = page.getByRole("complementary", { name: copy.expansionExample.label, exact: true });
    await initialExample.waitFor();
    assert.equal(await page.getByLabel(copy.idea, { exact: true }).inputValue(), "");
    await initialExample.getByRole("button", { name: copy.expansionExample.use, exact: true }).click();
    assert.equal(await page.getByLabel(copy.idea, { exact: true }).inputValue(), copy.expansionExample.idea);
    assert.equal(await page.getByLabel(copy.idea, { exact: true }).evaluate((el) => el === document.activeElement), true);
    assert.equal(await initialExample.getByRole("button", { name: copy.expansionExample.use, exact: true }).count(), 0);
    assert.equal(generated, 0);
    await page.goto(`${base}/interaction-check?id=${id}`);
    await page.getByRole("heading", { name: "Keep building" }).waitFor();
    const resultText = page.locator("[data-prompt-content]");
    await page.locator("[data-prompt-output]").getByText(copy.portable, { exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: copy.quality, exact: true }).getAttribute("aria-expanded"), "false");
    assert.equal(await page.getByRole("button", { name: copy.optimize, exact: true }).isEnabled(), true, "Optimize must not require opening Quality check");
    await page.getByRole("tab", { name: copy.exampleTab, exact: true }).click();
    await page.getByRole("complementary", { name: copy.expansionExample.label, exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: copy.expansionExample.use, exact: true }).count(), 0, "Examples cannot replace an existing task or result");
    assert.equal(await page.getByRole("button", { name: copy.copy, exact: true }).count(), 0, "Copy cannot accidentally copy an example");
    await page.getByRole("tab", { name: copy.exampleTab, exact: true }).press("ArrowLeft");
    await page.getByRole("button", { name: copy.optimize, exact: true }).waitFor();
    assert.equal(await resultText.textContent(), original);
    assert.equal(await page.getByLabel(copy.idea, { exact: true }).inputValue(), fixture.idea);
    assert.equal(scoreRequests, 0);
    assert.equal(optimizeRequests.length, 0);
    // A failed optimization leaves both the saved result and its saved status intact.
    failOptimizeNext = true;
    await page.getByRole("button", { name: copy.optimize, exact: true }).click();
    await page.getByRole("alert").filter({ hasText: copy.optimizeError }).waitFor();
    assert.equal(await resultText.textContent(), original);
    assert.equal(await page.locator("main").getByRole("button", { name: "Saved", exact: true }).count(), 1);
    const refineY = await page.getByRole("heading", { name: "Refine your prompt" }).evaluate((el) => el.getBoundingClientRect().top + scrollY);
    const outputY = await page.getByRole("button", { name: "Copy AI prompt", exact: true }).evaluate((el) => el.getBoundingClientRect().top + scrollY);
    assert.ok(refineY < outputY, "Refinement must be above the result footer");
    assert.equal(await page.getByRole("link", { name: "New profile", exact: true }).getAttribute("href"), "/library?new=profile");
    await page.getByRole("link", { name: "Keep building", exact: true }).click();
    assert.equal(await page.evaluate(() => location.hash), "#next-task-actions");
    assert.equal(await page.locator("main").getByText("free prompts left this week", { exact: false }).count(), 0);
    // Selecting a profile previews it; Cancel must leave it unapplied.
    await page.getByLabel("Profile", { exact: true }).selectOption(profileId);
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    assert.match(await dialog.textContent(), /Anthropic or OpenRouter/);
    await dialog.getByRole("button", { name: "Cancel", exact: true }).last().click();
    assert.equal(await page.getByLabel("Profile", { exact: true }).inputValue(), "");
    await page.getByLabel("Profile", { exact: true }).selectOption(profileId);
    await dialog.getByRole("button", { name: "Use", exact: true }).click();
    assert.equal(await page.getByLabel("Profile", { exact: true }).inputValue(), profileId);
    // A failed refinement must keep the existing result.
    failNext = true;
    await page.getByRole("button", { name: "Simplify", exact: true }).click();
    await page.getByText("Synthetic provider unavailable", { exact: true }).waitFor();
    assert.ok((await page.locator("main").textContent()).includes(original));
    await page.getByRole("button", { name: "Simplify", exact: true }).click();
    await page.getByRole("button", { name: "Previous versions (1)", exact: true }).waitFor();
    assert.equal(generated, 2);
    assert.ok((await page.locator("main").textContent()).includes(shorter));
    await page.getByRole("button", { name: "Previous versions (1)", exact: true }).click();
    await page.getByLabel("Previous versions", { exact: true }).selectOption("0");
    assert.equal(await page.locator("#prompt-versions pre").textContent(), original);
    await page.getByRole("button", { name: "Restore", exact: true }).click();
    assert.ok((await page.locator("main").textContent()).includes(original));
    // A restored version has no score: optimize must fetch one, not silently do nothing.
    const beforeOptimize = optimizeRequests.length;
    const beforeScore = scoreRequests;
    failScoreNext = true;
    await page.getByRole("button", { name: copy.optimize, exact: true }).click();
    await page.getByRole("alert").filter({ hasText: copy.optimizeScoreError }).waitFor();
    assert.equal(scoreRequests, beforeScore + 1);
    assert.equal(optimizeRequests.length, beforeOptimize);
    assert.equal(await resultText.textContent(), original);
    for (const invalid of [" ", { unexpected: true }, "x".repeat(16001)]) {
      optimizationResponse = invalid;
      await page.getByRole("button", { name: copy.optimize, exact: true }).click();
      await page.getByRole("alert").filter({ hasText: copy.optimizeError }).waitFor();
      assert.equal(await resultText.textContent(), original);
      assert.equal(await page.getByRole("button", { name: copy.optimize, exact: true }).isEnabled(), true);
    }
    optimizationResponse = optimized;
    holdOptimization = true;
    const started = new Promise((resolve) => { optimizationStarted = resolve; });
    const beforeDoubleClick = optimizeRequests.length;
    await page.getByRole("button", { name: copy.optimize, exact: true }).evaluate((el) => { el.click(); el.click(); });
    await started;
    assert.equal(optimizeRequests.length, beforeDoubleClick + 1, "Rapid clicks must create only one optimization");
    for (const label of [copy.optimizing, copy.copy, "Regenerate", "Simplify", "Save"]) {
      assert.equal(await page.locator("main").getByRole("button", { name: label, exact: true }).isDisabled(), true);
    }
    assert.equal(await page.getByLabel(copy.idea, { exact: true }).isDisabled(), true);
    releaseOptimization();
    holdOptimization = false;
    await page.getByRole("button", { name: copy.optimize, exact: true }).waitFor();
    assert.equal(await resultText.textContent(), optimized);
    assert.equal(await page.getByRole("alert").filter({ hasText: copy.optimizeError }).count(), 0);
    assert.equal(optimizeRequests.at(-1).context.profileConsent, true);
    assert.equal(optimizeRequests.at(-1).context.profile.name, "Synthetic studio");
    assert.equal(generated, 2);
    await page.getByLabel("Previous versions", { exact: true }).selectOption("1");
    assert.equal(await page.locator("#prompt-versions pre").textContent(), original);
    await page.getByRole("button", { name: "Restore", exact: true }).click();
    assert.equal(await resultText.textContent(), original);
    page.once("dialog", (d) => d.dismiss());
    await page.getByRole("button", { name: "Draft a customer-facing message", exact: true }).click();
    assert.ok((await page.locator("main").textContent()).includes(original));
    assert.equal(generated, 2);
    await page.getByRole("button", { name: "Save as playbook", exact: true }).click();
    await page.getByLabel("Name", { exact: true }).fill("Launch workflow");
    await page.locator("form").filter({ has: page.getByLabel("Name", { exact: true }) }).getByRole("button", { name: "Save", exact: true }).click();
    await page.getByText("Saved to your library", { exact: true }).waitFor();
    assert.equal(items[0].kind, "playbook");
    assert.equal(items[0].payload.context.profile, undefined);
    assert.equal(items[0].payload.context.versions, undefined);
    await page.getByRole("button", { name: "Copy AI prompt", exact: true }).click();
    await page.getByRole("heading", { name: "2 free prompts left this week." }).waitFor();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), original);
    // Update an existing saved result; inspect only the mocked request.
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByRole("button", { name: "Saved", exact: true }).first().waitFor();
    assert.ok(saved.context.versions.length >= 1);
    assert.equal(saved.generated_prompt, original);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert.equal(overflow, false);
    if (screenshots) { fs.mkdirSync(screenshots, { recursive: true }); await page.evaluate(() => scrollTo(0, 0)); await page.screenshot({ path: path.join(screenshots, `workspace-${width}.png`), fullPage: true }); }
    if (screenshots) {
      await page.getByRole("button", { name: copy.optimize, exact: true }).scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(screenshots, `result-${width}.png`) });
      await page.getByRole("tab", { name: copy.exampleTab, exact: true }).click();
      await page.getByRole("complementary", { name: copy.expansionExample.label, exact: true }).scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(screenshots, `example-${width}.png`) });
      await page.getByRole("tab", { name: copy.yourPrompt, exact: true }).click();
    }
    // Walk the actual result -> pricing -> hosted redirect -> verified return UI.
    // Stripe is intercepted with a synthetic page; no real session or charge is created.
    await page.route("https://checkout.stripe.com/**", (route) => route.fulfill({ contentType: "text/html", body: "<html><body><h1>Synthetic Stripe checkout</h1></body></html>" }));
    await page.locator("main").getByRole("link", { name: "Upgrade", exact: true }).click();
    await page.getByRole("heading", { name: "Pricing", exact: true }).waitFor();
    assert.equal(await page.evaluate(() => JSON.parse(sessionStorage.getItem("ump:checkout_draft")).prompt), original);
    await page.getByRole("button", { name: "Get Pro", exact: true }).click();
    await page.getByRole("alert").filter({ hasText: "Payments are temporarily unavailable" }).waitFor();
    assert.equal(checkoutRequests.length, 1);
    checkoutReady = true;
    await page.getByRole("button", { name: "Get Pro", exact: true }).click();
    await page.getByRole("heading", { name: "Synthetic Stripe checkout" }).waitFor();
    assert.equal(checkoutRequests[1].returnTo, "/builder?resume=checkout");
    assert.equal(checkoutRequests[1].promoCode, "UMPROMPT");
    await page.goto(`${base}/plan?checkout=cancelled&promo=UMPROMPT&returnTo=${encodeURIComponent("/builder?resume=checkout")}`);
    await page.getByText("Checkout was cancelled. Your plan has not changed.", { exact: true }).waitFor();
    await page.goto(`${base}/plan/success?session_id=cs_test_synthetic`);
    await page.getByRole("heading", { name: "Confirmation is still pending" }).waitFor();
    assert.equal(await page.getByText("Payment received.", { exact: true }).count(), 0);
    assert.equal(paid, false);
    verification = "success";
    await page.getByRole("button", { name: "Retry confirmation", exact: true }).click();
    await page.getByRole("heading", { name: "You're in.", exact: true }).waitFor();
    assert.equal(await page.getByRole("link", { name: "Go to Builder", exact: true }).getAttribute("href"), "/builder?resume=checkout");
    if (screenshots) await page.screenshot({ path: path.join(screenshots, `checkout-confirmed-${width}.png`), fullPage: true });
    await page.goto(`${base}/interaction-check?resume=checkout`);
    await page.getByRole("heading", { name: "Refine your prompt" }).waitFor();
    assert.ok((await page.locator("main").textContent()).includes(original));
    assert.equal(await page.evaluate(() => sessionStorage.getItem("ump:checkout_draft")), null);
    assert.equal(await page.locator("main").getByRole("link", { name: "Upgrade", exact: true }).count(), 0);
    // Next tasks require explicit selection and never start an AI call themselves.
    await page.getByRole("button", { name: "Draft a customer-facing message", exact: true }).click();
    await page.waitForTimeout(250);
    assert.equal(generated, 2);
    assert.deepEqual(errors, []);
    assert.deepEqual(consoleErrors, []);
    await page.goto(`${base}/qa-library`);
    await page.getByRole("heading", { name: "My library" }).waitFor();
    await page.goto(`${base}/qa-library?new=profile`);
    await page.getByLabel("Background", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await page.getByRole("button", { name: "New profile", exact: true }).click();
    await page.getByLabel("Name", { exact: true }).fill("QA profile");
    await page.getByLabel("Background", { exact: true }).fill("Synthetic testing business");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByRole("heading", { name: "QA profile" }).waitFor();
    await page.getByRole("button", { name: "Edit QA profile" }).click();
    await page.getByLabel("Name", { exact: true }).fill("Edited QA profile");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByRole("heading", { name: "Edited QA profile" }).waitFor();
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Delete Edited QA profile" }).click();
    await page.getByText("Deleted", { exact: true }).waitFor();
    assert.equal(await page.getByRole("heading", { name: "Edited QA profile" }).count(), 0);
    await page.getByRole("tab", { name: "Playbooks", exact: true }).click();
    await page.getByRole("heading", { name: "Launch workflow" }).waitFor();
    await page.getByRole("button", { name: "New playbook", exact: true }).click();
    await page.getByLabel("Name", { exact: true }).fill("Recurring campaign");
    await page.getByLabel("Starting idea", { exact: true }).fill("Plan a small customer campaign");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByRole("heading", { name: "Recurring campaign" }).waitFor();
    await page.getByRole("button", { name: "Edit Recurring campaign" }).click();
    await page.getByLabel("Starting idea", { exact: true }).fill("Plan a weekly customer campaign");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByText("Plan a weekly customer campaign", { exact: true }).waitFor();
    await page.getByRole("tab", { name: "Context profiles", exact: true }).click();
    await page.evaluate(({ original }) => sessionStorage.setItem("ump:checkout_draft", JSON.stringify({ idea: "Synthetic task to retain", context: { universal: true }, prompt: original, tool: "claude", createdAt: Date.now() })), { original });
    const navigation = page.waitForRequest((request) => new URL(request.url()).pathname === "/builder");
    await page.getByRole("heading", { name: "Synthetic studio", exact: true }).locator("..").locator("..").getByRole("button", { name: "Use", exact: true }).click();
    const destination = new URL((await navigation).url());
    assert.equal(destination.searchParams.get("resume"), "checkout");
    assert.equal(destination.searchParams.get("profile"), profileId);
    await page.waitForURL(/\/login/);
    // The anonymous real route redirects to login. Seed a fresh snapshot for
    // the fixture navigation so this check doesn't depend on router cache timing.
    await page.evaluate(({ original }) => sessionStorage.setItem("ump:checkout_draft", JSON.stringify({ idea: "Synthetic task to retain", context: { universal: true }, prompt: original, tool: "claude", createdAt: Date.now() })), { original });
    // Reuse the same component without touching a real authenticated account.
    await page.goto(`${base}/interaction-check?profile=${profileId}&resume=checkout`);
    await page.getByRole("dialog").waitFor();
    await page.locator("main").getByText(original, { exact: true }).waitFor();
    assert.ok((await page.locator("main").textContent()).includes(original));
    await page.getByRole("dialog").getByRole("button", { name: "Cancel", exact: true }).last().click();
    assert.equal(await page.getByLabel("Profile", { exact: true }).inputValue(), "");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []);
    assert.deepEqual(consoleErrors, []);
    if (width === 390) {
      await page.setViewportSize({ width: 320, height: 900 });
      for (const language of ["en", "es", "ru"]) {
        const localized = composerCopy(language);
        await page.evaluate((language) => { localStorage.setItem("umprompt_language", language); localStorage.setItem("umprompt_language_manual", "1"); }, language);
        await page.goto(`${base}/interaction-check?id=${id}`);
        const optimize = page.getByRole("button", { name: localized.optimize, exact: true });
        await optimize.waitFor();
        await page.locator("[data-prompt-output]").getByText(localized.portable, { exact: true }).waitFor();
        for (const control of [optimize, page.getByRole("button", { name: localized.copy, exact: true }), page.getByRole("tab", { name: localized.exampleTab, exact: true })]) {
          assert.ok(await control.evaluate((el) => el.getBoundingClientRect().height >= 44));
          assert.ok(await control.evaluate((el) => parseFloat(getComputedStyle(el).fontSize) >= 16));
        }
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        assert.equal(await page.locator("[data-prompt-content]").evaluate((el) => el.getBoundingClientRect().height > 80), true, "Wrapped controls must leave a readable prompt area");
        if (screenshots) { await optimize.scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(screenshots, `result-${language}-320.png`) }); }
        await page.getByRole("tab", { name: localized.exampleTab, exact: true }).click();
        await page.getByRole("complementary", { name: localized.expansionExample.label, exact: true }).waitFor();
        assert.equal(await page.getByRole("button", { name: localized.copy, exact: true }).count(), 0);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await page.getByRole("tab", { name: localized.yourPrompt, exact: true }).click();
        assert.equal(await resultText.textContent(), original);
      }
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(consoleErrors, []);
    console.log(`PASS ${width}px: persistent examples and keyboard tabs; visible Optimize; scoring fallback; optimization failure/invalid output/rapid click protection; simplify/restore/copy/save; profile consent; synthetic checkout verification; library CRUD; readable controls; no console errors or overflow.`);
    await context.close();
  }
})().catch((e) => { console.error(e); process.exitCode = 1; }).finally(async () => { await browser?.close(); cleanupFixtures(); });
