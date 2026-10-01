import { hybridConciergeProvider } from "./hybridProvider";
import { ruleBasedConciergeProvider } from "./ruleBasedProvider";
import type { ConciergeProvider } from "./provider";

export function getConciergeProvider(): ConciergeProvider {
  const configured = process.env.CONCIERGE_PROVIDER?.toLowerCase();
  if (configured === "rules") return ruleBasedConciergeProvider;
  return hybridConciergeProvider;
}

export type {
  ConciergeAction,
  ConciergeLanguageLayer,
  ConciergeMessage,
  ConciergeProvider,
  ConciergeReply,
} from "./provider";
