const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const root = path.join(__dirname, "..");
const INK = [13, 42, 28];
const ACCENT = [246, 224, 22];

function near(pixel, target, tolerance = 24) {
  return Math.abs(pixel[0] - target[0]) <= tolerance &&
    Math.abs(pixel[1] - target[1]) <= tolerance &&
    Math.abs(pixel[2] - target[2]) <= tolerance;
}

async function assertBrandColours(input, expectedSize) {
  const metadata = await sharp(input).metadata();
  assert.equal(metadata.width, expectedSize);
  assert.equal(metadata.height, expectedSize);

  const { data, info } = await sharp(input).resize(96, 96).raw().toBuffer({ resolveWithObject: true });
  let ink = 0;
  let accent = 0;
  for (let offset = 0; offset < data.length; offset += info.channels) {
    const pixel = data.subarray(offset, offset + 3);
    if (near(pixel, INK)) ink++;
    if (near(pixel, ACCENT)) accent++;
  }
  assert.ok(ink > 400, "brand icon must contain the bottle-green field");
  assert.ok(accent > 100, "brand icon must contain the yellow mark");
}

test("brand, app, and Apple icons are square in the new palette", async () => {
  for (const [filename, size] of [
    ["public/brand/umprompt-icon.png", 512],
    ["app/icon.png", 192],
    ["public/apple-touch-icon.png", 180],
  ]) {
    await assertBrandColours(path.join(root, filename), size);
  }
});

test("favicon contains valid PNG icons for search and browser sizes", async () => {
  const ico = fs.readFileSync(path.join(root, "app/favicon.ico"));
  assert.equal(ico.readUInt16LE(0), 0);
  assert.equal(ico.readUInt16LE(2), 1);
  const count = ico.readUInt16LE(4);
  assert.equal(count, 4);
  const sizes = [];
  for (let index = 0; index < count; index++) {
    const entry = 6 + index * 16;
    const size = ico[entry];
    assert.equal(ico[entry + 1], size);
    const length = ico.readUInt32LE(entry + 8);
    const offset = ico.readUInt32LE(entry + 12);
    assert.ok(offset >= 6 + count * 16 && offset + length <= ico.length);
    const payload = ico.subarray(offset, offset + length);
    assert.equal(payload.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    const metadata = await sharp(payload).metadata();
    assert.equal(metadata.width, size);
    assert.equal(metadata.height, size);
    sizes.push(size);
  }
  assert.deepEqual(sizes.sort((a, b) => a - b), [16, 32, 48, 96]);
});
