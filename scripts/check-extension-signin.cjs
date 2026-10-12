const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { chromium } = require("playwright");
const { loadTS } = require("./load-ts.cjs");
const { extensionCopy } = loadTS("extension/src/copy.ts");

async function main() {
  const root = path.resolve(__dirname, "..");
  const extension = path.join(root, "extension/dist/chrome-local");
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), "umprompt-auth-launch-"));
  let context;
  try {
    // Real native OAuth windows; no personal browser profile, mocks or account sign-in.
    context = await chromium.launchPersistentContext(profile, {
      channel: "chromium", headless: true,
      args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
      viewport: { width: 320, height: 900 },
    });
    const worker = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker");
    const id = new URL(worker.url()).host;
    const panel = await context.newPage();
    await panel.goto(`chrome-extension://${id}/panel.html`);
    await panel.locator("#language").selectOption("en");
    await panel.locator("#idea").fill("My untouched test idea");
    for (const [provider, host] of [["Google", "accounts.google.com"], ["GitHub", "github.com"]]) {
      const opened = context.waitForEvent("page", { timeout: 20000 }).catch(() => null);
      await panel.getByRole("button", { name: `Continue with ${provider}`, exact: true }).click();
      const popup = await opened;
      assert.ok(popup, `${provider}: the native sign-in window did not open.`);
      await popup.waitForURL((url) => url.hostname === host, { waitUntil: "domcontentloaded", timeout: 30000 });
      assert.equal((await popup.locator("input:not([type=hidden])").count()) > 0, true, `${provider}: a provider sign-in form loads.`);
      await popup.close();
      await panel.getByRole("alert").waitFor();
      assert.equal(await panel.getByRole("alert").innerText(), extensionCopy("en").signInErrors.cancelled);
      assert.equal(await panel.getByRole("button", { name: `Continue with ${provider}`, exact: true }).isEnabled(), true);
      assert.equal(await panel.locator(".auth-details").getAttribute("open"), null);
      assert.equal(await panel.locator("#idea").inputValue(), "My untouched test idea");
      assert.equal(await worker.evaluate(async () => {
        const storage = await chrome.storage.local.get(["umprompt-extension-auth", "umprompt-extension-auth-code-verifier"]);
        return Object.values(storage).some(Boolean);
      }), false, "Cancelling leaves neither a session nor a PKCE verifier.");
      console.log(`PASS: real ${provider} form opens; closing it permits a fresh attempt and preserves the draft.`);
    }
    console.log("No account was signed into. Successful credential exchange still requires a user-owned test account.");
  } finally {
    if (context) await context.close();
    const target = await fs.realpath(profile);
    const temp = await fs.realpath(os.tmpdir());
    if (target.startsWith(temp + path.sep) && path.basename(target).startsWith("umprompt-auth-launch-")) {
      await fs.rm(target, { recursive: true, force: true });
    }
  }
}
main().catch((error) => {
  console.error(error.message.replace(/https?:\/\/\S+/g, "[URL omitted]"));
  process.exitCode = 1;
});
