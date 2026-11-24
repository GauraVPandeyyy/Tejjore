/**
 * Word-boundary intent matching for the rule-based concierge.
 *
 * Phrases match whole words / whole word sequences only, so "cat" no longer matches
 * "categories", "location" or "vacation", "view" no longer matches "review", "table" no longer
 * matches "comfortable", "mall" no longer matches "small", and "deal" no longer matches "ideal".
 * Punctuation and hyphens are treated as word breaks, so "check-in" and "check in" are equal.
 */

const BRAND_NAMES = ["tejjora lake view", "tejjora lakeview"];

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/**
 * Normalized message for intent matching. The hotel's own name is collapsed to "tejjora" so that
 * words inside the brand ("lake", "view") never trigger the lake-view or other intents.
 */
export function normalizeForIntent(text: string): string[] {
  let joined = ` ${tokenize(text).join(" ")} `;
  for (const brand of BRAND_NAMES) joined = joined.split(` ${brand} `).join(" tejjora ");
  return joined.trim().split(" ").filter(Boolean);
}

function containsSequence(tokens: string[], phrase: string[]) {
  if (!phrase.length || phrase.length > tokens.length) return false;
  outer: for (let index = 0; index <= tokens.length - phrase.length; index += 1) {
    for (let offset = 0; offset < phrase.length; offset += 1) {
      if (tokens[index + offset] !== phrase[offset]) continue outer;
    }
    return true;
  }
  return false;
}

export function matchesAny(tokens: string[], phrases: string[]) {
  return phrases.some((phrase) => containsSequence(tokens, tokenize(phrase)));
}
