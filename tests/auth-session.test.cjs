const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const { NextRequest, NextResponse } = require("next/server");

function loadWithImports(filename, imports) {
  const source = fs.readFileSync(path.join(__dirname, "..", filename), "utf8");
  const { outputText } = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } });
  const module = { exports: {} };
  const run = vm.runInThisContext(`(function(require, module, exports) {${outputText}\n})`, { filename });
  run((name) => {
    if (!(name in imports)) throw new Error(`Unexpected import: ${name}`);
    return imports[name];
  }, module, module.exports);
  return module.exports;
}

function setup(user, value) {
  const server = loadWithImports("lib/supabase/server.ts", {
    "next/headers": {},
    "next/server": { NextResponse },
    "@supabase/ssr": { createServerClient: (_url, _key, options) => ({ auth: {
      getUser: async () => {
        options.cookies.setAll([{ name: "sb-test-auth-token", value, options: {
          path: "/", sameSite: "lax", maxAge: value ? 3600 : 0,
        } }], { "Cache-Control": "private, no-store", Expires: "0", Pragma: "no-cache" });
        return { data: { user } };
      },
    } }) },
  });
  return loadWithImports("middleware.ts", {
    "next/server": { NextResponse },
    "@/lib/supabase/server": server,
    "@/lib/admin": { isAdminUser: () => false },
  }).middleware;
}

test("updated auth response is returned after refresh, not the original response", async () => {
  const middleware = setup({ id: "test-user" }, "refreshed-test-session");
  const request = new NextRequest("http://localhost:3000/builder", {
    headers: { cookie: "sb-test-auth-token=old-test-session" },
  });
  const response = await middleware(request);
  assert.equal(response.status, 200);
  assert.equal(response.cookies.get("sb-test-auth-token").value, "refreshed-test-session");
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(request.cookies.get("sb-test-auth-token").value, "refreshed-test-session");
});

test("invalid sessions are cleared on public pages and protected-page redirects", async () => {
  const middleware = setup(null, "");
  for (const route of ["/", "/login", "/builder?id=synthetic-test"]) {
    const response = await middleware(new NextRequest(`http://localhost:3000${route}`));
    const cookie = response.cookies.get("sb-test-auth-token");
    assert.equal(cookie.value, "");
    assert.equal(cookie.maxAge, 0);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    if (route.startsWith("/builder")) {
      assert.equal(response.status, 307);
      const location = new URL(response.headers.get("location"));
      assert.equal(location.pathname, "/login");
      assert.equal(location.searchParams.get("next"), route);
      assert.equal(location.searchParams.get("id"), null);
    } else {
      assert.equal(response.status, 200);
    }
  }
});

test("login and non-admin redirects retain refreshed cookies", async () => {
  const middleware = setup({ id: "test-user", email: "test@example.test" }, "refreshed-test-session");
  for (const [route, destination] of [["/login", "/builder"], ["/admin", "/dashboard"], ["/model-lab", "/dashboard"]]) {
    const response = await middleware(new NextRequest(`http://localhost:3000${route}`));
    assert.equal(new URL(response.headers.get("location")).pathname, destination);
    assert.equal(response.cookies.get("sb-test-auth-token").value, "refreshed-test-session");
    assert.equal(response.headers.get("cache-control"), "private, no-store");
  }
});
