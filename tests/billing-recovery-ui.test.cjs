const test = require("node:test");
const assert = require("node:assert/strict");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const load = require("./load-with-imports.cjs");
const jsx = require("react/jsx-runtime");
const icons = require("lucide-react");

test("billing recovery stays available without encouraging a duplicate purchase", async () => {
  for (const [isPaid, hasCustomer, expected, needsRecovery, lookupFails] of [
    [false, true, true, false, false], [true, true, true, false, false], [false, false, false, false, false],
    [false, true, true, true, false], [false, true, true, false, true], [false, false, false, false, true],
  ]) {
    let owner;
    const from = table => {
      const query = {
        select: () => query, eq: (field, value) => { if (field === "user_id") owner = value; return query; }, in: () => query, limit: () => query,
        maybeSingle: async () => ({
          data: table === "billing_customers" ? (hasCustomer ? { stripe_customer_id: "cus_synthetic" } : null) : (needsRecovery ? { id: "synthetic-subscription" } : null),
          error: table === "billing_subscriptions" && lookupFails ? { code: "SYNTHETIC" } : null,
        }),
      };
      return query;
    };
    const account = load("app/account/page.tsx", {
      "react/jsx-runtime": jsx, "next/navigation": { redirect: () => { throw new Error("Unexpected redirect"); } }, "lucide-react": icons,
      "next/link": { default: ({ children }) => React.createElement("a", null, children) },
      "@/components/layout/app-shell": { AppShell: ({ children }) => React.createElement(React.Fragment, null, children) },
      "@/components/layout/topbar": { Topbar: () => null }, "@/components/ui/button": { Button: ({ children }) => React.createElement("button", null, children) },
      "@/lib/supabase/server": { createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "synthetic-owner", created_at: "2026-10-15T00:00:00Z" } } }) }, from }) },
      "@/app/actions/auth": { signOut: "/synthetic-signout" }, "@/components/analytics/page-view-tracker": { PageViewTracker: () => null },
      "@/lib/i18n/server": { getServerTranslations: async () => ({ t: key => key }) },
      "@/lib/billing": { getBillingStatus: async () => ({ isPaid, plan: "free", usedThisWeek: 1, weeklyLimit: 7, remainingThisWeek: 6 }), planDisplayName: () => "Free" },
      "@/components/billing/billing-portal-button": { BillingPortalButton: () => React.createElement("button", null, "MANAGE_BILLING") },
      "@/components/settings/language-selector": { LanguageSelector: () => null },
    });
    const html = renderToStaticMarkup(await account.default());
    assert.equal(html.includes("MANAGE_BILLING"), expected);
    assert.equal(html.includes("billing.upgradeToPro"), !isPaid && !needsRecovery && !lookupFails);
    assert.equal(html.includes("billing.subscriptionNeedsAttention"), !isPaid && needsRecovery);
    assert.equal(html.includes("billing.planCheckUnavailable"), !isPaid && lookupFails);
    assert.equal(owner, "synthetic-owner");
  }
});

test("portal failure unblocks retry, shows an error, and is not tracked as an opened portal", async () => {
  const originalFetch = global.fetch;
  global.window = { location: { assign: () => { throw new Error("Unexpected navigation"); } } };
  try {
    for (const failure of ["http", "json", "network", "invalid_url"]) {
      const states = [];
      const captures = [];
      global.fetch = async () => {
        if (failure === "network") throw new Error("Synthetic outage");
        return { ok: failure !== "http", json: async () => { if (failure === "json") throw new Error("Synthetic JSON error"); return { url: failure === "invalid_url" ? "javascript:invalid" : undefined }; } };
      };
      const component = load("components/billing/billing-portal-button.tsx", {
        react: { useState: value => { const index = states.length; states.push(value); return [value, next => { states[index] = next; }]; } },
        "react/jsx-runtime": jsx, "lucide-react": icons, "@/components/ui/button": { Button: () => null }, "@/lib/analytics": { track: event => captures.push(event) },
      });
      const element = component.BillingPortalButton({ label: "Manage billing" });
      await element.props.children[0].props.onClick();
      assert.deepEqual(states, [false, true]);
      assert.equal(captures.length, 0);
    }
  } finally { global.fetch = originalFetch; delete global.window; }
});
