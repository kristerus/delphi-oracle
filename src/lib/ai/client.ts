import type { AIClientConfig, AIMessage, AIResponse } from "./types";

/* ─── Model-agnostic AI client ──────────────────────────────────────────────── */

export async function callAI(
  config: AIClientConfig,
  messages: AIMessage[]
): Promise<AIResponse> {
  switch (config.provider) {
    case "claude":
      return callClaude(config, messages);
    case "openai":
      return callOpenAI(config, messages);
    case "custom":
      return callCustom(config, messages);
    default:
      throw new Error(`Unknown AI provider: ${config.provider}`);
  }
}

async function callClaude(
  config: AIClientConfig,
  messages: AIMessage[]
): Promise<AIResponse> {
  const system = messages.find((m) => m.role === "system")?.content;
  const userMessages = messages.filter((m) => m.role !== "system");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.model ?? "claude-sonnet-4-6",
      max_tokens: config.maxTokens ?? 4096,
      system,
      messages: userMessages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Claude API error ${response.status}: ${JSON.stringify(err)}`);
  }

  const data = await response.json();
  return {
    content: data.content?.[0]?.text ?? "",
    usage: {
      promptTokens: data.usage?.input_tokens ?? 0,
      completionTokens: data.usage?.output_tokens ?? 0,
      totalTokens: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
    },
    model: data.model ?? config.model ?? "claude-sonnet-4-6",
  };
}

async function callOpenAI(
  config: AIClientConfig,
  messages: AIMessage[]
): Promise<AIResponse> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model ?? "gpt-4o",
      max_tokens: config.maxTokens ?? 4096,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`OpenAI API error ${response.status}: ${JSON.stringify(err)}`);
  }

  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content ?? "",
    usage: {
      promptTokens: data.usage?.prompt_tokens ?? 0,
      completionTokens: data.usage?.completion_tokens ?? 0,
      totalTokens: data.usage?.total_tokens ?? 0,
    },
    model: data.model ?? config.model ?? "gpt-4o",
  };
}

async function callCustom(
  config: AIClientConfig,
  messages: AIMessage[]
): Promise<AIResponse> {
  if (!config.baseUrl) throw new Error("Custom provider requires baseUrl");

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model ?? "default",
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: config.maxTokens ?? 4096,
    }),
  });

  if (!response.ok) {
    throw new Error(`Custom API error ${response.status}`);
  }

  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content ?? "",
    usage: {
      promptTokens: data.usage?.prompt_tokens ?? 0,
      completionTokens: data.usage?.completion_tokens ?? 0,
      totalTokens: data.usage?.total_tokens ?? 0,
    },
    model: data.model ?? "custom",
  };
}

/** Parse JSON from AI response, tolerating markdown code blocks */
export function parseAIJson<T>(content: string): T {
  const cleaned = content
    .replace(/^```(?:json)?\n?/m, "")
    .replace(/\n?```$/m, "")
    .trim();
  return JSON.parse(cleaned) as T;
}
