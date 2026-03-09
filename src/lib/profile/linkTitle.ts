import { getShortLinkLabel } from '../utils/linkPlatform';
import type { SocialLink } from '../../types/profile';

export function getLinkTitle(
  link: Pick<SocialLink, 'label' | 'platform' | 'url'>,
): string {
  const title =
    (typeof link.label === 'string' && link.label.trim()) ||
    (typeof link.url === 'string' && getShortLinkLabel(link.url).trim()) ||
    (typeof link.platform === 'string' && link.platform.trim()) ||
    '';
  return title;
}

export function compareLinksByTitle(
  a: Pick<SocialLink, 'label' | 'platform' | 'url'>,
  b: Pick<SocialLink, 'label' | 'platform' | 'url'>,
): number {
  return getLinkTitle(a)
    .toLowerCase()
    .localeCompare(getLinkTitle(b).toLowerCase());
}
