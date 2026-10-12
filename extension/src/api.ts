import { background } from "./core";
import { siteOrigin } from "./config";

export class ApiError extends Error {
  constructor(message: string, public status: number, public upgradeRequired = false,
    public reason: "network" | "missing" | "unavailable" | "invalid" | "rateLimit" | "request" | "reload" = "unavailable") { super(message); }
}

export function hasBackendAccess(manifest: Pick<chrome.runtime.Manifest, "host_permissions" | "content_security_policy">, origin: string) {
  const policy = manifest.content_security_policy;
  const sources = (typeof policy === "string" ? policy : policy?.extension_pages ?? "")
    .split(";").map((directive) => directive.trim().split(/\s+/)).find(([name]) => name === "connect-src");
  return manifest.host_permissions?.includes(`${origin}/*`) === true && sources?.includes(origin) === true;
}

function requireBackendAccess() {
  // Unpacked files can change before Chrome reloads the active manifest.
  if (!hasBackendAccess(chrome.runtime.getManifest(), siteOrigin)) {
    throw new ApiError("Reload Umprompt to finish the extension update.", 0, false, "reload");
  }
}

async function request(url: string, options: RequestInit) {
  requireBackendAccess();
  try { return await fetch(url, { ...options, signal: options.signal ?? AbortSignal.timeout(15000) }); }
  catch (error) {
    if (options.signal?.aborted || (error instanceof Error && ["AbortError", "TimeoutError"].includes(error.name))) throw error;
    throw new ApiError("Could not reach Umprompt.", 0, false, "network");
  }
}

export async function readJson(response: Response) {
  try { return await response.json(); }
  catch { throw new ApiError("Invalid response from Umprompt.", response.status, false, "invalid"); }
}

export async function checkBackend(signal?: AbortSignal) {
  const response = await request(`${siteOrigin}/api/extension/health`, { credentials: "omit", redirect: "error", cache: "no-store", signal });
  if (response.status === 404) throw new ApiError("The extension backend is not installed.", 404, false, "missing");
  if (!response.ok) throw new ApiError("Umprompt is unavailable.", response.status);
  const data = await readJson(response);
  if (data?.service !== "umprompt-extension" || data.version !== 1) throw new ApiError("Incompatible extension backend.", response.status, false, "invalid");
}

export async function api(path: string, options: { method?: "GET" | "POST" | "PUT"; body?: unknown; signal?: AbortSignal; ownerId: string }) {
  options.signal?.throwIfAborted();
  requireBackendAccess();
  const session = await background<{ token: string; userId: string } | null>({ type: "token" });
  if (!session || session.userId !== options.ownerId) throw new ApiError("Sign in to Umprompt again.", 401);
  options.signal?.throwIfAborted();
  const response = await request(`${siteOrigin}/api/extension/${path}`, {
    method: options.method ?? "GET", signal: options.signal, credentials: "omit", redirect: "error",
    headers: { Authorization: `Bearer ${session.token}`, ...(options.body ? { "Content-Type": "application/json" } : {}) },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });
  if (!response.ok) {
    const json = await response.json().catch(() => ({}));
    const reason = response.status === 404 ? "missing" : response.status === 429 ? "rateLimit" : [400, 413, 422].includes(response.status) ? "request" : "unavailable";
    throw new ApiError(`Umprompt returned ${response.status}.`, response.status, json?.upgradeRequired === true, reason);
  }
  const type = response.headers.get("Content-Type") ?? "";
  if (!(path === "generate" ? type.startsWith("text/plain") : type.includes("application/json"))) {
    throw new ApiError("Unexpected response from Umprompt.", response.status, false, "invalid");
  }
  return response;
}
export async function readPrompt(response: Response, onChunk: (text: string) => void): Promise<string> {
  if (!response.body) throw new ApiError("No prompt was returned.", 502, false, "invalid");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
      if (text.length > 16000) throw new ApiError("The prompt is too long.", 502, false, "invalid");
      onChunk(text);
    }
    text += decoder.decode();
    if (!text.trim() || text.length > 16000) throw new ApiError("Invalid prompt result.", 502, false, "invalid");
    return text;
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
