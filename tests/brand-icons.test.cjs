const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const root = path.join(__dirname, "..");

async function assertGreenIcon(input, expectedSize) {
  const metadata = await sharp(input).metadata();
  assert.equal(metadata.width, expectedSize);
  assert.equal(metadata.height, expectedSize);
  const { data, info } = await sharp(input).resize(96, 96).raw().toBuffer({ resolveWithObject: true });
  // Sample the solid center of the brand chevron, not its shaded edge.
  const offset = (41 * 96 + 33) * info.channels;
  const [red, green, blue] = data.subarray(offset, offset + 3);
  assert.ok(green > red * 1.4 && green > blue * 1.05, "brand chevron must be emerald, not orange");
}

test("brand, app, and Apple icons are square emerald PNGs", async () => {
  for (const [filename, size] of [["public/brand/umprompt-icon.png", 512], ["app/icon.png", 192], ["public/apple-touch-icon.png", 180]]) {
    await assertGreenIcon(path.join(root, filename), size);
  }
});

test("favicon contains valid green icons for search and browser sizes", async () => {
  const ico = fs.readFileSync(path.join(root, "app/favicon.ico"));
  assert.equal(ico.readUInt16LE(0), 0);
  assert.equal(ico.readUInt16LE(2), 1);
  assert.equal(ico.readUInt16LE(4), 4);
  const sizes = [];
  for (let index = 0; index < 4; index++) {
    const entry = 6 + index * 16;
    const size = ico[entry];
    assert.equal(ico[entry + 1], size);
    const length = ico.readUInt32LE(entry + 8);
    const offset = ico.readUInt32LE(entry + 12);
    assert.ok(offset >= 70 && offset + length <= ico.length);
    await assertGreenIcon(ico.subarray(offset, offset + length), size);
    sizes.push(size);
  }
  assert.deepEqual(sizes.sort((a, b) => a - b), [16, 32, 48, 96]);
});
