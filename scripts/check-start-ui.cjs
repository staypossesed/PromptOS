const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const { loadTS } = require("./load-ts.cjs");
const { composerCopy } = loadTS("lib/composer-copy.ts");
const { getStarterSuggestions } = loadTS("lib/idea-suggestions.ts");
const base = process.env.UI_BASE_URL || "http://localhost:3000";
let browser;

(async () => {
  browser = await chromium.launch();
  for (const width of [1440, 390, 320]) {
    for (const language of ["en", "es", "ru"]) {
      const copy = composerCopy(language);
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: width === 1440 ? "no-preference" : "reduce" });
      await context.addInitScript(({ language }) => {
        localStorage.setItem("umprompt_language", language);
        localStorage.setItem("umprompt_language_manual", "1");
        localStorage.setItem("ump:inspiration", JSON.stringify({ key: "guest", seed: 12 }));
      }, { language });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(base);
      await page.getByRole("heading", { name: copy.startTitle, exact: true }).waitFor();
      assert.equal(await page.getByRole("heading", { name: "Umprompt", exact: true }).count(), 0);
      const input = page.getByLabel(copy.idea, { exact: true });
      const submit = page.getByRole("button", { name: copy.guestCreate, exact: true });
      assert.equal(await submit.isDisabled(), true);
      const animatedExample = page.locator("[data-idea-example]");
      await animatedExample.waitFor();
      assert.equal(await animatedExample.textContent(), copy.placeholderIdeas[0]);
      assert.equal(await input.inputValue(), "", "Example text must never become user input");
      if (width === 1440) {
        await page.waitForFunction((first) => {
          const example = document.querySelector("[data-idea-example]");
          return example && example.textContent !== first && Number(getComputedStyle(example).opacity) >= 0.99;
        }, copy.placeholderIdeas[0]);
        await page.getByRole("button", { name: copy.pauseExamples, exact: true }).click();
        const pausedExample = await animatedExample.textContent();
        await page.waitForTimeout(4800);
        assert.equal(await animatedExample.textContent(), pausedExample);
        await page.getByRole("button", { name: copy.resumeExamples, exact: true }).click();
        await page.waitForFunction((previous) => document.querySelector("[data-idea-example]")?.textContent !== previous, pausedExample);
      } else {
        assert.equal(await page.getByRole("button", { name: copy.pauseExamples, exact: true }).count(), 0);
        if (width === 390 && language === "en") {
          await page.waitForTimeout(4800);
          assert.equal(await animatedExample.textContent(), copy.placeholderIdeas[0], "Reduced motion must stay static");
        }
      }
      await input.focus();
      assert.equal(await animatedExample.count(), 0, "Examples stop on focus");
      await input.fill("My own task");
      await input.blur();
      assert.equal(await animatedExample.count(), 0, "Examples cannot cover typed text");
      assert.equal(await input.inputValue(), "My own task");
      await input.fill("");
      await input.blur();
      await animatedExample.waitFor();
      const category = page.getByRole("button", { name: copy.category, exact: true });
      assert.equal(await category.getAttribute("aria-expanded"), "false");
      assert.equal(await page.getByRole("button", { name: copy.categories.coding, exact: true }).isVisible(), false);
      const starter = getStarterSuggestions(12, language)[0];
      await page.getByRole("button", { name: starter.title, exact: true }).click();
      assert.equal(await input.inputValue(), starter.idea);
      assert.equal(await input.evaluate((el) => el === document.activeElement), true);
      assert.equal(await submit.isEnabled(), true);

      // Advanced categories remain reachable, but aren't required to write an idea.
      await page.getByRole("button", { name: new RegExp(copy.category.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) }).click();
      await page.getByRole("button", { name: copy.categories.coding, exact: true }).click();
      assert.equal(await page.getByRole("button", { name: copy.categories.coding, exact: true }).getAttribute("aria-pressed"), "true");
      await page.getByRole("button", { name: copy.categories.auto, exact: true }).click();
      await input.fill("");
      await page.getByRole("button", { name: copy.category, exact: true }).click();
      await page.getByRole("heading", { name: copy.inspiration, exact: true }).waitFor();
      const before = await page.locator("main section").last().getByRole("button").allTextContents();
      await page.getByRole("button", { name: copy.refresh, exact: true }).click();
      await page.waitForFunction(({ before }) => {
        const section = document.querySelector("main section:last-of-type");
        return section && JSON.stringify(Array.from(section.querySelectorAll("button"), (el) => el.textContent)) !== JSON.stringify(before);
      }, { before });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.waitForFunction(() => {
        const examples = Array.from(document.querySelectorAll("main section button")).filter((el) => el.textContent.trim());
        return examples.length === 6 && examples.every((el) => Number(getComputedStyle(el).opacity) >= 0.99);
      }).catch(async (error) => {
        console.log(await page.locator("main section button").evaluateAll((elements) => elements.map((el) => ({ text: el.textContent, opacity: getComputedStyle(el).opacity }))));
        throw error;
      });
      const examplesY = await page.getByRole("heading", { name: copy.inspiration, exact: true }).evaluate((el) => el.getBoundingClientRect().top + scrollY);
      const optionsY = await category.evaluate((el) => el.getBoundingClientRect().top + scrollY);
      assert.ok(examplesY < optionsY, "Examples should precede optional settings");
      if (process.env.UI_SCREENSHOT_DIR) {
        fs.mkdirSync(process.env.UI_SCREENSHOT_DIR, { recursive: true });
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({ path: path.join(process.env.UI_SCREENSHOT_DIR, `start-${language}-${width}.png`), fullPage: true });
      }
      const idea = "I need to write a polite email asking for more time.";
      await input.fill(idea);
      await submit.click();
      await page.waitForURL(/\/login\?next=/);
      const draft = await page.evaluate(() => JSON.parse(sessionStorage.getItem("ump:idea_draft")));
      assert.equal(draft.idea, idea);
      assert.equal(draft.context.category, "auto");
      assert.equal(draft.context.universal, true);
      assert.deepEqual(errors, []);
      console.log(`PASS ${width}px ${language}: single action heading; rotating examples/pause/reduced motion; no inserted text; optional categories; example selection/refresh; draft retained at sign-in; no overflow or runtime errors.`);
      await context.close();
    }
  }
})().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await browser?.close(); });
