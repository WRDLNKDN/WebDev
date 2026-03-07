/**
 * Profile URL for a directory member.
 * - Prefer canonical share route: /p/:profile_share_token
 * - Fallback to explicit public lookup hints on /p:
 *   - handle => /p/h~<handle>
 *   - id => /p/i~<id>
 * "~" is not part of base64url share tokens, so marker collision is avoided.
 * This avoids /profile/:handle owner-only 404s for directory results.
 */
export function getProfileLink(member: {
  profile_share_token?: string | null;
  handle?: string | null;
  id: string;
}): string {
  if (member.profile_share_token != null && member.profile_share_token !== '') {
    return `/p/${encodeURIComponent(member.profile_share_token)}`;
  }
  if (member.handle) {
    return `/p/h~${encodeURIComponent(member.handle)}`;
  }
  return `/p/i~${encodeURIComponent(member.id)}`;
}
