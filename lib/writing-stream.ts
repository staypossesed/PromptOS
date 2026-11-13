// The wire format contains only bounded completion frames, never provider metadata.
export async function readWritingStream(response: Response, update: (text: string, done: boolean) => void, signal: AbortSignal): Promise<string> {
  if (!response.headers?.get("content-type")?.includes("application/x-ndjson")) {
    const json = await response.json();
    if (signal.aborted || json.error || typeof json.data !== "string") throw new Error("Completion unavailable");
    update(json.data, true); return json.data;
  }
  if (!response.body) throw new Error("Completion unavailable");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "", bytes = 0, final = "", finished = false;
  const frame = (line: string) => {
    if (!line.trim()) return;
    const json = JSON.parse(line);
    if (json.error || typeof json.data !== "string" || json.data.length > 240 || json.source !== "ai") throw new Error("Completion unavailable");
    if (signal.aborted) throw new Error("Completion cancelled");
    final = json.data; finished = json.done === true; update(final, finished);
  };
  try {
    while (!finished) {
      if (signal.aborted) throw new Error("Completion cancelled");
      const chunk = await reader.read();
      if (chunk.done) { buffer += decoder.decode(); if (buffer.trim()) frame(buffer); break; }
      bytes += chunk.value.byteLength;
      if (bytes > 16384) throw new Error("Completion exceeded safe size");
      buffer += decoder.decode(chunk.value, { stream: true });
      let newline;
      while (!finished && (newline = buffer.indexOf("\n")) >= 0) { const line = buffer.slice(0, newline); buffer = buffer.slice(newline + 1); frame(line); }
    }
    if (!finished) throw new Error("Incomplete completion stream");
    return final;
  } finally { try { await reader.cancel(); } catch {} }
}
