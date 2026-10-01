export const conciergeQuickPrompts = [
  { id: "rates", label: "Current room rates", prompt: "What are the current room rates?" },
  { id: "availability", label: "Check availability", prompt: "I want to check room availability." },
  { id: "compare", label: "Compare rooms", prompt: "Compare the three room categories." },
  { id: "breakfast", label: "Breakfast", prompt: "What breakfast is available?" },
  { id: "location", label: "Getting here", prompt: "How do I get to Tejjora Lake View?" },
  { id: "tour", label: "Virtual tour", prompt: "Can I see the hotel virtually?" },
] as const;

export const conciergeGuardrailCopy =
  "Rates and availability are read from the current website inventory when possible. Unconfigured hotel policies or facilities are never guessed.";
