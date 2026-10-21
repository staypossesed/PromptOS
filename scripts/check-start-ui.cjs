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
      await page.getByRole("tab", { name: "Plan my week" }).waitFor();
      await page.getByRole("tab", { name: "Write a launch email" }).click();
      await page.getByText("Write a launch email for a study app aimed at students.").waitFor();
      await page.locator(".hero-example__label").first().waitFor();
      await page.locator(".marquee").waitFor();

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
