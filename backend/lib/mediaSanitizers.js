export function asPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : {};
}

export function cleanText(value, max = 500) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export function cleanNullableText(value, max = 500) {
  const cleaned = cleanText(value, max);
  return cleaned || null;
}

export function cleanUrl(
  value,
  { maxLength = 2048, protocols = ['http:', 'https:'] } = {},
) {
  const candidate = cleanNullableText(value, maxLength);
  if (!candidate) return null;

  try {
    const parsed = new URL(candidate);
    if (
      Array.isArray(protocols) &&
      protocols.length > 0 &&
      !protocols.includes(parsed.protocol)
    ) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function sanitizeJsonValueInternal(value, options, depth) {
  if (depth > options.maxDepth) return null;
  if (value == null) return null;
  if (typeof value === 'string') {
    return value.trim().slice(0, options.maxStringLength);
  }
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'boolean') return value;
  if (Array.isArray(value)) {
    return value
      .slice(0, options.maxEntries)
      .map((entry) => sanitizeJsonValueInternal(entry, options, depth + 1))
      .filter((entry) => entry != null);
  }
  if (typeof value !== 'object') return null;

  return Object.fromEntries(
    Object.entries(value)
      .slice(0, options.maxEntries)
      .map(([key, entry]) => [
        key.slice(0, options.maxKeyLength),
        sanitizeJsonValueInternal(entry, options, depth + 1),
      ])
      .filter(([, entry]) => entry != null),
  );
}

export function sanitizeJsonValue(
  value,
  {
    maxDepth = 4,
    maxEntries = 40,
    maxStringLength = 2000,
    maxKeyLength = 80,
  } = {},
) {
  return sanitizeJsonValueInternal(
    value,
    {
      maxDepth,
      maxEntries,
      maxStringLength,
      maxKeyLength,
    },
    0,
  );
}

export function cleanStringArray(
  value,
  { maxEntries = 20, maxLength = 240 } = {},
) {
  const items = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? [value]
      : [];

  return items
    .slice(0, maxEntries)
    .map((entry) => cleanNullableText(entry, maxLength))
    .filter((entry) => entry != null);
}
