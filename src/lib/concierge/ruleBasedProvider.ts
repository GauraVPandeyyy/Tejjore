import { answerConciergeMessage } from "./knowledge";
import type { ConciergeMessage, ConciergeProvider } from "./provider";

export const ruleBasedConciergeProvider: ConciergeProvider = {
  async reply(messages: ConciergeMessage[]) {
    const lastUserMessage = [...messages].reverse().find((message) => message.role === "user");
    return answerConciergeMessage(lastUserMessage?.content ?? "");
  },
};
