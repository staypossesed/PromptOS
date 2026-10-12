const MAX_PROVIDER_RESPONSE_BYTES = 2 * 1024 * 1024;

export async function boundedProviderFetch(
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1]
): Promise<Response> {
  const response = await fetch(input, init);
  if (!response.body) return response;
  const reader = response.body.getReader();
  let size = 0;
  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) { controller.close(); return; }
        size += value.byteLength;
        if (size > MAX_PROVIDER_RESPONSE_BYTES) {
          void reader.cancel().catch(() => {});
          controller.error(new Error("AI provider response exceeded the safe size limit."));
          return;
        }
        controller.enqueue(value);
      } catch (error) { controller.error(error); }
    },
    cancel(reason) { return reader.cancel(reason); },
  });
  return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
}
