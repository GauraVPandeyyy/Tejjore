import { hybridConciergeProvider } from "./hybridProvider";
import { orchestratorProvider } from "./orchestrator";
import { ruleBasedConciergeProvider } from "./ruleBasedProvider";
import type { ConciergeProvider } from "./provider";

export function getConciergeProvider(): ConciergeProvider {
  const configured = process.env.CONCIERGE_PROVIDER?.toLowerCase();
  if (configured === "rules") return ruleBasedConciergeProvider;
  // "deterministic" skips the model path entirely (rules + grounded cards, optional Gemini rewrite of static wording).
  if (configured === "deterministic") return hybridConciergeProvider;
  // Default ("hybrid"): the orchestrator, i.e. Gemini with read-only tools when enabled, the same grounded router otherwise.
  return orchestratorProvider;
}

export type {
  ConciergeAction,
  ConciergeCard,
  ConciergeRoomItem,
  ConciergeLanguageLayer,
  ConciergeMessage,
  ConciergeProvider,
  ConciergeReply,
} from "./provider";
