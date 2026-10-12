const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { build } = require("esbuild");

async function main() {
  const root = path.resolve(__dirname, "..");
  const directory = path.join(root, "extension/dist/chrome");
  const manifest = JSON.parse(await fs.readFile(path.join(directory, "manifest.json"), "utf8"));
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions, ["sidePanel", "storage", "identity", "clipboardWrite"]);
  assert.deepEqual(manifest.host_permissions, ["https://www.umprompt.com/*", "https://yxprfdhuhwdcjreyahha.supabase.co/*"]);
  assert.equal(manifest.externally_connectable, undefined);
  assert.equal(manifest.content_scripts, undefined);
  assert.equal(manifest.content_security_policy.extension_pages.includes("script-src 'self';"), true);
  assert.equal(/unsafe-eval|unsafe-inline|https?:\/\/\*/.test(manifest.content_security_policy.extension_pages), false);
  for (const file of ["panel.js", "background.js"]) {
    const code = await fs.readFile(path.join(directory, file), "utf8");
    assert.equal(/SUPABASE_SERVICE_ROLE_KEY|ANTHROPIC_API_KEY|OPENROUTER_API_KEY|STRIPE_SECRET_KEY|sb_secret_/.test(code), false, "Server-only configuration must not enter the extension.");
  }
  const result = await build({
    absWorkingDir: root, entryPoints: ["extension/src/panel.tsx", "extension/src/background.ts"],
    outdir: "extension/artifacts/security-analysis", write: false, bundle: true,
    platform: "browser", target: "chrome116", format: "iife", jsx: "automatic", metafile: true,
    define: { __SITE_ORIGIN__: JSON.stringify("https://www.umprompt.com"), __SUPABASE_URL__: JSON.stringify("https://yxprfdhuhwdcjreyahha.supabase.co"), __SUPABASE_KEY__: JSON.stringify("synthetic-public-key"), "process.env.NODE_ENV": JSON.stringify("production") },
    logLevel: "warning",
  });
  const inputs = Object.keys(result.metafile.inputs);
  const excluded = ["jsondiffpatch", "braces", "postcss-selector-parser", "postcss-nested", "ai", "@ai-sdk/provider-utils", "next"];
  for (const name of excluded) assert.equal(inputs.some((input) => input.includes(`node_modules/${name}/`)), false, `${name} must not be bundled in the extension.`);
  const traces = [];
  async function walk(directory) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(target);
      else if (entry.name.endsWith(".nft.json")) traces.push(target);
    }
  }
  await walk(path.join(root, ".next/server"));
  assert.ok(traces.length, "Run the production build before checking runtime traces.");
  for (const trace of traces) {
    const files = JSON.parse(await fs.readFile(trace, "utf8")).files;
    for (const name of ["jsondiffpatch", "braces", "postcss-selector-parser", "postcss-nested"]) {
      assert.equal(files.some((file) => file.replaceAll("\\", "/").includes(`node_modules/${name}/`)), false, `${name} unexpectedly enters a deployed server trace.`);
    }
  }
  console.log(`PASS: minimal extension permissions, local-only executable code, no server-key configuration, ${inputs.length} inspected bundle inputs, ${traces.length} production traces.`);
  console.log("Root dependency advisories still require follow-up; this is a scoped reachability check, not a penetration test or a clean npm audit.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
