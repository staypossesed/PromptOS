const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { chromium } = require("playwright");

async function main() {
  const root = path.resolve(__dirname, "..");
  assert.ok(!(process.argv.includes("--installed") && process.argv.includes("--store-test")), "Choose one package to check.");
  const extension = path.join(root, "extension/dist", process.argv.includes("--store-test") ? "chrome-store-test" : process.argv.includes("--installed") ? "chrome-local" : "chrome");
  const manifest = JSON.parse(await fs.readFile(path.join(extension, "manifest.json"), "utf8"));
  const host = manifest.host_permissions.find((value) => value === "https://www.umprompt.com/*");
  assert.ok(host, "This check requires a production-targeted package.");
  const origin = host.slice(0, -2);
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), "umprompt-backend-check-"));
  let context;
  try {
    context = await chromium.launchPersistentContext(profile, { channel: "chromium", headless: true,
      args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`], viewport: { width: 420, height: 900 } });
    const worker = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker");
    const id = new URL(worker.url()).host;
    if (process.argv.includes("--store-test")) assert.equal(id, "nfbmeonaffiaicoiahbmmocbkbhekbin", "Acceptance package must have the store-assigned identity.");
    const page = await context.newPage();
    const errors = [];
    const calls = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error" && !/^Failed to load resource: the server responded with a status of 401/.test(message.text())) errors.push(message.text());
    });
    page.on("request", (request) => calls.push({ path: new URL(request.url()).pathname, method: request.method() }));
    await page.goto(`chrome-extension://${id}/panel.html`);
    await page.locator('[data-backend-ready="true"]').waitFor({ timeout: 30000 });
    await page.locator(".connection .sign-in button").first().waitFor();
    assert.equal(await page.getByRole("alert").count(), 0, "Healthy startup must not show a failed prompt operation.");
    const result = await page.evaluate(async (site) => {
      const response = await fetch(`${site}/api/extension/status`, { credentials: "omit", redirect: "error" });
      return { status: response.status, type: response.headers.get("Content-Type"), data: await response.json() };
    }, origin);
    assert.equal(result.status, 401, "Private endpoints remain protected.");
    assert.match(result.type, /application\/json/);
    assert.equal(typeof result.data.error, "string");
    assert.equal(calls.some((call) => call.path.endsWith("/generate") || ["POST", "PUT"].includes(call.method)), false,
      "Opening the extension must not generate, authenticate or save automatically.");
    assert.deepEqual(errors, []);
    const artifacts = path.join(root, "extension/artifacts");
    await fs.mkdir(artifacts, { recursive: true });
    await page.screenshot({ path: path.join(artifacts, `live-backend-${id}-420.png`), fullPage: true });
    console.log(`PASS: real ${origin} backend from packaged Chrome extension ${id}, version ${manifest.version}; healthy startup, no prompt error, protected private API, no automatic AI or save.`);
    console.log(`Required callback for this package (allowlist not verified by this check): https://${id}.chromiumapp.org/auth`);
    console.log("This check uses a new empty profile, no account credentials, no fixtures, and no private account requests.");
  } finally {
    if (context) await context.close();
    const target = await fs.realpath(profile);
    const temp = await fs.realpath(os.tmpdir());
    if (!target.startsWith(temp + path.sep) || !path.basename(target).startsWith("umprompt-backend-check-")) throw new Error("Unsafe temporary profile path.");
    await fs.rm(target, { recursive: true, force: true });
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
