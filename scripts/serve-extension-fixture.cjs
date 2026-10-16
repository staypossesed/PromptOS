// Isolated UI verification of the real panel, with synthetic auth and local-only AI/history.
const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const esbuild = require("esbuild");
const root = path.resolve(__dirname, "..");
const output = process.env.UMPROMPT_TEST_ARTIFACTS;
const user = { id: "12345678-1234-4123-8123-123456789abc", email: "reviewer@example.test" };
const requests = [];
const history = new Map();

async function main() {
  const result = await esbuild.build({
    absWorkingDir: root, entryPoints: ["extension/src/panel.tsx"], bundle: true, write: false,
    outdir: "fixture", platform: "browser", format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' },
    plugins: [{ name: "synthetic-origin", setup(build) {
      build.onResolve({ filter: /^\.\/config$/ }, () => ({ path: "config", namespace: "fixture" }));
      build.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: "export const siteOrigin = window.location.origin;", loader: "js" }));
    } }],
  });
  const js = result.outputFiles.find((file) => file.path.endsWith(".js")).contents;
  const css = result.outputFiles.find((file) => file.path.endsWith(".css")).contents;
  const mock = `const fixtureUser=${JSON.stringify(user)};
    window.chrome={
      runtime:{getManifest:()=>({host_permissions:[location.origin+'/*'],content_security_policy:{extension_pages:'connect-src '+location.origin}}),
        sendMessage:async(message)=>({ok:true,data:message.type==='session'||message.type==='signIn'?fixtureUser:message.type==='token'?{userId:fixtureUser.id,token:'synthetic.fixture.token'}:message.type==='authInfo'?{redirectUrl:'https://fixture.chromiumapp.org/auth'}:null}),reload:()=>location.reload()},
      storage:{local:{get:async(keys)=>{const data=JSON.parse(localStorage.getItem('fixture-storage')||'{}');return Object.fromEntries((Array.isArray(keys)?keys:[keys]).map(key=>[key,data[key]]));},
        set:async(value)=>localStorage.setItem('fixture-storage',JSON.stringify({...JSON.parse(localStorage.getItem('fixture-storage')||'{}'),...value})),
        remove:async(key)=>{const data=JSON.parse(localStorage.getItem('fixture-storage')||'{}');delete data[key];localStorage.setItem('fixture-storage',JSON.stringify(data));}},onChanged:{addListener:()=>{},removeListener:()=>{}}},
      i18n:{getUILanguage:()=> 'en'}};`;
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://127.0.0.1");
      res.setHeader("Cache-Control", "no-store");
      const send = (type, value, status = 200) => { res.writeHead(status, { "Content-Type": type }); res.end(value); };
      const json = (value, status = 200) => send("application/json", JSON.stringify(value), status);
      if (url.pathname === "/panel.js") return send("application/javascript", js);
      if (url.pathname === "/panel.css") return send("text/css", css);
      if (url.pathname.startsWith("/icons/")) return send("image/png", await fs.readFile(path.join(root, "public/brand/umprompt-icon.png")));
      if (!url.pathname.startsWith("/api/")) return send("text/html", `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Umprompt isolated extension check</title><link rel="stylesheet" href="/panel.css"></head><body><div id="root"></div><script>${mock}</script><script src="/panel.js"></script></body></html>`);
      if (url.pathname.endsWith("/health")) return json({ service: "umprompt-extension", version: 1 });
      if (req.headers.authorization !== "Bearer synthetic.fixture.token") return json({ error: "Synthetic session required." }, 401);
      let raw = "";
      for await (const chunk of req) { raw += chunk; if (raw.length > 100000) return json({ error: "Too large" }, 413); }
      const body = raw ? JSON.parse(raw) : null;
      requests.push({ method: req.method, path: url.pathname, body });
      if (output) { await fs.mkdir(output, { recursive: true }); await fs.writeFile(path.join(output, "extension-request-log.json"), JSON.stringify(requests, null, 2)); }
      const endpoint = url.pathname.replace("/api/extension/", "");
      if (endpoint === "status") return json({ data: { isPaid: true, remainingThisWeek: null } });
      if (endpoint === "generate") {
        await new Promise((resolve) => setTimeout(resolve, 800));
        if (body.idea.includes("simulate generation failure")) return json({ error: "Synthetic failure" }, 503);
        return send("text/plain", body.refinement ? `Shorter version: ${body.refinement.prompt}` : `Help me with this task:\n${body.idea}\n\nInclude: ${body.context?.constraints || "a clear goal and a useful output"}.\nDo not invent missing facts.`);
      }
      if (endpoint === "score") {
        if (body.generated_prompt.includes("simulate rescore failure") && body.generated_prompt.includes("Applied quality feedback")) return json({ error: "Synthetic score failure" }, 503);
        const improved = body.generated_prompt.includes("Applied quality feedback");
        return json({ data: { overall: improved ? 92 : 81, dimensions: ["Clarity", "Context", "Constraints", "Examples", "Output Format", "Tool Fit"].map((label, i) => ({ key: `criterion-${i}`, label, score: improved ? 92 : 75 + i, reason: "Synthetic evaluation.", tip: i ? `Make ${label.toLowerCase()} explicit.` : "Specify the recipient and expected length." })) } });
      }
      if (endpoint === "optimize") {
        if (body.generated_prompt.includes("simulate optimization failure")) return json({ error: "Synthetic optimization failure" }, 503);
        return json({ data: { improved_prompt: `${body.generated_prompt}\n\nApplied quality feedback: ${body.score.dimensions.map((dimension) => dimension.tip).join(" ")}` } });
      }
      if (endpoint === "prompts") return json({ data: [...history.values()] });
      if (endpoint.startsWith("prompts/") && req.method === "PUT") {
        const id = endpoint.split("/")[1];
        const row = { ...body, id, title: body.idea.slice(0, 60), updated_at: new Date().toISOString(), created_at: new Date().toISOString() };
        history.set(id, row); return json({ data: row });
      }
      return json({ error: "Unknown synthetic endpoint" }, 404);
    } catch (error) { res.writeHead(500, { "Content-Type": "application/json" }); res.end(JSON.stringify({ error: "Fixture failure" })); console.error(error); }
  });
  server.listen(0, "127.0.0.1", () => console.log(JSON.stringify({ url: `http://127.0.0.1:${server.address().port}/panel.html`, synthetic: true })));
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
