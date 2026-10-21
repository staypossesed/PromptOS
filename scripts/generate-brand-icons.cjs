const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0d2a1c"/>
  <path d="M144 128 V304 C144 368 192 400 256 400 C320 400 368 368 368 304 V128"
        fill="none" stroke="#f6e016" stroke-width="72" stroke-linecap="square"/>
</svg>`;

async function png(size) {
  return sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
}

async function main() {
  const sizes = [16, 32, 48, 96];
  const images = await Promise.all(sizes.map((size) => png(size)));

  await sharp(Buffer.from(svg)).resize(512, 512).png().toFile(path.join(root, "public/brand/umprompt-icon.png"));
  await sharp(Buffer.from(svg)).resize(192, 192).png().toFile(path.join(root, "app/icon.png"));
  await sharp(Buffer.from(svg)).resize(180, 180).png().toFile(path.join(root, "public/apple-touch-icon.png"));

  // ICO with PNG payloads: 6-byte header + 16-byte entries + image data.
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + images.length * 16;
  const entries = images.map((image, index) => {
    const entry = Buffer.alloc(16);
    entry[0] = sizes[index] === 256 ? 0 : sizes[index];
    entry[1] = sizes[index] === 256 ? 0 : sizes[index];
    entry[2] = 0;
    entry[3] = 0;
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(image.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += image.length;
    return entry;
  });
  await fs.writeFile(path.join(root, "app/favicon.ico"), Buffer.concat([header, ...entries, ...images]));
  console.log("Brand icons written.");
}

main().catch((error) => { console.error(error); process.exit(1); });
