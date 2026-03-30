import { supabase } from '../auth/supabaseClient';

export type EligibleChatConnection = {
  id: string;
  handle: string;
  display_name: string | null;
  avatar: string | null;
  email?: string | null;
};

type RpcRow = {
  id: string;
  handle: string;
  display_name: string | null;
  avatar: string | null;
  email: string | null;
};

/**
 * Profiles the signed-in member may add to a DM or group (mutual feed_connections,
 * approved profile, not blocked). Uses DB RPC so the list matches chat_create_group /
 * RLS invite rules.
 */
export async function loadEligibleChatConnections(
  currentUserId: string,
): Promise<EligibleChatConnection[]> {
  const { data: authData } = await supabase.auth.getSession();
  const signedInUserId = authData?.session?.user?.id;
  if (signedInUserId !== currentUserId) {
    return [];
  }

  const { data, error } = await supabase.rpc(
    'chat_list_eligible_connection_profiles',
  );

  if (error) throw error;

  const rows = (data ?? []) as RpcRow[];
  return rows.map((row) => ({
    id: row.id,
    handle: row.handle,
    display_name: row.display_name,
    avatar: row.avatar,
    email: row.email ?? undefined,
  }));
}
