const CHAT_REACTION_ONLY_LINE_RE =
  /^(?=.*[\p{Extended_Pictographic}])(?:[\p{Extended_Pictographic}\uFE0F\u200D]+(?:\s*\d+)?|[xX]\d+|[·•,:;()+-]|\s)+$/u;

export const sanitizeChatRoomPreview = (
  content: string | null,
  isDeleted: boolean,
  maxLength = 45,
) => {
  if (isDeleted) return 'Message deleted';
  if (!content?.trim()) return '—';

  const normalized = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !CHAT_REACTION_ONLY_LINE_RE.test(line))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) return '—';

  return normalized.length <= maxLength
    ? normalized
    : `${normalized.slice(0, maxLength)}…`;
};
