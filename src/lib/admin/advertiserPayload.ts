export type AdvertiserLinkItem = { label: string; url: string };

export type AdvertiserFormInput = {
  company_name: string;
  title: string;
  description: string;
  url: string;
  image_url: string;
  links: AdvertiserLinkItem[];
  active: boolean;
  sort_order: number;
};

export function normalizeAdvertiserLinks(
  links: AdvertiserLinkItem[],
): AdvertiserLinkItem[] {
  return links
    .map((l) => ({ label: l.label.trim(), url: l.url.trim() }))
    .filter((l) => l.label || l.url);
}

function buildAdvertiserPayloadBase(form: AdvertiserFormInput) {
  return {
    company_name: form.company_name.trim(),
    title: form.title.trim(),
    description: form.description.trim(),
    url: form.url.trim(),
    image_url: form.image_url.trim() || null,
    links: normalizeAdvertiserLinks(form.links),
    active: form.active,
    sort_order: form.sort_order,
    updated_at: new Date().toISOString(),
  };
}

export function buildAdvertiserInsertPayload(form: AdvertiserFormInput) {
  return {
    ...buildAdvertiserPayloadBase(form),
    logo_url: null,
  };
}

export function buildAdvertiserUpdatePayload(
  form: AdvertiserFormInput,
  existingLogoUrl: string | null,
) {
  return {
    ...buildAdvertiserPayloadBase(form),
    logo_url: existingLogoUrl,
  };
}
