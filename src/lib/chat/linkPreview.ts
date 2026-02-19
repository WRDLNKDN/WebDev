import { supabase } from '../auth/supabaseClient';

const URL_REGEX = /https?:\/\/[^\s<>[\]()]+(?:\([^\s)]*\)|[^\s<>[\]()]*)?/i;

export type ChatLinkPreview = {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
};

export function getFirstUrlFromText(text: string): string | null {
  const m = text.match(URL_REGEX);
  return m ? m[0] : null;
}

async function getAccessToken(forceRefresh = false): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.access_token && !forceRefresh) return session.access_token;
  const { data } = await supabase.auth.refreshSession();
  return data.session?.access_token ?? null;
}

export async function fetchChatLinkPreview(
  rawUrl: string,
): Promise<ChatLinkPreview | null> {
  const token = await getAccessToken();
  if (!token) return null;

  const endpoint = `/api/link-preview?url=${encodeURIComponent(rawUrl)}`;
  const first = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${token}` },
    credentials: 'include',
  });

  let res = first;
  if (first.status === 401) {
    const refreshed = await getAccessToken(true);
    if (refreshed) {
      res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${refreshed}` },
        credentials: 'include',
      });
    }
  }
  if (!res.ok) return null;
  const json = (await res.json()) as { data?: ChatLinkPreview | null };
  return json.data ?? null;
}
