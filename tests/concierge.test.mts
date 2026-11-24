import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import { isolateEnv } from "./setup/env.mts";

// No Gemini: the rule engine must answer correctly on its own and no external call is made.
isolateEnv({ CONCIERGE_LANGUAGE_PROVIDER: "", GEMINI_API_KEY: "" });

const { answerConciergeMessage } = await import("../src/lib/concierge/knowledge");
const { hybridConciergeProvider } = await import("../src/lib/concierge/hybridProvider");
const { matchesAny, normalizeForIntent, tokenize } = await import("../src/lib/concierge/matching");

async function intentOf(message: string) {
  const reply = await hybridConciergeProvider.reply([{ role: "user", content: message }]);
  return reply.intent;
}

describe("word-boundary matching", () => {
  test("whole words only", () => {
    assert.equal(matchesAny(tokenize("Compare the three room categories"), ["cat"]), false);
    assert.equal(matchesAny(tokenize("What is your location?"), ["cat"]), false);
    assert.equal(matchesAny(tokenize("Can I bring my cat?"), ["cat"]), true);
    assert.equal(matchesAny(tokenize("Can I read a review?"), ["view"]), false);
    assert.equal(matchesAny(tokenize("Is the room comfortable?"), ["table"]), false);
    assert.equal(matchesAny(tokenize("Is there a small fridge?"), ["mall"]), false);
    assert.equal(matchesAny(tokenize("What would be ideal?"), ["deal"]), false);
    assert.equal(matchesAny(tokenize("Any training facilities?"), ["train"]), false);
    assert.equal(matchesAny(tokenize("I drive petrol cars"), ["pet"]), false);
  });

  test("hyphens and punctuation are word breaks; phrases match as sequences", () => {
    assert.equal(matchesAny(tokenize("What time is check-in?"), ["check in"]), true);
    assert.equal(matchesAny(tokenize("Is Wi-Fi free?"), ["wi fi"]), true);
    assert.equal(matchesAny(tokenize("lake and view"), ["lake view"]), false);
  });

  test("the hotel's own name never triggers lake/view intents", () => {
    const tokens = normalizeForIntent("How do I get to Tejjora Lake View?");
    assert.equal(matchesAny(tokens, ["lake", "view", "lake view"]), false);
    assert.equal(matchesAny(tokens, ["get to"]), true);
  });
});

describe("concierge intent regressions (baseline failures)", () => {
  const cases: Array<[string, string]> = [
    ["Compare the three room categories.", "room-comparison"],
    ["What is your location?", "location"],
    ["How do I get to Tejjora Lake View?", "location"],
    ["Where is Tejjora Lake View located?", "location"],
    ["Can I bring my cat?", "unconfirmed-policy"],
    ["Do you allow pets?", "unconfirmed-policy"],
    ["Plan a vacation for me", "planner"],
    ["Is breakfast available during my stay?", "breakfast"],
    ["Is there a lake view from the room?", "lake-view"],
    ["Where is the nearest mall?", "nearby-shopping"],
    ["Do you have a restaurant table?", "restaurant"],
    ["What time is check-in?", "unconfirmed-policy"],
  ];
  for (const [message, expected] of cases) {
    test(`"${message}" → ${expected}`, async () => {
      assert.equal(await intentOf(message), expected);
    });
  }

  const mustNot: Array<[string, string]> = [
    ["Is there a small fridge?", "nearby-shopping"],
    ["Is the room comfortable?", "restaurant"],
    ["What would be ideal for a family?", "rates"],
    ["Can I read a review?", "lake-view"],
    ["Do you have training facilities?", "railway"],
    ["I am dedicated to petrol cars", "unconfirmed-policy"],
    ["Plan a vacation for me", "unconfirmed-policy"],
    ["How much is airport pickup for my stay?", "live-rates"],
  ];
  for (const [message, wrong] of mustNot) {
    test(`"${message}" is not answered as ${wrong}`, async () => {
      assert.notEqual(await intentOf(message), wrong);
    });
  }

  test("rule-based provider path uses the same matching", () => {
    assert.equal(answerConciergeMessage("What is your location?").intent, "location");
    assert.equal(answerConciergeMessage("Compare the three room categories.").intent !== "unconfirmed-policy", true);
  });
});
