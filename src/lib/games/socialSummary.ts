import type {
  GameCompletionResult,
  GameSessionParticipant,
} from '../../types/games';

export type GameProfileSummary = {
  id: string;
  display_name: string | null;
  handle: string | null;
  avatar: string | null;
};

export type GameProfilesById = Record<string, GameProfileSummary>;

type SocialSummaryParticipant = Pick<
  GameSessionParticipant,
  'user_id' | 'turn_order_position'
> & {
  acceptance_state: GameSessionParticipant['acceptance_state'] | string;
};

type SocialSummarySession = {
  result: GameCompletionResult | string | null;
  state_payload?: Record<string, unknown> | null;
  game_definition?: { name?: string | null } | null;
  participants?: SocialSummaryParticipant[] | null;
};

export function getGameName(session: SocialSummarySession): string {
  return (
    (session.game_definition as { name?: string } | undefined)?.name ?? 'Game'
  );
}

export function getProfileLabel(
  userId: string | null | undefined,
  profilesById: GameProfilesById,
  currentUserId?: string | null,
): string {
  if (!userId) return 'Unknown player';
  if (currentUserId && userId === currentUserId) return 'You';
  const profile = profilesById[userId];
  return (
    profile?.display_name ??
    (profile?.handle ? `@${profile.handle}` : null) ??
    `${userId.slice(0, 8)}…`
  );
}

export function getAcceptedParticipants(
  session: SocialSummarySession,
): SocialSummaryParticipant[] {
  return ((session.participants ?? []) as SocialSummaryParticipant[])
    .filter((participant) => participant.acceptance_state === 'accepted')
    .sort(
      (a, b) => (a.turn_order_position ?? 0) - (b.turn_order_position ?? 0),
    );
}

export function getPlayerPosition(
  session: SocialSummarySession,
  userId: string | null | undefined,
): number {
  if (!userId) return -1;
  return getAcceptedParticipants(session).findIndex(
    (participant) => participant.user_id === userId,
  );
}

export function getSessionPeerSummary(
  session: SocialSummarySession,
  currentUserId: string | null | undefined,
  profilesById: GameProfilesById,
): string {
  const peerIds = getAcceptedParticipants(session)
    .map((participant) => participant.user_id)
    .filter((userId) => userId !== currentUserId);
  if (peerIds.length === 0) return 'Solo session';
  if (peerIds.length === 1) {
    return `vs ${getProfileLabel(peerIds[0], profilesById, currentUserId)}`;
  }
  return peerIds
    .map((userId) => getProfileLabel(userId, profilesById, currentUserId))
    .join(', ');
}

export function getWinnerPosition(
  session: SocialSummarySession,
): number | null {
  const payload = session.state_payload as
    | {
        winnerPosition?: unknown;
        winnerTurnPosition?: unknown;
      }
    | undefined;
  const raw =
    typeof payload?.winnerPosition === 'number'
      ? payload.winnerPosition
      : typeof payload?.winnerTurnPosition === 'number'
        ? payload.winnerTurnPosition
        : null;
  return typeof raw === 'number' ? raw : null;
}

export function getResultForUser(
  session: SocialSummarySession,
  userId: string | null | undefined,
): 'win' | 'loss' | 'draw' | null {
  if (!userId) return null;
  const position = getPlayerPosition(session, userId);
  if (position < 0) return null;

  if (session.result === 'draw') return 'draw';

  const winnerPosition = getWinnerPosition(session);
  if (winnerPosition != null) {
    return winnerPosition === position ? 'win' : 'loss';
  }

  if (session.result === 'winner') {
    return position === 0 ? 'win' : null;
  }
  if (session.result === 'loser') {
    return position === 0 ? 'loss' : null;
  }
  return null;
}

export function isCompetitiveMultiplayer(
  session: SocialSummarySession,
): boolean {
  return getAcceptedParticipants(session).length >= 2;
}

export function isTurnBasedStatus(
  result: GameCompletionResult | null,
): boolean {
  return result === 'winner' || result === 'loser' || result === 'draw';
}
