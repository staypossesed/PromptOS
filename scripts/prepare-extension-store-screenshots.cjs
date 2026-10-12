const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");
const { chromium } = require("playwright");

async function main() {
  const sources = process.argv.slice(2);
  if (sources.length !== 2) throw new Error("Provide the founder's prompt and example screenshot paths.");
  const root = path.resolve(__dirname, "..");
  const directory = path.join(root, "extension/artifacts/store");
  await fs.mkdir(directory, { recursive: true });
  const logo = (await fs.readFile(path.join(root, "app/icon.png"))).toString("base64");
  const shots = [
    { file: "screenshot-prompt-1280x800.png", title: "A rough idea.<br>A clearer prompt.", detail: "Expand your request, copy it,<br>and save only what you choose.", crop: { left: 18, top: 250, width: 504, height: 1100 } },
    { file: "screenshot-example-1280x800.png", title: "See the difference<br>before you start.", detail: "A simple example shows how<br>an idea becomes an AI prompt.", crop: { left: 30, top: 296, width: 503, height: 800 } },
  ];
  const browser = await chromium.launch({ headless: true });
  try {
    for (const [index, shot] of shots.entries()) {
      const source = await sharp(sources[index]).metadata();
      assert.equal(source.width, index === 0 ? 543 : 573);
      assert.equal(source.height, index === 0 ? 1362 : 1381);
      // Excerpts end above the account footer; screenshot pixels are not recreated.
      const excerpt = await sharp(sources[index]).extract(shot.crop).flatten({ background: "#ffffff" }).png().toBuffer();
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
      await page.setContent(`<!doctype html><html lang="en"><head><meta charset="utf-8"><style>
        * { box-sizing: border-box; letter-spacing: 0; }
        html, body { margin: 0; width: 1280px; height: 800px; overflow: hidden; }
        body { font-family: Arial, sans-serif; color: #18181b; background: #f5f7f6; }
        .copy { position: absolute; left: 70px; top: 80px; width: 540px; }
        header { display: flex; align-items: center; gap: 14px; }
        .logo { width: 52px; height: 52px; }
        .brand { font-size: 30px; font-weight: 700; }
        h1 { margin: 112px 0 24px; font-size: 48px; line-height: 1.16; }
        p { margin: 0; font-size: 23px; line-height: 1.55; color: #52525b; }
        .foot { margin-top: 70px; color: #047857; font-size: 18px; }
        .capture { position: absolute; left: 665px; top: 40px; width: 550px; height: 720px;
          display: flex; align-items: center; justify-content: center; }
        .screen { display: block; max-width: 100%; max-height: 100%; object-fit: contain; }
      </style></head><body><section class="copy"><header><img class="logo" src="data:image/png;base64,${logo}" alt=""><span class="brand">Umprompt</span></header>
      <h1>${shot.title}</h1><p>${shot.detail}</p><p class="foot">For your preferred AI assistant.</p></section>
      <div class="capture"><img class="screen" src="data:image/png;base64,${excerpt.toString("base64")}" alt="Actual extension screenshot excerpt"></div></body></html>`);
      await page.locator("img").evaluateAll(async (images) => Promise.all(images.map((image) => image.decode())));
      const target = path.join(directory, shot.file);
      const rendered = await page.screenshot();
      await sharp(rendered).flatten({ background: "#ffffff" }).removeAlpha().png().toFile(target);
      const output = await sharp(target).metadata();
      assert.equal(output.width, 1280); assert.equal(output.height, 800); assert.equal(output.hasAlpha, false);
      await page.close();
      console.log(`Prepared real, account-footer-free screenshot excerpt: ${target}`);
    }
  } finally { await browser.close(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
