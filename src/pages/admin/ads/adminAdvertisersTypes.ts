import type { FeedAdvertiser } from '../../../components/feed/ad/feedAdTypes';

export type AdvertiserRow = FeedAdvertiser & {
  created_at: string;
  updated_at: string;
};

export type AdEventRow = {
  advertiser_id: string;
  event_name: 'feed_ad_impression' | 'feed_ad_click';
};

export type AdStats = {
  impressions: number;
  clicks: number;
};

export type MetricsWindowDays = 7 | 30 | 90;

export type LinkItem = { label: string; url: string };

export type FormState = {
  company_name: string;
  title: string;
  description: string;
  url: string;
  image_url: string;
  links: LinkItem[];
  active: boolean;
  sort_order: number;
};

export const ADVERTISERS_UPDATED_EVENT_KEY = 'feed_advertisers_updated_at';
export const MAX_LINKS = 4;

export const emptyForm: FormState = {
  company_name: '',
  title: '',
  description: '',
  url: '',
  image_url: '',
  links: [],
  active: true,
  sort_order: 0,
};

const parseLinks = (raw: unknown): LinkItem[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (item: unknown): item is { label?: string; url?: string } =>
        item != null && typeof item === 'object',
    )
    .map((item) => ({
      label: String(item.label ?? '').trim(),
      url: String(item.url ?? '').trim(),
    }))
    .filter((item) => item.label || item.url);
};

export const formFromRow = (row: AdvertiserRow | null): FormState => {
  if (!row) return emptyForm;
  return {
    company_name: row.company_name,
    title: row.title,
    description: row.description,
    url: row.url,
    image_url: (row as AdvertiserRow & { image_url?: string }).image_url ?? '',
    links: parseLinks(row.links),
    active: row.active,
    sort_order: row.sort_order,
  };
};

export const getCtr = (stats?: AdStats) => {
  const impressions = stats?.impressions ?? 0;
  const clicks = stats?.clicks ?? 0;
  if (impressions <= 0) return '0.00%';
  return `${((clicks / impressions) * 100).toFixed(2)}%`;
};

export const buildAdStats = (events: AdEventRow[]) => {
  const stats: Record<string, AdStats> = {};
  for (const event of events) {
    const current = stats[event.advertiser_id] ?? { impressions: 0, clicks: 0 };
    if (event.event_name === 'feed_ad_impression') current.impressions += 1;
    if (event.event_name === 'feed_ad_click') current.clicks += 1;
    stats[event.advertiser_id] = current;
  }
  return stats;
};
