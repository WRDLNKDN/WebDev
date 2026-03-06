/**
 * Profile URL for a directory member. Uses /p/:token when profile_share_token is set (avoids 404);
 * otherwise /profile/:handle or /profile/:id. Pure function for easy unit testing.
 */
export function getProfileLink(member: {
  profile_share_token?: string | null;
  handle?: string | null;
  id: string;
}): string {
  if (member.profile_share_token != null && member.profile_share_token !== '') {
    return `/p/${member.profile_share_token}`;
  }
  if (member.handle) {
    return `/profile/${member.handle}`;
  }
  return `/profile/${member.id}`;
}
