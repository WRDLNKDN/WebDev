export type FeedAdvertiserLink = { label: string; url: string };

export type FeedAdvertiser = {
  id: string;
  company_name: string;
  title: string;
  description: string;
  url: string;
  logo_url: string | null;
  image_url?: string | null;
  links: unknown;
  active: boolean;
  sort_order: number;
};

export function parseFeedAdvertiserLinks(raw: unknown): FeedAdvertiserLink[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (x): x is { label?: string; url?: string } =>
        x != null && typeof x === 'object',
    )
    .map((x) => ({
      label: String(x.label ?? ''),
      url: String(x.url ?? ''),
    }))
    .filter((x) => x.label || x.url);
}
