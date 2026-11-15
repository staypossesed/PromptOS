// Run against a LOCAL development server: UI_BASE_URL=http://localhost:3000 node scripts/check-feedback-ui.cjs
// Fixtures intercept API calls; this checks browser interactions, not provider quality or entitlements.
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const base = process.env.UI_BASE_URL || "http://localhost:3000";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw new Error("Use a local fixture server.");
(async () => {
  const browser = await chromium.launch();
  try {
    for (const mobile of [false, true]) {
      const context = await browser.newContext({ viewport: { width: mobile ? 390 : 1440, height: 900 }, hasTouch: mobile, isMobile: mobile });
      await context.addInitScript(() => {
        localStorage.setItem("umprompt_language", "en");
        localStorage.setItem("umprompt_language_manual", "1");
        sessionStorage.clear();
      });
      const page = await context.newPage();
      const calls = [];
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.route("**/api/guest/clarify", route => route.fulfill({ status: 503, contentType: "application/json", body: "{}" }));
      await page.route("**/api/guest/generate", async route => {
        const body = route.request().postDataJSON(); calls.push(body);
        await route.fulfill({ contentType: "application/json", body: JSON.stringify({ data: body.context.delivery === "answer" ? "Please arrange a repair for the broken heater. Thank you." : "Write a firm and formal message asking my landlord to repair the broken heater. Use only the supplied facts." }) });
      });
      await page.goto(base + "/?fresh=1");
      const input = page.locator("#beginner-idea");
      await input.fill("ask my landlord to fix the broken heater");
      await page.locator(".writing-suggestion").waitFor();
      const next = page.getByRole("button", { name: "Continue", exact: true });
      if (mobile) await next.tap(); else await next.click();
      await page.getByRole("heading", { name: "Let’s make this useful for you", exact: true }).waitFor();
      const prepare = page.getByRole("button", { name: "Prepare my instructions", exact: true });
      await prepare.click();
      await page.getByRole("heading", { name: "Your instructions are ready", exact: true }).waitFor();
      assert.equal(calls.length, 1, "One click must produce exactly one generation");
      assert.equal(calls[0].outputLanguage, "en");
      const handoff = page.locator(".beginner-handoff");
      assert.doesNotMatch(await handoff.textContent(), /first lesson|study coach/i);
      for (const name of ["ChatGPT", "Gemini", "Claude"]) await handoff.getByRole("link", { name: "Open in " + name, exact: true }).waitFor();
      await page.getByRole("button", { name: "Get the result right here", exact: true }).click();
      await page.getByRole("heading", { name: "Here’s a starting point for you", exact: true }).waitFor();
      assert.equal(calls[1].context.delivery, "answer");
      assert.equal(calls[1].outputLanguage, "en");
      assert.deepEqual(errors, []);
      await context.close();
      console.log("PASS " + (mobile ? "touch" : "mouse") + ": first-click Continue, selected language, assistant links and direct answer");
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
