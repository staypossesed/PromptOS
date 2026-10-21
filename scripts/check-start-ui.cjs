const { chromium } = require("playwright");
const assert = require("node:assert/strict");

const base = process.env.UI_BASE_URL || "http://localhost:3000";

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(base, { waitUntil: "networkidle" });

      await page.getByRole("heading", { name: /Say it rough/ }).waitFor();
      await page.getByRole("link", { name: "Start with an idea" }).first().waitFor();
      const idea = page.locator("#hero-idea");
      await idea.fill("write a launch email for students, keep it short");
      await page.getByText("The prompt Umprompt would build").waitFor();
      await page.getByText(/Clarity · present/).waitFor();

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      assert.equal(overflow, 0, `horizontal overflow at ${width}px: ${overflow}px`);
      assert.deepEqual(errors, [], `page errors at ${width}px: ${errors.join(" | ")}`);
      await context.close();
    }
    console.log("Landing page checks passed.");
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
