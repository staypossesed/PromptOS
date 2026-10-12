const fs = require("node:fs/promises");
const path = require("node:path");
const { loadEnvConfig } = require("@next/env");
const { build } = require("esbuild");
const sharp = require("sharp");
const root = path.resolve(__dirname, "..");

async function buildExtension({ local = false, liveInPlace = false, outputDirectory } = {}) {
  loadEnvConfig(root);
  if (local && liveInPlace) throw new Error("Choose --local or --live-in-place, not both.");
  const origin = local ? "http://localhost:3000" : "https://www.umprompt.com";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || new URL(url).protocol !== "https:") throw new Error("Set the project's public Supabase URL and anon key in .env.local.");
  if (key.startsWith("sb_secret_")) throw new Error("Only a public anon/publishable Supabase key can be packaged.");
  if (!key.startsWith("sb_publishable_")) {
    let role;
    try { role = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString()).role; } catch {}
    if (role !== "anon") throw new Error("Only a public anon/publishable Supabase key can be packaged.");
  }
  const supabaseOrigin = new URL(url).origin;
  const outdir = outputDirectory ?? path.join(root, "extension", "dist", local || liveInPlace ? "chrome-local" : "chrome");
  await fs.mkdir(outdir, { recursive: true });
  const result = await build({
    entryPoints: { panel: path.join(root, "extension/src/panel.tsx"), background: path.join(root, "extension/src/background.ts") },
    absWorkingDir: root, outdir, bundle: true, minify: true, platform: "browser", target: "chrome116", format: "iife", jsx: "automatic", metafile: true,
    define: { __SITE_ORIGIN__: JSON.stringify(origin), __SUPABASE_URL__: JSON.stringify(url), __SUPABASE_KEY__: JSON.stringify(key), "process.env.NODE_ENV": '"production"' },
    logLevel: "warning",
  });
  const packages = [...new Set(Object.keys(result.metafile.inputs).map((file) => /^node_modules\/(@[^/]+\/[^/]+|[^/]+)\//.exec(file)?.[1]).filter(Boolean))].sort();
  const notices = [];
  for (const name of packages) {
    const directory = path.join(root, "node_modules", name);
    const pkg = JSON.parse(await fs.readFile(path.join(directory, "package.json"), "utf8"));
    notices.push(`${name} ${pkg.version}\nLicense: ${pkg.license ?? "See package repository"}\nRepository: ${typeof pkg.repository === "string" ? pkg.repository : pkg.repository?.url ?? ""}`);
    for (const file of (await fs.readdir(directory)).filter((file) => /^(license|copying|copyrightnotice)(\.|$)/i.test(file))) {
      if ((await fs.stat(path.join(directory, file))).isFile()) notices.push(await fs.readFile(path.join(directory, file), "utf8"));
    }
  }
  await fs.writeFile(path.join(outdir, "THIRD_PARTY_NOTICES.txt"), notices.join("\n\n--------------------\n\n") + "\n");
  await fs.copyFile(path.join(root, "extension/static/panel.html"), path.join(outdir, "panel.html"));
  await fs.mkdir(path.join(outdir, "icons"), { recursive: true });
  for (const size of [16, 32, 48, 128]) await sharp(path.join(root, "app/icon.png")).resize(size, size).png().toFile(path.join(outdir, `icons/${size}.png`));
  const icons = Object.fromEntries([16, 32, 48, 128].map((size) => [size, `icons/${size}.png`]));
  const manifest = {
    manifest_version: 3, name: local ? "Umprompt (Local)" : "Umprompt - AI Prompt Helper", version: "0.1.2", minimum_chrome_version: "116",
    description: "Expand rough ideas into clear AI prompts. Optimize, simplify, copy, and save to your Umprompt history.",
    permissions: ["sidePanel", "storage", "identity", "clipboardWrite"],
    host_permissions: [`${origin}/*`, `${supabaseOrigin}/*`],
    action: { default_title: "Open Umprompt", default_icon: icons }, icons,
    background: { service_worker: "background.js" }, side_panel: { default_path: "panel.html" }, incognito: "not_allowed",
    content_security_policy: { extension_pages: `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src ${origin} ${supabaseOrigin}; object-src 'none'; base-uri 'none'` },
  };
  await fs.writeFile(path.join(outdir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  const files = await fs.readdir(outdir);
  for (const file of files.filter((file) => file.endsWith(".js"))) {
    const code = await fs.readFile(path.join(outdir, file), "utf8");
    if (/SUPABASE_SERVICE_ROLE_KEY|ANTHROPIC_API_KEY|OPENROUTER_API_KEY|STRIPE_SECRET_KEY/.test(code)) throw new Error("Server-only configuration leaked into the extension.");
  }
  console.log(`Chrome extension built: ${outdir}`);
  console.log(`Backend: ${origin}. Add the installed extension's exact auth callback to Supabase before sign-in.`);
  return outdir;
}
module.exports = { buildExtension };
if (require.main === module) buildExtension({ local: process.argv.includes("--local"), liveInPlace: process.argv.includes("--live-in-place") })
  .catch((error) => { console.error(error.message); process.exitCode = 1; });
