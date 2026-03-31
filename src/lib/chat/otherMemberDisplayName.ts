type OtherMemberLike =
  | {
      profile?: {
        display_name?: string | null;
        handle?: string | null;
      } | null;
    }
  | undefined;

/** Label for block / confirm dialogs for the non-self member in a DM. */
export function chatOtherMemberDisplayName(
  otherMember: OtherMemberLike,
): string {
  return (
    otherMember?.profile?.display_name ||
    otherMember?.profile?.handle ||
    'this user'
  );
}
