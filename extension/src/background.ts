import { createClient, isAuthRetryableFetchError, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseUrl, supabaseKey } from "./config";
import type { AuthMessage } from "./core";
import { AuthFlowError, classifyAuthWindowError, readAuthCode } from "./auth-flow";

const storageKey = "umprompt-extension-auth";
let client: SupabaseClient | null = null;
let refresh: Promise<unknown> | null = null;
let signIn: { provider: "google" | "github"; result: Promise<void> } | null = null;
const ready = chrome.storage.local.setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" }).then(() => true, () => false);

function auth() {
  client ??= createClient(supabaseUrl, supabaseKey, { auth: {
    flowType: "pkce", storageKey, persistSession: true, autoRefreshToken: false, detectSessionInUrl: false,
    storage: {
      getItem: async (key) => { const value = (await chrome.storage.local.get(key))[key]; return typeof value === "string" ? value : null; },
      setItem: async (key, value) => { await chrome.storage.local.set({ [key]: value }); },
      removeItem: async (key) => { await chrome.storage.local.remove(key); },
    },
  } });
  return client;
}

async function session() {
  const sdk = auth();
  let result = await sdk.auth.getSession();
  if (result.error) throw new AuthFlowError(isAuthRetryableFetchError(result.error) ? "network" : "expired");
  if (!result.data.session) return null;
  if ((result.data.session.expires_at ?? 0) * 1000 < Date.now() + 60000) {
    if (!refresh) refresh = sdk.auth.refreshSession().then(({ error }) => { if (error) throw new AuthFlowError(isAuthRetryableFetchError(error) ? "network" : "expired"); }).finally(() => { refresh = null; });
    await refresh;
    result = await sdk.auth.getSession();
    if (result.error) throw new AuthFlowError(isAuthRetryableFetchError(result.error) ? "network" : "expired");
  }
  return result.data.session;
}

async function connect(provider: "google" | "github") {
  try {
    const redirectTo = chrome.identity.getRedirectURL("auth");
    let authorizationUrl: string;
    try {
      // Finish recovering the SDK's stored session before writing a new PKCE verifier.
      const sdk = auth();
      await sdk.auth.getSession();
      const { data, error } = await sdk.auth.signInWithOAuth({ provider, options: { redirectTo, skipBrowserRedirect: true } });
      if (error || !data.url) throw new AuthFlowError("start");
      authorizationUrl = data.url;
    } catch { throw new AuthFlowError("start"); }
    let callback: string | undefined;
    try { callback = await chrome.identity.launchWebAuthFlow({ url: authorizationUrl, interactive: true }); }
    catch (error) { throw classifyAuthWindowError(error); }
    const code = readAuthCode(callback, redirectTo);
    try {
      const exchanged = await auth().auth.exchangeCodeForSession(code);
      if (exchanged.error || !exchanged.data.session) throw new AuthFlowError("exchange");
    } catch { throw new AuthFlowError("exchange"); }
  } finally {
    await chrome.storage.local.remove(`${storageKey}-code-verifier`).catch(() => {});
  }
}

async function handle(message: AuthMessage) {
  if (!await ready) throw new AuthFlowError("connection");
  if (message.type === "authInfo") return { redirectUrl: chrome.identity.getRedirectURL("auth"), extensionId: chrome.runtime.id };
  if (message.type === "signIn") {
    if (!["google", "github"].includes(message.provider)) throw new AuthFlowError("start");
    if (signIn && signIn.provider !== message.provider) throw new AuthFlowError("busy");
    if (!signIn) {
      // A reopened panel can rejoin its existing login without replacing the PKCE proof.
      signIn = { provider: message.provider, result: connect(message.provider).finally(() => { signIn = null; }) };
    }
    await signIn.result;
  }
  if (message.type === "signOut") {
    const old = await auth().auth.getSession().catch(() => null);
    const storedOwner = (await chrome.storage.local.get(`${storageKey}-owner`))[`${storageKey}-owner`];
    const ownerId = old?.data.session?.user.id ?? storedOwner;
    try { await auth().auth.signOut({ scope: "local" }).catch(() => {}); } finally {
      const keys = Object.keys(await chrome.storage.local.get(null)).filter((key) => key.startsWith(storageKey) || key === `draft:${ownerId}`);
      await chrome.storage.local.remove(keys);
      client = null;
    }
    return null;
  }
  const current = await session();
  if (!current) return null;
  if (message.type === "token") return { token: current.access_token, userId: current.user.id };
  const { data, error } = await auth().auth.getUser(current.access_token);
  if (error) throw new AuthFlowError(isAuthRetryableFetchError(error) ? "network" : "expired");
  if (data.user) await chrome.storage.local.set({ [`${storageKey}-owner`]: data.user.id });
  return data.user ? { id: data.user.id, email: data.user.email, lastSignInAt: data.user.last_sign_in_at } : null;
}

chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (sender.id !== chrome.runtime.id || sender.url !== chrome.runtime.getURL("panel.html")) return false;
  if (!["session", "token", "signIn", "signOut", "authInfo"].includes(message?.type)) return false;
  void handle(message).then((data) => reply({ ok: true, data })).catch((error) => {
    const issue = error instanceof AuthFlowError ? error : message.type === "signIn" ? new AuthFlowError("failed") : null;
    reply({ ok: false, error: issue?.message ?? "Sign in to Umprompt again.", ...(issue ? { authIssue: issue.reason } : {}) });
  });
  return true;
});

chrome.runtime.onInstalled.addListener(() => { void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }); });
