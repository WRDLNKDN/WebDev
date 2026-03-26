/** Body text for a forwarded chat message (new message in destination room). */
export function formatForwardedChatText(
  originalContent: string | null,
  authorLabel: string,
): string {
  const raw = (originalContent ?? '').trim();
  const body = raw || '[No text in original message]';
  return `⏩ Forwarded from ${authorLabel}:\n\n${body}`;
}
