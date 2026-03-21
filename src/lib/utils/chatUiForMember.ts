/**
 * Chat-related nav, share targets, and messenger shell only when the `chat` feature
 * is on **and** a Member is signed in. Use everywhere we gate UI (routes still use
 * `RequireOnboarded`).
 */
export function chatUiForMember(
  chatFeatureEnabled: boolean,
  memberId: string | undefined | null,
): boolean {
  return Boolean(chatFeatureEnabled && memberId);
}
