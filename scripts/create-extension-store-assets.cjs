const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { chromium } = require("playwright");
const sharp = require("sharp");

async function main() {
  const root = path.resolve(__dirname, "..");
  const directory = path.join(root, "extension/artifacts/store");
  await fs.mkdir(directory, { recursive: true });
  const logo = (await fs.readFile(path.join(root, "app/icon.png"))).toString("base64");
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 440, height: 280 }, deviceScaleFactor: 1 });
    await page.setContent(`<!doctype html><html lang="en"><head><meta charset="utf-8"><style>
      * { box-sizing: border-box; letter-spacing: 0; }
      html, body { margin: 0; width: 440px; height: 280px; overflow: hidden; }
      body { background: #006b50; color: #fff; font-family: Arial, sans-serif; padding: 28px 32px; }
      header { display: flex; align-items: center; gap: 14px; height: 56px; }
      img { width: 56px; height: 56px; }
      h1 { margin: 0; font-size: 32px; line-height: 1.1; font-weight: 700; }
      h2 { margin: 27px 0 0; font-size: 31px; line-height: 1.17; font-weight: 600; }
      p { margin: 22px 0 0; font-size: 14px; line-height: 20px; color: #d0f4e7; }
    </style></head><body><header><img src="data:image/png;base64,${logo}" alt=""><h1>Umprompt</h1></header>
    <h2>Rough idea.<br>Clear AI prompt.</h2><p>For your preferred AI assistant.</p></body></html>`);
    await page.locator("img").evaluate((image) => image.decode());
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth === innerWidth && document.documentElement.scrollHeight === innerHeight), true);
    const file = path.join(directory, "promo-440x280.png");
    await page.screenshot({ path: file });
    const metadata = await sharp(file).metadata();
    assert.equal(metadata.width, 440); assert.equal(metadata.height, 280);
    await fs.copyFile(path.join(root, "extension/dist/chrome/icons/128.png"), path.join(directory, "icon-128.png"));
    console.log(`Prepared branded promo (440x280 PNG) and packaged icon: ${directory}`);
    console.log("This is a promotional graphic, not a screenshot or evidence of a successful account journey.");
  } finally { await browser.close(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
