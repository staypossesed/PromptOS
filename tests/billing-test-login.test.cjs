const test = require("node:test");
const assert = require("node:assert/strict");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const jsx = require("react/jsx-runtime");
const icons = require("lucide-react");
const load = require("./load-with-imports.cjs");
const authErrors = require("../scripts/load-ts.cjs").loadTS("lib/auth-errors.ts");

test("isolated billing login shows email only, while the normal login retains OAuth", () => {
  const { LoginForm } = load("components/auth/login-form.tsx", {
    react: React, "react/jsx-runtime": jsx, "lucide-react": icons,
    "next/link": { default: ({ children, href }) => React.createElement("a", { href }, children) },
    "next/navigation": { useSearchParams: () => new URLSearchParams() },
    "framer-motion": { motion: { div: ({ children, className }) => React.createElement("div", { className }, children) }, AnimatePresence: ({ children }) => children },
    "@/components/ui/button": { Button: ({ children, disabled, type }) => React.createElement("button", { disabled, type }, children) },
    "@/components/ui/input": { Input: props => React.createElement("input", props) },
    "@/lib/supabase/client": { createClient: () => ({ auth: {} }) },
    "@/lib/analytics": { track: () => {} },
    "@/lib/auth-errors": authErrors,
    "@/lib/i18n/use-translations": { useTranslations: () => ({ t: key => key }) },
    "@/lib/auth-redirect": { safeAuthNext: () => "/plan", prepareAuthRedirect: () => "http://localhost:3002/auth/callback" },
  });
  for (const [props, oauthExpected] of [[{}, true], [{ showOAuthProviders: true }, true], [{ showOAuthProviders: false }, false]]) {
    const html = renderToStaticMarkup(React.createElement(LoginForm, props));
    assert.ok(html.includes("auth.continueWithEmail"));
    assert.equal(html.includes("auth.continueWithGoogle"), oauthExpected);
    assert.equal(html.includes("auth.continueWithGithub"), oauthExpected);
    assert.equal(html.includes("common.or"), oauthExpected);
  }
});

test("email-only mode and the test label require the server's isolated-test flag", () => {
  const original = process.env.UMPROMPT_BILLING_TEST;
  const { default: LoginPage } = load("app/login/page.tsx", {
    react: React, "react/jsx-runtime": jsx,
    "@/components/auth/login-form": { LoginForm: ({ showOAuthProviders }) => React.createElement("span", null, showOAuthProviders ? "OAUTH_ENABLED" : "EMAIL_ONLY") },
    "next/link": { default: ({ children }) => React.createElement("a", null, children) },
    "@/components/brand/logo": { Logo: () => null },
  });
  try {
    for (const [flag, isTest] of [[undefined, false], ["0", false], ["1", true]]) {
      if (flag === undefined) delete process.env.UMPROMPT_BILLING_TEST;
      else process.env.UMPROMPT_BILLING_TEST = flag;
      const html = renderToStaticMarkup(React.createElement(LoginPage));
      assert.equal(html.includes("Payment test"), isTest);
      assert.equal(html.includes("EMAIL_ONLY"), isTest);
      assert.equal(html.includes("OAUTH_ENABLED"), !isTest);
    }
  } finally {
    if (original === undefined) delete process.env.UMPROMPT_BILLING_TEST;
    else process.env.UMPROMPT_BILLING_TEST = original;
  }
});

test("expired email errors in a fragment or query show recovery guidance without echoing provider details", () => {
  const originalWindow = global.window;
  try {
    for (const [query, hash, expected] of [
      ["error=Generic+failure", "#error_code=otp_expired&error_description=PRIVATE_MARKER", "auth.emailLinkExpired"],
      ["error_code=otp_expired", "", "auth.emailLinkExpired"],
      ["error=Generic+failure", "#error_code=unknown&error_description=PRIVATE_MARKER", "Generic failure"],
    ]) {
      const states = [];
      const effects = [];
      global.window = { location: { hash } };
      const { LoginForm } = load("components/auth/login-form.tsx", {
        react: { useState: value => { const index = states.length; states.push(value); return [value, next => { states[index] = next; }]; }, useMemo: factory => factory(), useEffect: effect => effects.push(effect) },
        "react/jsx-runtime": jsx, "lucide-react": icons,
        "next/link": { default: () => null }, "next/navigation": { useSearchParams: () => new URLSearchParams(query) },
        "framer-motion": { motion: { div: () => null }, AnimatePresence: () => null },
        "@/components/ui/button": { Button: () => null }, "@/components/ui/input": { Input: () => null },
        "@/lib/supabase/client": { createClient: () => ({ auth: {} }) }, "@/lib/analytics": { track: () => {} },
        "@/lib/auth-errors": authErrors,
        "@/lib/i18n/use-translations": { useTranslations: () => ({ t: key => key }) },
        "@/lib/auth-redirect": { safeAuthNext: () => "/plan", prepareAuthRedirect: () => "http://localhost:3002/auth/callback" },
      });
      LoginForm({ showOAuthProviders: false });
      effects.forEach(effect => effect());
      assert.equal(states[2], expected);
      assert.equal(states[2].includes("PRIVATE_MARKER"), false);
    }
  } finally {
    if (originalWindow === undefined) delete global.window;
    else global.window = originalWindow;
  }
});

test("email send limits and request limits have distinct guidance without promising a reset time", () => {
  for (const error of [
    { code: "over_email_send_rate_limit", status: 429 },
    { message: "email rate limit exceeded" },
    { message: " EMAIL RATE LIMIT EXCEEDED. " },
  ]) assert.equal(authErrors.emailSignInErrorKey(error), "auth.emailRateLimited");
  for (const error of [{ code: "over_request_rate_limit" }, { status: 429, message: "PRIVATE_MARKER" }]) {
    assert.equal(authErrors.emailSignInErrorKey(error), "auth.signInRateLimited");
  }
  for (const error of [null, undefined, "rate limit", { code: "otp_expired" }, { status: 500 }, new Error("Network unavailable")]) {
    assert.equal(authErrors.emailSignInErrorKey(error), null);
  }
});

test("email rate-limit responses and exceptions show guidance without retrying or claiming a sent email", async () => {
  const originalWindow = global.window;
  global.window = { location: { origin: "http://localhost:3002", hash: "" } };
  try {
    for (const throws of [false, true]) {
    const states = [];
    let cursor = 0;
    let requests = 0;
    const { LoginForm } = load("components/auth/login-form.tsx", {
      react: {
        useState: initial => {
          const index = cursor++;
          if (!(index in states)) states[index] = initial;
          return [states[index], value => { states[index] = value; }];
        },
        useMemo: factory => factory(), useEffect: () => {},
      },
      "react/jsx-runtime": jsx, "lucide-react": icons,
      "next/link": { default: () => null }, "next/navigation": { useSearchParams: () => new URLSearchParams() },
      "framer-motion": { motion: { div: () => null }, AnimatePresence: () => null },
      "@/components/ui/button": { Button: () => null }, "@/components/ui/input": { Input: () => null },
      "@/lib/supabase/client": { createClient: () => ({ auth: { signInWithOtp: async () => {
        requests++;
        const error = { code: "over_email_send_rate_limit", status: 429, message: "PRIVATE_PROVIDER_DETAILS" };
        if (throws) throw error;
        return { error };
      } } }) },
      "@/lib/analytics": { track: () => {} }, "@/lib/auth-errors": authErrors,
      "@/lib/i18n/use-translations": { useTranslations: () => ({ t: key => key }) },
      "@/lib/auth-redirect": { safeAuthNext: () => "/plan", prepareAuthRedirect: () => "http://localhost:3002/auth/callback" },
    });
    function findForm(node) {
      if (!node || typeof node !== "object") return null;
      if (node.type?.name === "FormState") return node.props;
      for (const child of React.Children.toArray(node.props?.children)) {
        const found = findForm(child);
        if (found) return found;
      }
      return null;
    }
    const form = findForm(LoginForm({ showOAuthProviders: false }));
    form.setEmail("billing-qa@example.com");
    cursor = 0;
    const entered = findForm(LoginForm({ showOAuthProviders: false }));
    await entered.onSubmit({ preventDefault() {} });
    assert.equal(requests, 1);
    assert.equal(states[1], "idle");
    assert.equal(states[2], "auth.emailRateLimited");
    assert.equal(states[3], false);
    }
  } finally {
    if (originalWindow === undefined) delete global.window;
    else global.window = originalWindow;
  }
});
