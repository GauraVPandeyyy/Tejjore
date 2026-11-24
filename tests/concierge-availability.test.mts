import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import { isolateEnv } from "./setup/env.mts";

isolateEnv({ CONCIERGE_LANGUAGE_PROVIDER: "", GEMINI_API_KEY: "" });
const { hybridConciergeProvider } = await import("../src/lib/concierge/hybridProvider");

const day = (offset: number) => new Date(Date.now() + offset * 864e5).toISOString().slice(0, 10);
const [from, to] = [day(40), day(42)];
const intentOf = async (message: string) => (await hybridConciergeProvider.reply([{ role: "user", content: message }])).intent;

describe("availability questions in everyday words", () => {
  const asked = [
    `Is a room free from ${from} to ${to}?`,
    `Do you have a room from ${from} to ${to}?`,
    `Any rooms open ${from} to ${to}`,
    `Can I book a room ${from} to ${to}`,
    `Is there a room available ${from} to ${to}?`,
    `Is the Premium Room free ${from} to ${to}?`,
  ];
  for (const message of asked) {
    test(`"${message}" is answered from the booking system`, async () => {
      assert.match(await intentOf(message), /availability/);
    });
  }

  const notAvailability = [
    "Is breakfast free?",
    "Is Wi-Fi free?",
    "Is parking free for guests?",
    `What is on the menu on ${from}?`,
  ];
  for (const message of notAvailability) {
    test(`"${message}" is not mistaken for room availability`, async () => {
      assert.doesNotMatch(await intentOf(message), /availability/);
    });
  }
});
