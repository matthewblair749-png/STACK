import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const created = vi.hoisted(() => ({ actions: [] as unknown[] }));

vi.mock("@/server/db", () => ({
  db: {
    conversationMessage: { count: async () => 0 },
    memoryItem: { count: async () => 0 },
    project: { findFirst: async () => null },
    pendingAction: {
      create: async ({ data }: { data: { kind: string; payload: unknown } }) => {
        created.actions.push(data);
        return { id: "pa1", kind: data.kind, payload: data.payload };
      },
    },
  },
}));
vi.mock("@/server/work/context", () => ({
  buildWorkContext: async () => ({ text: "CONNECTED APPS: none\nTASKS:\n- task:t1 Ship pricing page (due today)", apps: [], refs: new Map([["task:t1", { label: "Ship pricing page", href: "/tasks" }]]) }),
}));
vi.mock("./local", () => ({ runLocalAsk: async () => ({ answer: "local", pendingActions: [], used: { apps: [], items: [] } }) }));

import { partialStringField, runAsk, type AskEvent } from "./run";

describe("reading the headline while it is still being written", () => {
  it("returns an unfinished string, a finished one, or nothing yet", () => {
    expect(partialStringField('{"headline": "One ta', "headline")).toBe("One ta");
    expect(partialStringField('{"headline": "Done.", "findings": [', "headline")).toBe("Done.");
    expect(partialStringField('{"headl', "headline")).toBeUndefined();
  });
  it("decodes escapes and waits out an escape that is cut off", () => {
    expect(partialStringField('{"headline": "Say \\"hi\\"\\nthen \\u00e9', "headline")).toBe('Say "hi"\nthen é');
    expect(partialStringField('{"headline": "Line\\', "headline")).toBe("Line");
    expect(partialStringField('{"headline": "Caf\\u00', "headline")).toBe("Caf");
  });
});

/** A fake Anthropic streaming response: one assistant message made of the given content blocks. */
function sse(blocks: ({ type: "text"; chunks: string[] } | { type: "tool_use"; name: string; chunks: string[] })[], stopReason: string) {
  const events: unknown[] = [
    { type: "message_start", message: { id: "msg_1", type: "message", role: "assistant", model: "claude-sonnet-5-5", content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 10, output_tokens: 1 } } },
  ];
  blocks.forEach((b, index) => {
    if (b.type === "text") {
      events.push({ type: "content_block_start", index, content_block: { type: "text", text: "" } });
      for (const text of b.chunks) events.push({ type: "content_block_delta", index, delta: { type: "text_delta", text } });
    } else {
      events.push({ type: "content_block_start", index, content_block: { type: "tool_use", id: `tu_${index}`, name: b.name, input: {} } });
      for (const partial_json of b.chunks) events.push({ type: "content_block_delta", index, delta: { type: "input_json_delta", partial_json } });
    }
    events.push({ type: "content_block_stop", index });
  });
  events.push({ type: "message_delta", delta: { stop_reason: stopReason, stop_sequence: null }, usage: { output_tokens: 20 } });
  events.push({ type: "message_stop" });
  const body = events.map((e) => `event: ${(e as { type: string }).type}\ndata: ${JSON.stringify(e)}\n\n`).join("");
  return new Response(body, { status: 200, headers: { "Content-Type": "text/event-stream" } });
}

const ask = (emit?: (e: AskEvent) => void) => runAsk({ workspaceId: "w1", userId: "u1", question: "What is due today?", emit });

beforeEach(() => {
  created.actions = [];
  vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test");
  vi.stubEnv("LLM_BASE_URL", "");
  vi.stubEnv("LLM_MODEL", "");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("STACK AI on Claude", () => {
  it("streams the headline word by word and returns the structured answer", async () => {
    const fetchMock = vi.fn(async () =>
      sse([{ type: "tool_use", name: "present_answer", chunks: ['{"headline": "One task', ' is due today.", "findings": [{"title": "Ship pricing page", "detail": "Due today", "ref": "task:t1"}]}'] }], "tool_use"),
    );
    vi.stubGlobal("fetch", fetchMock);
    const events: AskEvent[] = [];
    const result = await ask((e) => events.push(e));

    expect(events.filter((e) => e.type === "partial").map((e) => (e as { text: string }).text)).toEqual(["One task", "One task is due today."]);
    expect(result.answer).toBe("One task is due today.");
    expect(result.structured?.findings[0]).toMatchObject({ title: "Ship pricing page", source: { label: "Ship pricing page", href: "/tasks" } });
    expect(result.used.items).toEqual([{ type: "task", label: "Ship pricing page", href: "/tasks" }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("asks Sonnet 5.5 with explicit effort, fallback, caching and eager streaming only for the answer tool", async () => {
    const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(async () => sse([{ type: "tool_use", name: "present_answer", chunks: ['{"headline": "Nothing is due."}'] }], "tool_use"));
    vi.stubGlobal("fetch", fetchMock);
    await ask();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toMatch(/\/v1\/messages\?beta=true$/);
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({ model: "claude-sonnet-5-5", max_tokens: 16000, stream: true, output_config: { effort: "medium" }, fallbacks: "default", cache_control: { type: "ephemeral" } });
    expect(body.thinking).toBeUndefined();
    expect(body.tool_choice).toBeUndefined();
    expect(body.tools.filter((t: { eager_input_streaming?: boolean }) => t.eager_input_streaming).map((t: { name: string }) => t.name)).toEqual(["present_answer"]);
    expect(new Headers(init.headers).get("anthropic-beta")).toContain("server-side-fallback-2026-07-01");
  });

  it("uses ANTHROPIC_MODEL and ANTHROPIC_EFFORT when set, and ignores an unknown effort", async () => {
    const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(async () => sse([{ type: "tool_use", name: "present_answer", chunks: ['{"headline": "ok"}'] }], "tool_use"));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("ANTHROPIC_MODEL", "claude-opus-5-5");
    vi.stubEnv("ANTHROPIC_EFFORT", "high");
    await ask();
    vi.stubEnv("ANTHROPIC_EFFORT", "turbo");
    await ask();
    const bodies = fetchMock.mock.calls.map((c) => JSON.parse(String((c[1] as RequestInit).body)));
    expect(bodies.map((b) => [b.model, b.output_config.effort])).toEqual([["claude-opus-5-5", "high"], ["claude-opus-5-5", "medium"]]);
  });

  it("falls back to the data-only answer when Claude rejects the request or has no credits", async () => {
    const error = (message: string) => new Response(JSON.stringify({ type: "error", error: { type: "invalid_request_error", message } }), { status: 400, headers: { "Content-Type": "application/json" } });
    vi.stubGlobal("fetch", vi.fn(async () => error("fallbacks: unknown value")));
    expect((await ask()).answer).toBe("local");
    vi.stubGlobal("fetch", vi.fn(async () => error("Your credit balance is too low to access the Anthropic API.")));
    expect((await ask()).answer).toBe("local");
  });

  it("shows a plain message on a refusal instead of the declined content", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => sse([{ type: "text", chunks: ["Partial"] }], "refusal")));
    const result = await ask();
    expect(result.answer).toMatch(/can't help with that request/);
    expect(result.pendingActions).toEqual([]);
  });

  it("never runs a tool call cut off by max_tokens", async () => {
    const fetchMock = vi.fn(async () => sse([{ type: "tool_use", name: "propose_create_task", chunks: ['{"title": "Follow up with'] }], "max_tokens"));
    vi.stubGlobal("fetch", fetchMock);
    const result = await ask();
    expect(created.actions).toEqual([]);
    expect(result.pendingActions).toEqual([]);
    expect(result.answer).toMatch(/ran too long/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("proposes an action from a complete tool call, then answers on the next turn", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(sse([{ type: "tool_use", name: "propose_create_task", chunks: ['{"title": "Email the client"}'] }], "tool_use"))
      .mockResolvedValueOnce(sse([{ type: "tool_use", name: "present_answer", chunks: ['{"headline": "I proposed a task for your approval."}'] }], "tool_use"));
    vi.stubGlobal("fetch", fetchMock);
    const result = await ask();
    expect(created.actions).toEqual([expect.objectContaining({ kind: "CreateTask" })]);
    expect(result.pendingActions).toHaveLength(1);
    expect(result.answer).toBe("I proposed a task for your approval.");

    // The second request carries the first assistant turn back verbatim, then the tool result.
    const second = JSON.parse(String((fetchMock.mock.calls[1][1] as RequestInit).body));
    const [, assistant, toolResult] = second.messages;
    expect(assistant).toMatchObject({ role: "assistant", content: [{ type: "tool_use", id: "tu_0", name: "propose_create_task", input: { title: "Email the client" } }] });
    expect(toolResult.content[0]).toMatchObject({ type: "tool_result", tool_use_id: "tu_0" });
  });
});

/** A fake OpenAI-style streamed chat completion, one `data:` line per chunk. */
function chatStream(chunks: unknown[]) {
  const body = chunks.map((c) => `data: ${JSON.stringify(c)}\n\n`).join("") + "data: [DONE]\n\n";
  return new Response(body, { status: 200, headers: { "Content-Type": "text/event-stream" } });
}
const toolDelta = (call: Record<string, unknown>, finish: string | null = null) => ({ choices: [{ index: 0, delta: { tool_calls: [{ index: 0, ...call }] }, finish_reason: finish }] });

describe("STACK AI on an OpenAI-compatible provider (Gemini)", () => {
  beforeEach(() => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("LLM_BASE_URL", "https://generativelanguage.googleapis.com/v1beta/openai/");
    vi.stubEnv("LLM_MODEL", "gemini-3.8-flash");
    vi.stubEnv("LLM_API_KEY", "gemini-test-key");
  });

  it("streams the headline and sends a streaming request with room for a long answer", async () => {
    const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(async () =>
      chatStream([
        toolDelta({ id: "call_a", type: "function", function: { name: "present_answer", arguments: '{"headline": "One task' } }),
        toolDelta({ function: { arguments: ' is due today."}' } }, "tool_calls"),
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);
    const events: AskEvent[] = [];
    const result = await ask((e) => events.push(e));

    expect(events.filter((e) => e.type === "partial").map((e) => (e as { text: string }).text)).toEqual(["One task", "One task is due today."]);
    expect(result.answer).toBe("One task is due today.");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions");
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer gemini-test-key");
    expect(JSON.parse(String(init.body))).toMatchObject({ model: "gemini-3.8-flash", stream: true, max_tokens: 8192 });
  });

  it("echoes a tool call back with the provider's extra fields, such as Gemini's thought signature", async () => {
    const signature = { google: { thought_signature: "sig-123" } };
    const fetchMock = vi
      .fn<(url: string, init: RequestInit) => Promise<Response>>()
      .mockResolvedValueOnce(chatStream([toolDelta({ id: "call_a", type: "function", extra_content: signature, function: { name: "propose_create_task", arguments: '{"title": "Email the client"}' } }, "tool_calls")]))
      .mockResolvedValueOnce(chatStream([toolDelta({ id: "call_b", type: "function", function: { name: "present_answer", arguments: '{"headline": "Proposed."}' } }, "tool_calls")]));
    vi.stubGlobal("fetch", fetchMock);
    const result = await ask();

    expect(result.pendingActions).toHaveLength(1);
    const second = JSON.parse(String(fetchMock.mock.calls[1][1].body));
    const assistant = second.messages.find((m: { role: string }) => m.role === "assistant");
    expect(assistant.tool_calls).toEqual([{ id: "call_a", type: "function", extra_content: signature, function: { name: "propose_create_task", arguments: '{"title": "Email the client"}' } }]);
    expect(second.messages.at(-1)).toMatchObject({ role: "tool", tool_call_id: "call_a" });
  });

  it("never runs a tool call cut off by the token limit", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => chatStream([toolDelta({ id: "call_a", function: { name: "propose_create_task", arguments: '{"title": "Email' } }, "length")])));
    const result = await ask();
    expect(created.actions).toEqual([]);
    expect(result.answer).toMatch(/ran too long/);
  });

  it("asks again without streaming when the provider refuses streaming with tools", async () => {
    const fetchMock = vi
      .fn<(url: string, init: RequestInit) => Promise<Response>>()
      .mockResolvedValueOnce(new Response('{"error":{"message":"streaming with tools not supported"}}', { status: 400 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { role: "assistant", content: "Nothing is due today." }, finish_reason: "stop" }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    expect((await ask()).answer).toBe("Nothing is due today.");
    expect(JSON.parse(String(fetchMock.mock.calls[1][1].body)).stream).toBeUndefined();
  });
});
