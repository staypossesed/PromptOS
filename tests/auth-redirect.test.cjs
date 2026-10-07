const test = require("node:test");
const assert = require("node:assert/strict");
const { loadTS } = require("../scripts/load-ts.cjs");
const { safeAuthNext, prepareAuthRedirect } = loadTS("lib/auth-redirect.ts");

test("auth destinations stay on the app", () => {
  for (const value of [null, "https://evil.test", "//evil.test", "/\\evil.test", "/\nevil.test"]) {
    assert.equal(safeAuthNext(value), "/builder");
  }
  assert.equal(safeAuthNext("/builder?idea=hello%20world"), "/builder?idea=hello%20world");
  assert.equal(safeAuthNext("/history"), "/history");
});

test("OAuth uses an exact callback and remembers the safe destination", () => {
  global.document = { cookie: "" };
  try {
    assert.equal(prepareAuthRedirect("http://localhost:3000", "/history"), "http://localhost:3000/auth/callback");
    assert.match(document.cookie, /umprompt_auth_next=%2Fhistory/);
    assert.match(document.cookie, /SameSite=Lax/);
    assert.doesNotMatch(document.cookie, /Secure/);
    prepareAuthRedirect("https://www.umprompt.com", "//evil.test");
    assert.match(document.cookie, /%2Fbuilder/);
    assert.match(document.cookie, /; Secure$/);
  } finally { delete global.document; }
});
