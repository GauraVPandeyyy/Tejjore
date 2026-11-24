import "server-only";
import { recordGeminiTokens, tripGeminiBreaker } from "./budget";

/**
 * Language-model abstraction. The orchestrator only knows this interface; Gemini (free tier) is the
 * one implementation, and another provider can be added by implementing `LlmProvider`.
 */
export type LlmToolDeclaration = { name: string; description: string; parameters: Record<string, unknown> };
export type LlmToolCall = { name: string; args: Record<string, unknown> };
export type LlmMessage =
  | { role: "user"; text: string }
  | { role: "model"; text?: string; calls?: LlmToolCall[]; raw?: unknown[] }
  | { role: "tool"; name: string; response: unknown };
export type LlmResult = { text: string; calls: LlmToolCall[]; raw?: unknown[] };

export interface LlmProvider {
  readonly name: string;
  generate(input: { system: string; messages: LlmMessage[]; tools: LlmToolDeclaration[]; signal: AbortSignal }): Promise<LlmResult>;
}

export class LlmUnavailableError extends Error {
  constructor(readonly kind: "quota" | "timeout" | "error" | "blocked", message: string) {
    super(message);
  }
}

type GeminiPart = { text?: string; functionCall?: { name: string; args?: Record<string, unknown> }; functionResponse?: unknown; thought?: boolean };
type GeminiContent = { role: "user" | "model"; parts: GeminiPart[] };
type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: GeminiPart[] }; finishReason?: string }>;
  promptFeedback?: { blockReason?: string };
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
};

function toContents(messages: LlmMessage[]): GeminiContent[] {
  const contents: GeminiContent[] = [];
  for (const message of messages) {
    if (message.role === "user") contents.push({ role: "user", parts: [{ text: message.text }] });
    else if (message.role === "model") {
      const parts = (message.raw as GeminiPart[] | undefined) ?? [
        ...(message.text ? [{ text: message.text }] : []),
        ...(message.calls ?? []).map((call) => ({ functionCall: { name: call.name, args: call.args } })),
      ];
      if (parts.length) contents.push({ role: "model", parts });
    } else {
      // Responses to one model turn travel together in a single user content.
      const part: GeminiPart = { functionResponse: { name: message.name, response: { content: message.response } } };
      const last = contents[contents.length - 1];
      if (last?.role === "user" && last.parts.every((item) => item.functionResponse)) last.parts.push(part);
      else contents.push({ role: "user", parts: [part] });
    }
  }
  return contents;
}

/** The Gemini REST provider, or null unless explicitly enabled with a key and a model id. */
export function geminiProvider(): LlmProvider | null {
  if (process.env.CONCIERGE_LANGUAGE_PROVIDER !== "gemini") return null;
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model = process.env.GEMINI_CONCIERGE_MODEL?.trim();
  if (!apiKey || !model) return null;
  return {
    name: "gemini",
    async generate({ system, messages, tools, signal }) {
      let response: Response;
      try {
        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: toContents(messages),
            tools: [{ functionDeclarations: tools }],
            toolConfig: { functionCallingConfig: { mode: "AUTO" } },
            generationConfig: { temperature: 0.2, maxOutputTokens: 700 },
          }),
          cache: "no-store",
          signal,
        });
      } catch (error) {
        tripGeminiBreaker(30_000);
        const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
        throw new LlmUnavailableError(timedOut ? "timeout" : "error", timedOut ? "Gemini timed out" : "Gemini request failed");
      }
      if (response.status === 429 || response.status === 403) {
        tripGeminiBreaker(5 * 60_000);
        throw new LlmUnavailableError("quota", `Gemini quota or access error (${response.status})`);
      }
      if (!response.ok) {
        tripGeminiBreaker(30_000);
        throw new LlmUnavailableError("error", `Gemini error (${response.status})`);
      }
      const data = (await response.json().catch(() => null)) as GeminiResponse | null;
      if (data?.usageMetadata) void recordGeminiTokens(data.usageMetadata.promptTokenCount ?? 0, data.usageMetadata.candidatesTokenCount ?? 0);
      const candidate = data?.candidates?.[0];
      if (!candidate?.content?.parts || data?.promptFeedback?.blockReason || candidate.finishReason === "SAFETY") {
        throw new LlmUnavailableError("blocked", "Gemini returned no usable answer");
      }
      const parts = candidate.content.parts;
      return {
        text: parts.filter((part) => part.text && !part.thought).map((part) => part.text).join("").trim(),
        calls: parts.filter((part) => part.functionCall).map((part) => ({ name: part.functionCall!.name, args: part.functionCall!.args ?? {} })),
        raw: parts,
      };
    },
  };
}
