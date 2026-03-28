/**
 * Hook for Game Session Framework: definitions, my sessions, pending invites, connections for invite.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/auth/supabaseClient';
import {
  fetchGameDefinitions,
  fetchMySessions,
  fetchPendingInvitationsForUser,
} from '../lib/api/gamesApi';
import type {
  GameDefinition,
  GameSession,
  GameInvitation,
} from '../types/games';

export type ConnectionForInvite = {
  id: string;
  display_name: string | null;
  handle: string | null;
  avatar: string | null;
};

export type GamePlayerProfile = {
  id: string;
  display_name: string | null;
  handle: string | null;
  avatar: string | null;
};

export function useGameSessions() {
  const [definitions, setDefinitions] = useState<GameDefinition[]>([]);
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<
    GameInvitation[]
  >([]);
  const [connections, setConnections] = useState<ConnectionForInvite[]>([]);
  const [profilesById, setProfilesById] = useState<
    Record<string, GamePlayerProfile>
  >({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    setCurrentUserId(userId ?? null);
    if (!userId) {
      setDefinitions([]);
      setSessions([]);
      setPendingInvitations([]);
      setConnections([]);
      setProfilesById({});
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [defs, sess, invs] = await Promise.all([
        fetchGameDefinitions(),
        fetchMySessions(),
        fetchPendingInvitationsForUser(userId),
      ]);
      setDefinitions(defs);
      setSessions(sess);
      setPendingInvitations(invs);

      const profileIds = new Set<string>();
      sess.forEach((gameSession) => {
        (gameSession.participants ?? []).forEach((participant) => {
          if (participant.user_id) profileIds.add(participant.user_id);
        });
        (gameSession.invitations ?? []).forEach((invitation) => {
          if (invitation.sender_id) profileIds.add(invitation.sender_id);
          if (invitation.recipient_id) profileIds.add(invitation.recipient_id);
        });
        if (gameSession.created_by) profileIds.add(gameSession.created_by);
      });
      invs.forEach((invitation) => {
        if (invitation.sender_id) profileIds.add(invitation.sender_id);
        if (invitation.recipient_id) profileIds.add(invitation.recipient_id);
      });

      const { data: connRows } = await supabase
        .from('feed_connections')
        .select('connected_user_id')
        .eq('user_id', userId);
      const connIds = (connRows ?? []).map((r) => r.connected_user_id);
      if (connIds.length === 0) {
        setConnections([]);
      } else {
        const { data: mutual } = await supabase
          .from('feed_connections')
          .select('user_id')
          .eq('connected_user_id', userId)
          .in('user_id', connIds);
        const mutualSet = new Set((mutual ?? []).map((m) => m.user_id));
        const eligibleIds = connIds.filter((id) => mutualSet.has(id));
        if (eligibleIds.length === 0) {
          setConnections([]);
        } else {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, display_name, handle, avatar')
            .in('id', eligibleIds);
          (profiles ?? []).forEach((profile) => {
            if (profile.id) profileIds.add(profile.id);
          });
          setConnections(
            (profiles ?? []).map((p) => ({
              id: p.id,
              display_name: p.display_name ?? null,
              handle: p.handle ?? null,
              avatar: p.avatar ?? null,
            })),
          );
        }
      }

      if (profileIds.size > 0) {
        const { data: profileRows } = await supabase
          .from('profiles')
          .select('id, display_name, handle, avatar')
          .in('id', [...profileIds]);
        setProfilesById(
          Object.fromEntries(
            (profileRows ?? []).map((profile) => [
              profile.id,
              {
                id: profile.id,
                display_name: profile.display_name ?? null,
                handle: profile.handle ?? null,
                avatar: profile.avatar ?? null,
              },
            ]),
          ),
        );
      } else {
        setProfilesById({});
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load games');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!currentUserId) return;
    let active = true;
    const refreshFromRealtime = () => {
      if (!active) return;
      void refresh();
    };
    const channel = supabase
      .channel(`games-dashboard-${currentUserId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_sessions' },
        refreshFromRealtime,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_invitations' },
        refreshFromRealtime,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_session_participants' },
        refreshFromRealtime,
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [currentUserId, refresh]);

  const waitingOnYou = sessions.filter((s) => s.status === 'waiting_your_move');
  const waitingOnOthers = sessions.filter(
    (s) =>
      s.status === 'waiting_opponent_move' ||
      s.status === 'active' ||
      s.status === 'waiting_players',
  );
  const activeSolo = sessions.filter(
    (s) =>
      (s.status === 'active' || s.status === 'waiting_your_move') &&
      (s.participants?.length ?? 0) <= 1,
  );
  const completed = sessions.filter((s) => s.status === 'completed');
  const sessionsById = useMemo(
    () => Object.fromEntries(sessions.map((session) => [session.id, session])),
    [sessions],
  );

  return {
    currentUserId,
    definitions,
    sessions,
    sessionsById,
    pendingInvitations,
    connections,
    profilesById,
    waitingOnYou,
    waitingOnOthers,
    activeSolo,
    completed,
    loading,
    error,
    refresh,
  };
}
