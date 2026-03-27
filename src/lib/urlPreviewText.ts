export const LINK_PREVIEW_URL_REGEX =
  /https?:\/\/[^\s<>[\]()]+(?:\([^\s)]+\)|[^\s<>[\]()])*/gi;

export function extractUrlsFromText(text: string): string[] {
  if (!text.trim()) return [];
  const seen = new Set<string>();
  const urls: string[] = [];
  let match: RegExpExecArray | null;
  const regex = new RegExp(LINK_PREVIEW_URL_REGEX.source, 'gi');
  while ((match = regex.exec(text)) !== null) {
    const url = match[0];
    if (seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
  }
  return urls;
}

export function getFirstUrlFromText(text: string): string | null {
  return extractUrlsFromText(text)[0] ?? null;
}
