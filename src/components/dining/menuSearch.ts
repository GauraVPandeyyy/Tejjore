/**
 * Forgiving menu search: diacritic-insensitive, and tolerant of the usual romanisation variants
 * ("panir" finds "Paneer", "chilly" finds "Chilli") plus one typo in longer words.
 */
export function simplify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/ee/g, "i")
    .replace(/oo/g, "u")
    .replace(/aa/g, "a")
    .replace(/ph/g, "f")
    .replace(/w/g, "v")
    .replace(/y\b/g, "i")
    .replace(/([a-z])\1+/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function withinOneEdit(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i += 1;
      j += 1;
      continue;
    }
    edits += 1;
    if (edits > 1) return false;
    if (a.length > b.length) i += 1;
    else if (b.length > a.length) j += 1;
    else {
      i += 1;
      j += 1;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

/** True when every query word appears in the text (substring, or one edit away for words of 5+ letters). */
export function matchesQuery(text: string, query: string) {
  const words = simplify(text).split(" ");
  const haystack = words.join(" ");
  return simplify(query)
    .split(" ")
    .filter(Boolean)
    .every((token) => haystack.includes(token) || (token.length >= 5 && words.some((word) => withinOneEdit(word, token))));
}
