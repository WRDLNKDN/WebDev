import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from '../lib/auth/supabaseClient';
import {
  canonicalizeDmRooms,
  pickCanonicalDmRoom,
} from '../lib/chat/canonicalDm';
import { useAppToast } from '../context/AppToastContext';
import { sanitizeChatRoomPreview } from '../lib/chat/roomPreview';
import { toMessage } from '../lib/utils/errors';
import {
  normalizeChatGroupDescription,
  type ChatGroupDetailsInput,
} from '../lib/chat/groupDetails';
import type { ChatRoom, ChatRoomMember } from '../types/chat';
import type { ChatRoomWithMembers } from './chatTypes';

export type ChatRoomsContextValue = {
  rooms: ChatRoomWithMembers[];
  loading: boolean;
  fetchRooms: (options?: { silent?: boolean }) => Promise<void>;
  removeChat: (targetRoomId: string) => Promise<void>;
  createDm: (otherUserId: string) => Promise<string | null>;
  createGroup: (
    details: ChatGroupDetailsInput,
    memberIds: string[],
  ) => Promise<string | null>;
  toggleFavorite: (roomId: string, isFavorite: boolean) => Promise<void>;
};

const ChatRoomsContext = createContext<ChatRoomsContextValue | null>(null);

async function persistChatRoomFavoriteForMember(
  userId: string,
  roomId: string,
  nextFavorite: boolean,
): Promise<void> {
  // Single upsert on PK (room_id, user_id) avoids update+insert races and empty
  // `.update().select()` rows that some clients treat oddly on first favorite.
  const { error } = await supabase.from('chat_room_preferences').upsert(
    {
      room_id: roomId,
      user_id: userId,
      is_favorite: nextFavorite,
    },
    { onConflict: 'room_id,user_id' },
  );
  if (error) throw error;
}

type ChatBlockRow = { blocker_id: string; blocked_user_id: string };

/** Canonical key for a two-member block pair (order-independent). */
function chatBlockedPairKey(a: string, b: string): string {
  const order = a.localeCompare(b, undefined, {
    sensitivity: 'variant',
    numeric: true,
  });
  return order <= 0 ? `${a}:${b}` : `${b}:${a}`;
}

function buildBlockedPairSet(
  blocks: ChatBlockRow[] | null | undefined,
  sessionUserId: string,
): Set<string> {
  const blockedPair = new Set<string>();
  for (const block of blocks ?? []) {
    const other =
      block.blocker_id === sessionUserId
        ? block.blocked_user_id
        : block.blocker_id;
    blockedPair.add(chatBlockedPairKey(sessionUserId, other));
  }
  return blockedPair;
}

function indexMembersByRoom(
  allMembersData:
    | {
        room_id: string;
        user_id: string;
        role: string;
        joined_at: string;
        left_at: string | null;
      }[]
    | null,
): Map<string, ChatRoomMember[]> {
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
  return membersByRoom;
}

type ChatSummaryRpcRow = {
  room_id: string;
  last_content: string | null;
  last_created_at: string;
  last_is_deleted: boolean;
  unread_count: number;
};

type ChatSummaryNormalized = {
  last_content: string | null;
  last_created_at: string;
  last_is_deleted: boolean;
  unread_count: number;
};

function summaryMapFromRpc(
  summaries: unknown,
): Map<string, ChatSummaryNormalized> {
  return new Map(
    ((summaries ?? []) as ChatSummaryRpcRow[]).map((summary) => [
      summary.room_id,
      {
        last_content: summary.last_content,
        last_created_at: summary.last_created_at,
        last_is_deleted: summary.last_is_deleted,
        unread_count: Number(summary.unread_count ?? 0),
      },
    ]),
  );
}

function applySummariesToRooms(
  withMembers: ChatRoomWithMembers[],
  summaryMap: Map<string, ChatSummaryNormalized>,
): void {
  for (const room of withMembers) {
    const summary = summaryMap.get(room.id);
    if (!summary) continue;
    room.last_message_preview = sanitizeChatRoomPreview(
      summary.last_content,
      summary.last_is_deleted,
    );
    room.last_message_at = summary.last_created_at;
    room.unread_count = summary.unread_count;
  }
}

type ProfileLite = {
  handle: string | null;
  display_name: string | null;
  avatar: string | null;
};

async function fetchProfileMapForUserIds(
  profileIds: string[],
): Promise<Map<string, ProfileLite>> {
  const { data: allProfilesData } =
    profileIds.length > 0
      ? await supabase
          .from('profiles')
          .select('id, handle, display_name, avatar')
          .in('id', profileIds)
      : { data: [] };

  return new Map(
    (allProfilesData ?? []).map((profile) => [
      profile.id,
      {
        handle: profile.handle,
        display_name: profile.display_name,
        avatar: profile.avatar,
      },
    ]),
  );
}

function buildVisibleRoomsWithMembers(
  roomData: ChatRoom[] | null,
  sessionUserId: string,
  membersByRoom: Map<string, ChatRoomMember[]>,
  profileMap: Map<string, ProfileLite>,
  preferenceMap: Map<string, boolean>,
  blockedPair: Set<string>,
): ChatRoomWithMembers[] {
  const withMembers: ChatRoomWithMembers[] = [];
  for (const room of roomData ?? []) {
    const membersData = membersByRoom.get(room.id) ?? [];
    const currentUserIsMember = membersData.some(
      (member) => member.user_id === sessionUserId,
    );
    if (!currentUserIsMember) continue;

    if (room.room_type === 'dm' && membersData.length === 2) {
      const other = membersData.find(
        (member) => member.user_id !== sessionUserId,
      )?.user_id;
      if (other && blockedPair.has(chatBlockedPairKey(sessionUserId, other))) {
        continue;
      }
    }

    const membersWithProfiles = membersData.map((member) => {
      const raw = profileMap.get(member.user_id) ?? null;
      const profile =
        raw == null
          ? null
          : {
              handle: raw.handle ?? '',
              display_name: raw.display_name,
              avatar: raw.avatar,
            };
      return { ...member, profile };
    });

    withMembers.push({
      ...room,
      members: membersWithProfiles,
      is_favorite: preferenceMap.get(room.id) ?? false,
    });
  }
  return withMembers;
}

export const ChatRoomsProvider = ({ children }: { children: ReactNode }) => {
  const value = useChatRoomsState();
  return createElement(ChatRoomsContext.Provider, { value }, children);
};

export function useChatRooms(): ChatRoomsContextValue {
  const ctx = useContext(ChatRoomsContext);
  if (!ctx) {
    throw new Error('useChatRooms must be used within ChatRoomsProvider');
  }
  return ctx;
}

function useChatRoomsState() {
  const { showToast } = useAppToast();
  const [rooms, setRooms] = useState<ChatRoomWithMembers[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCanonicalDmRoomId = useCallback(
    async (currentUserId: string, otherUserId: string) => {
      const { data: candidateMembers, error: memberError } = await supabase
        .from('chat_room_members')
        .select('room_id, user_id, role, joined_at, left_at')
        .in('user_id', [currentUserId, otherUserId]);

      if (memberError) throw memberError;
      if (!candidateMembers?.length) return null;

      const memberRowsByRoom = new Map<string, ChatRoomMember[]>();
      for (const member of candidateMembers) {
        const existing = memberRowsByRoom.get(member.room_id) ?? [];
        existing.push({
          room_id: member.room_id,
          user_id: member.user_id,
          role: member.role === 'admin' ? 'admin' : 'member',
          joined_at: member.joined_at,
          left_at: member.left_at,
        });
        memberRowsByRoom.set(member.room_id, existing);
      }

      const activeSharedRoomIds = Array.from(memberRowsByRoom.entries())
        .filter(([, members]) => {
          const activeMemberIds = new Set(
            members
              .filter((member) => member.left_at === null)
              .map((member) => member.user_id),
          );
          return (
            activeMemberIds.has(currentUserId) &&
            activeMemberIds.has(otherUserId) &&
            activeMemberIds.size === 2
          );
        })
        .map(([roomId]) => roomId);

      if (activeSharedRoomIds.length === 0) return null;

      const { data: roomData, error: roomError } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('room_type', 'dm')
        .in('id', activeSharedRoomIds);

      if (roomError) throw roomError;
      if (!roomData?.length) return null;

      let summaryMap = new Map<
        string,
        {
          last_content: string | null;
          last_created_at: string;
          last_is_deleted: boolean;
          unread_count: number;
        }
      >();

      const { data: summaries, error: summariesError } = await supabase.rpc(
        'chat_room_summaries',
        {
          p_room_ids: roomData.map((room) => room.id),
          p_user_id: currentUserId,
        },
      );
      if (summariesError) {
        console.warn('chat_room_summaries failed:', summariesError.message);
      } else {
        type SummaryRow = {
          room_id: string;
          last_content: string | null;
          last_created_at: string;
          last_is_deleted: boolean;
          unread_count: number;
        };

        summaryMap = new Map(
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
      }

      const candidateRooms: ChatRoomWithMembers[] = (roomData ?? []).map(
        (room) => {
          const summary = summaryMap.get(room.id);
          const members = (memberRowsByRoom.get(room.id) ?? [])
            .filter((member) => member.left_at === null)
            .map((member) => ({
              ...member,
              profile: null,
            }));

          return {
            ...(room as ChatRoom),
            members,
            last_message_preview: summary
              ? sanitizeChatRoomPreview(
                  summary.last_content,
                  summary.last_is_deleted,
                )
              : undefined,
            last_message_at: summary?.last_created_at,
            unread_count: summary?.unread_count,
          };
        },
      );

      return pickCanonicalDmRoom(candidateRooms, currentUserId)?.id ?? null;
    },
    [],
  );

  const fetchRooms = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    if (!silent) setLoading(true);
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

      const [roomsRes, prefsRes, blocksRes, membersRes] = await Promise.all([
        supabase.from('chat_rooms').select('*').in('id', roomIds),
        supabase
          .from('chat_room_preferences')
          .select('room_id, is_favorite')
          .eq('user_id', session.user.id)
          .in('room_id', roomIds),
        supabase
          .from('chat_blocks')
          .select('blocker_id, blocked_user_id')
          .or(
            `blocker_id.eq.${session.user.id},blocked_user_id.eq.${session.user.id}`,
          ),
        supabase
          .from('chat_room_members')
          .select('room_id, user_id, role, joined_at, left_at')
          .in('room_id', roomIds)
          .is('left_at', null),
      ]);

      for (const res of [roomsRes, prefsRes, blocksRes, membersRes]) {
        if (res.error) throw res.error;
      }

      const roomData = roomsRes.data;
      const roomPreferences = prefsRes.data;
      const blocks = blocksRes.data;
      const allMembersData = membersRes.data;

      const blockedPair = buildBlockedPairSet(blocks, session.user.id);
      const membersByRoom = indexMembersByRoom(allMembersData);

      const profileIds = [
        ...new Set(
          (allMembersData ?? [])
            .map((member) => member.user_id)
            .filter(Boolean),
        ),
      ];
      const profileMap = await fetchProfileMapForUserIds(profileIds);

      const preferenceMap = new Map(
        (roomPreferences ?? []).map((preference) => [
          preference.room_id,
          Boolean(preference.is_favorite),
        ]),
      );

      const withMembers = buildVisibleRoomsWithMembers(
        roomData,
        session.user.id,
        membersByRoom,
        profileMap,
        preferenceMap,
        blockedPair,
      );

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
        applySummariesToRooms(withMembers, summaryMapFromRpc(summaries));
      }

      setRooms(canonicalizeDmRooms(withMembers, session.user.id));
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
      showToast({
        message: 'Conversation removed.',
        severity: 'info',
      });
    },
    [fetchRooms, showToast],
  );

  const createDm = useCallback(
    async (otherUserId: string) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return null;

      const existingRoomId = await fetchCanonicalDmRoomId(
        session.user.id,
        otherUserId,
      );
      if (existingRoomId) {
        await fetchRooms();
        showToast({
          message: 'Conversation ready.',
          severity: 'success',
        });
        return existingRoomId;
      }

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

      const canonicalRoomId =
        (await fetchCanonicalDmRoomId(session.user.id, otherUserId)) ?? id;

      await fetchRooms();
      showToast({
        message: 'Conversation started.',
        severity: 'success',
      });
      return canonicalRoomId;
    },
    [fetchCanonicalDmRoomId, fetchRooms, showToast],
  );

  const createGroup = useCallback(
    async (details: ChatGroupDetailsInput, memberIds: string[]) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Sign in to create a group');
      if (memberIds.length >= 100)
        throw new Error('A group can have up to 100 members.');
      const normalizedName = details.name.trim();
      const normalizedDescription = normalizeChatGroupDescription(
        details.description,
      );

      const { data: roomId, error } = await supabase.rpc('chat_create_group', {
        p_name: normalizedName,
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

      if (normalizedDescription || details.imageUrl) {
        const { error: roomUpdateError } = await supabase
          .from('chat_rooms')
          .update({
            description: normalizedDescription,
            image_url: details.imageUrl ?? null,
          })
          .eq('id', id);
        if (roomUpdateError) throw roomUpdateError;
      }

      await fetchRooms();
      showToast({
        message: 'Group created.',
        severity: 'success',
      });
      return id as string;
    },
    [fetchRooms, showToast],
  );

  const toggleFavorite = useCallback(
    async (roomId: string, isFavorite: boolean) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return;
      const nextFavorite = !isFavorite;

      setRooms((prev) =>
        prev.map((room) =>
          room.id === roomId ? { ...room, is_favorite: nextFavorite } : room,
        ),
      );

      try {
        await persistChatRoomFavoriteForMember(
          session.user.id,
          roomId,
          nextFavorite,
        );

        showToast({
          message: nextFavorite
            ? 'Added to favorites.'
            : 'Removed from favorites.',
          severity: nextFavorite ? 'success' : 'info',
        });
      } catch (cause) {
        const pg = cause as {
          code?: string;
          message?: string;
          details?: string;
          hint?: string;
        };
        console.warn('toggleFavorite failed:', {
          roomId,
          intendedFavorite: nextFavorite,
          message: toMessage(cause),
          code: pg.code,
          details: pg.details,
          hint: pg.hint,
        });
        setRooms((prev) =>
          prev.map((room) =>
            room.id === roomId ? { ...room, is_favorite: isFavorite } : room,
          ),
        );
        showToast({
          message: toMessage(cause),
          severity: 'error',
        });
      }
    },
    [showToast],
  );

  return {
    rooms,
    loading,
    fetchRooms,
    removeChat,
    createDm,
    createGroup,
    toggleFavorite,
  };
}
