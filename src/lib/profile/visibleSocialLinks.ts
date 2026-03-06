/**
 * Shared logic for "show links in Identity": when profile has at least one visible social link,
 * we render ProfileLinksWidget in Identity (slotLeftOfAvatar), not in Portfolio.
 */

type SocialLike = { isVisible?: boolean };

function toSocialsArray(socials: unknown): SocialLike[] {
  if (Array.isArray(socials)) return socials as SocialLike[];
  if (socials && typeof socials === 'object')
    return Object.values(socials as Record<string, SocialLike>);
  return [];
}

/**
 * True when the profile has at least one social link with isVisible.
 * Used to decide whether to pass slotLeftOfAvatar (links in Identity) on Profile pages.
 */
export function hasVisibleSocialLinks(socials: unknown): boolean {
  const list = toSocialsArray(socials);
  return list.some((l) => l?.isVisible);
}
