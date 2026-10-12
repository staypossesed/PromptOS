const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { chromium } = require("playwright");
const { buildExtension } = require("./build-extension.cjs");
const { loadTS } = require("./load-ts.cjs");
const { extensionCopy } = loadTS("extension/src/copy.ts");

async function main() {
  const root = path.resolve(__dirname, "..");
  const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), "umprompt-extension-update-"));
  const extension = path.join(sandbox, "package");
  let context;
  try {
    await buildExtension({ local: true, outputDirectory: extension });
    context = await chromium.launchPersistentContext(path.join(sandbox, "profile"), {
      channel: "chromium", headless: true,
      args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
      viewport: { width: 420, height: 900 },
    });
    const worker = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker");
    const id = new URL(worker.url()).host;
    const management = await context.newPage();
    await management.goto("chrome://extensions");
    await management.getByRole("button", { name: "Developer mode", exact: true }).click();
    await management.close();
    const page = await context.newPage();
    const errors = []; const requests = [];
    function observe(target) {
      target.on("pageerror", (error) => errors.push(error.message));
      target.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
      target.on("request", (request) => { if (request.url().startsWith("https://www.umprompt.com/api/extension/")) requests.push(request.url()); });
    }
    observe(page);
    await page.goto(`chrome-extension://${id}/panel.html`);
    await page.getByRole("button", { name: "Continue with Google", exact: true }).waitFor();
    const originalIdea = "Write a polite email asking for two extra days";
    await page.locator("#idea").fill(originalIdea);
    await page.waitForFunction((idea) => new Promise((resolve) => chrome.storage.local.get("draft:guest").then((data) => resolve(data["draft:guest"]?.idea === idea))), originalIdea);

    // Replace files without reloading the extension, like an in-place development update.
    await fs.cp(path.join(root, "extension/dist/chrome"), extension, { recursive: true });
    await page.reload();
    await page.getByText(extensionCopy("en").serviceErrors.reload, { exact: true }).waitFor();
    assert.match((await page.evaluate(() => chrome.runtime.getManifest())).content_security_policy.extension_pages, /connect-src http:\/\/localhost:3000/);
    assert.equal(await page.locator("#idea").inputValue(), originalIdea);
    assert.equal(await page.getByRole("button", { name: "Continue with Google", exact: true }).isDisabled(), true);
    assert.equal(await page.getByRole("button", { name: "Continue with GitHub", exact: true }).isDisabled(), true);
    assert.deepEqual(requests, [], "A stale manifest must not trigger blocked live-backend requests.");
    const artifacts = path.join(root, "extension/artifacts");
    await fs.mkdir(artifacts, { recursive: true });
    for (const language of ["en", "ru", "es"]) {
      await page.locator("#language").selectOption(language);
      await page.setViewportSize({ width: 320, height: 900 });
      assert.equal(await page.getByRole("alert").count(), 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.screenshot({ path: path.join(artifacts, `update-reload-${language}-320.png`), fullPage: true });
    }
    await page.locator("#language").selectOption("en");
    const finalIdea = `${originalIdea}. Keep it friendly.`;
    await page.locator("#idea").fill(finalIdea);
    await page.getByRole("button", { name: "Reload extension", exact: true }).click().catch((error) => {
      if (!/Target.*closed|Page.*closed/.test(error.message)) throw error;
    });
    const updatedPage = await context.newPage();
    observe(updatedPage);
    try { await updatedPage.goto(`chrome-extension://${id}/panel.html`); }
    catch (error) {
      const diagnostics = await context.newPage();
      await diagnostics.goto("chrome://extensions");
      await diagnostics.screenshot({ path: path.join(artifacts, "update-chrome-diagnostics.png"), fullPage: true });
      console.log(await diagnostics.locator("body").ariaSnapshot());
      throw error;
    }
    await updatedPage.locator('[data-backend-ready="true"]').waitFor({ timeout: 30000 });
    assert.equal(await updatedPage.evaluate(() => chrome.runtime.id), id, "Reload must preserve the extension ID and callback.");
    assert.equal(await updatedPage.getByRole("alert").count(), 0);
    assert.equal(await updatedPage.locator("#idea").inputValue(), finalIdea, "Reload must flush and preserve the most recent typed draft.");
    const manifest = await updatedPage.evaluate(() => chrome.runtime.getManifest());
    assert.equal(manifest.version, "0.1.2");
    assert.ok(manifest.host_permissions.includes("https://www.umprompt.com/*"));
    assert.match(manifest.content_security_policy.extension_pages, /connect-src https:\/\/www\.umprompt\.com/);
    assert.equal(requests.every((url) => url.endsWith("/health")), true, "Recovery must not generate, authenticate, or save to the live account.");
    assert.deepEqual(errors, [], "The update and reload must have no script or CSP console errors.");
    await updatedPage.screenshot({ path: path.join(artifacts, "update-recovered-en-320.png"), fullPage: true });
    console.log("PASS: actual Chrome local-to-live in-place update with stale active manifest; requests stopped before CSP failure, localized reload notice, real reload, unchanged ID/callback, latest draft retained, live health succeeds, no console errors.");
    console.log("This verifies update recovery, not successful account sign-in or AI generation.");
  } finally {
    if (context) await context.close();
    const target = await fs.realpath(sandbox);
    const temp = await fs.realpath(os.tmpdir());
    if (!target.startsWith(temp + path.sep) || !path.basename(target).startsWith("umprompt-extension-update-")) throw new Error("Unsafe temporary test path.");
    await fs.rm(target, { recursive: true, force: true });
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
