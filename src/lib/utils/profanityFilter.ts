const PROFANITY_PATTERNS = [
  /\bfuck(?:er|ing|ed|s)?\b/i,
  /\bshit(?:ty|ting|ted|s)?\b/i,
  /\bbitch(?:es|y)?\b/i,
  /\basshole\b/i,
  /\bbastard\b/i,
] as const;

export function containsProfanity(value: string): boolean {
  const normalized = value.trim();
  if (!normalized) return false;
  return PROFANITY_PATTERNS.some((pattern) => pattern.test(normalized));
}
