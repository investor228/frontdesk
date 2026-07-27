/** Events sent over the chat stream. */
export type ChatEvent =
  | { type: "meta"; conversationId: string }
  | { type: "delta"; text: string }
  | { type: "done"; sources: string[]; unanswered: boolean }
  | { type: "error"; message: string; upgrade?: boolean };

const encoder = new TextEncoder();

/**
 * Wrap a producer in an SSE response. The producer gets a `send` callback and
 * may throw — the error is delivered as a final `error` event rather than
 * tearing down the connection with no explanation.
 */
export function sseResponse(
  produce: (send: (event: ChatEvent) => void) => Promise<void>,
  extraHeaders: Record<string, string> = {},
): Response {
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: ChatEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        await produce(send);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Something went wrong.";
        send({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      // Disable proxy buffering so deltas actually arrive incrementally.
      "x-accel-buffering": "no",
      ...extraHeaders,
    },
  });
}

/** Read an SSE stream produced by `sseResponse` on the client. */
export async function readChatStream(
  response: Response,
  onEvent: (event: ChatEvent) => void,
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("The server sent no response body.");

  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data:")) continue;
      try {
        onEvent(JSON.parse(line.slice(5).trim()) as ChatEvent);
      } catch {
        // Ignore malformed frames rather than killing the stream.
      }
    }
  }
}
