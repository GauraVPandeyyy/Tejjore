/**
 * Nothing that identifies a guest is sent to the language model (free-tier prompts may be used by
 * the provider). Booking references, e-mail addresses and phone numbers are replaced before any
 * text leaves the server. Booking status never goes through the model at all.
 */
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
// Indian mobiles (with or without +91) and any international number written with a leading "+".
const MOBILE = /(?<![\d-])(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}(?!\d)/g;
const INTERNATIONAL = /\+\d{1,3}[\s-]?\d(?:[\s-]?\d){7,13}(?!\d)/g;
const BOOKING_REFERENCE = /\bTL[VO]-[A-Z0-9]+(?:-[A-Z0-9]+)*\b/gi;

export function redactPii(text: string) {
  return text
    .replace(EMAIL, "[email removed]")
    .replace(BOOKING_REFERENCE, "[reference removed]")
    .replace(INTERNATIONAL, "[number removed]")
    .replace(MOBILE, "[number removed]");
}

export function mentionsBookingReference(text: string) {
  return new RegExp(BOOKING_REFERENCE.source, "i").test(text);
}

/**
 * Attempts to rewrite the assistant's rules, reveal its instructions or make it act outside the
 * hotel's information. Such messages are answered deterministically and never reach the model.
 */
const INJECTION: RegExp[] = [
  /\b(ignore|disregard|forget|override|bypass)\b[^.?!]{0,40}\b(previous|prior|above|earlier|all|any|your|the)\b[^.?!]{0,30}\b(instructions?|rules?|prompts?|guidelines?|restrictions?)\b/i,
  /\b(reveal|show|print|repeat|leak|tell me)\b[^.?!]{0,30}\b(system|hidden|initial|developer)\b[^.?!]{0,15}\b(prompt|instructions?|message)\b/i,
  /\b(system|developer)\s+(prompt|message|mode)\b/i,
  /\byou are now\b|\bnew instructions?\b|\bjailbreak\b|\bdan mode\b|\bact as (?:an?|the)\b|\bpretend (?:to be|you)\b/i,
  /\b(call|run|use|invoke|execute)\b[^.?!]{0,25}\b(tool|function|api|endpoint)\b[^.?!]{0,20}\b(admin|delete|write|update|payment|refund)\b/i,
  /\b(admin|staff|owner)\b[^.?!]{0,20}\b(password|passcode|token|secret|api key)\b/i,
  /\b(api[- ]?key|secret key|database url|env(?:ironment)? variables?)\b/i,
];

export function looksLikePromptInjection(text: string) {
  return INJECTION.some((pattern) => pattern.test(text));
}
