import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/auth/supabaseClient';
import { sanitizeChatRoomPreview } from '../lib/chat/roomPreview';
import { toMessage } from '../lib/utils/errors';
import type { ChatRoom, ChatRoomMember } from '../types/chat';
import type { ChatRoomWithMembers } from './chatTypes';

export function useChatRooms() {
  const [rooms, setRooms] = useState<ChatRoomWithMembers[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        setRooms([]);
        return;
      }

      const { data: memberRows } = await supabase
        .from('chat_room_members')
        .select('room_id')
        .eq('user_id', session.user.id)
        .is('left_at', null);

      if (!memberRows?.length) {
        setRooms([]);
        return;
      }

      const roomIds = [...new Set(memberRows.map((row) => row.room_id))];

      const { data: roomData } = await supabase
        .from('chat_rooms')
        .select('*')
        .in('id', roomIds);

      const { data: blocks } = await supabase
        .from('chat_blocks')
        .select('blocker_id, blocked_user_id')
        .or(
          `blocker_id.eq.${session.user.id},blocked_user_id.eq.${session.user.id}`,
        );

      const blockedPair = new Set<string>();
      (blocks ?? []).forEach((block) => {
        const other =
          block.blocker_id === session.user.id
            ? block.blocked_user_id
            : block.blocker_id;
        blockedPair.add([session.user.id, other].sort().join(':'));
      });

      const { data: allMembersData } = await supabase
        .from('chat_room_members')
        .select('room_id, user_id, role, joined_at, left_at')
        .in('room_id', roomIds)
        .is('left_at', null);

      const membersByRoom = new Map<string, ChatRoomMember[]>();
      for (const member of allMembersData ?? []) {
        const normalized: ChatRoomMember = {
          room_id: member.room_id,
          user_id: member.user_id,
          role: member.role === 'admin' ? 'admin' : 'member',
          joined_at: member.joined_at,
          left_at: member.left_at,
        };
        const existing = membersByRoom.get(member.room_id) ?? [];
        existing.push(normalized);
        membersByRoom.set(member.room_id, existing);
      }

      const profileIds = [
        ...new Set(
          (allMembersData ?? [])
            .map((member) => member.user_id)
            .filter(Boolean),
        ),
      ];
      const { data: allProfilesData } =
        profileIds.length > 0
          ? await supabase
              .from('profiles')
              .select('id, handle, display_name, avatar')
              .in('id', profileIds)
          : { data: [] };

      const profileMap = new Map(
        (allProfilesData ?? []).map((profile) => [
          profile.id,
          {
            handle: profile.handle,
            display_name: profile.display_name,
            avatar: profile.avatar,
          },
        ]),
      );

      const withMembers: ChatRoomWithMembers[] = [];
      for (const room of roomData ?? []) {
        const membersData = membersByRoom.get(room.id) ?? [];
        const currentUserIsMember = membersData.some(
          (member) => member.user_id === session.user.id,
        );
        if (!currentUserIsMember) {
          continue;
        }
        if (room.room_type === 'dm' && membersData.length === 2) {
          const other = membersData.find(
            (member) => member.user_id !== session.user.id,
          )?.user_id;
          if (
            other &&
            blockedPair.has([session.user.id, other].sort().join(':'))
          ) {
            continue;
          }
        }

        withMembers.push({
          ...(room as ChatRoom),
          members: membersData.map((member) => ({
            ...member,
            profile: profileMap.get(member.user_id) ?? null,
          })) as ChatRoomWithMembers['members'],
        });
      }

      if (withMembers.length > 0) {
        const { data: summaries, error: summariesError } = await supabase.rpc(
          'chat_room_summaries',
          {
            p_room_ids: withMembers.map((room) => room.id),
            p_user_id: session.user.id,
          },
        );
        if (summariesError) {
          console.warn('chat_room_summaries failed:', summariesError.message);
        }

        type SummaryRow = {
          room_id: string;
          last_content: string | null;
          last_created_at: string;
          last_is_deleted: boolean;
          unread_count: number;
        };

        const summaryMap = new Map(
          ((summaries ?? []) as SummaryRow[]).map((summary) => [
            summary.room_id,
            {
              last_content: summary.last_content,
              last_created_at: summary.last_created_at,
              last_is_deleted: summary.last_is_deleted,
              unread_count: Number(summary.unread_count ?? 0),
            },
          ]),
        );

        withMembers.forEach((room) => {
          const summary = summaryMap.get(room.id);
          if (!summary) return;
          room.last_message_preview = sanitizeChatRoomPreview(
            summary.last_content,
            summary.last_is_deleted,
          );
          room.last_message_at = summary.last_created_at;
          room.unread_count = summary.unread_count;
        });
      }

      setRooms(withMembers);
    } catch (cause) {
      console.warn('fetchRooms failed:', toMessage(cause));
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRooms();
  }, [fetchRooms]);

  const removeChat = useCallback(
    async (targetRoomId: string) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return;
      await supabase
        .from('chat_room_members')
        .update({ left_at: new Date().toISOString() })
        .eq('room_id', targetRoomId)
        .eq('user_id', session.user.id);
      await fetchRooms();
    },
    [fetchRooms],
  );

  const createDm = useCallback(
    async (otherUserId: string) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return null;

      const { data: roomId, error } = await supabase.rpc('chat_create_dm', {
        p_other_user_id: otherUserId,
      });
      if (error) throw error;

      const raw = roomId as string | string[] | null;
      const id =
        typeof raw === 'string'
          ? raw
          : Array.isArray(raw) && raw.length > 0
            ? raw[0]
            : null;
      if (!id) return null;

      await fetchRooms();
      return id;
    },
    [fetchRooms],
  );

  const createGroup = useCallback(
    async (name: string, memberIds: string[]) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Sign in to create a group');
      if (memberIds.length >= 100)
        throw new Error('A group can have up to 100 members.');

      const { data: roomId, error } = await supabase.rpc('chat_create_group', {
        p_name: name.trim(),
        p_member_ids: memberIds.length > 0 ? memberIds : [],
      });

      if (error) {
        const isStaleSession =
          error.code === '23503' ||
          String(error.message || '').includes('created_by_fkey');
        throw new Error(
          isStaleSession
            ? 'Your session may be stale. Sign out and sign in again, then try creating the group.'
            : toMessage(error),
        );
      }

      const raw: unknown = roomId;
      const id =
        typeof raw === 'string'
          ? raw
          : Array.isArray(raw) && raw.length > 0
            ? raw[0]
            : null;
      if (!id) return null;

      await fetchRooms();
      return id as string;
    },
    [fetchRooms],
  );

  return {
    rooms,
    loading,
    fetchRooms,
    removeChat,
    createDm,
    createGroup,
  };
}
