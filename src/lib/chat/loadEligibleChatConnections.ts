import { supabase } from '../auth/supabaseClient';

export type EligibleChatConnection = {
  id: string;
  handle: string;
  display_name: string | null;
  avatar: string | null;
  email?: string | null;
};

export async function loadEligibleChatConnections(
  currentUserId: string,
): Promise<EligibleChatConnection[]> {
  const { data: myConns, error: connErr } = await supabase
    .from('feed_connections')
    .select('connected_user_id')
    .eq('user_id', currentUserId);

  if (connErr) throw connErr;

  const connIds = (myConns ?? []).map(
    (connection) => connection.connected_user_id,
  );
  if (connIds.length === 0) return [];

  const { data: mutualConns, error: mutualErr } = await supabase
    .from('feed_connections')
    .select('user_id')
    .eq('connected_user_id', currentUserId)
    .in('user_id', connIds);

  if (mutualErr) throw mutualErr;

  const mutualIds = new Set(
    (mutualConns ?? []).map((connection) => connection.user_id),
  );

  const { data: blocks, error: blocksErr } = await supabase
    .from('chat_blocks')
    .select('blocker_id, blocked_user_id')
    .or(`blocker_id.eq.${currentUserId},blocked_user_id.eq.${currentUserId}`);

  if (blocksErr) throw blocksErr;

  const blockedSet = new Set<string>();
  (blocks ?? []).forEach((block) => {
    if (block.blocker_id === currentUserId)
      blockedSet.add(block.blocked_user_id);
    else blockedSet.add(block.blocker_id);
  });

  const allowedIds = Array.from(mutualIds).filter((id) => !blockedSet.has(id));
  if (allowedIds.length === 0) return [];

  const { data: profileData, error: profileErr } = await supabase
    .from('profiles')
    .select('id, handle, display_name, avatar, email')
    .in('id', allowedIds)
    .eq('status', 'approved');

  if (profileErr) throw profileErr;

  return (profileData ?? []) as EligibleChatConnection[];
}
