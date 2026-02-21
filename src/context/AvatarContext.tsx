/**
 * AvatarContext — provides current user avatar URL and refresh for reactive updates.
 * Use refresh() after upload, preset selection, or AI Accept.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { DEFAULT_AVATAR_URL } from '../config/avatarPresets';
import { supabase } from '../lib/auth/supabaseClient';

const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ??
  '';

export interface AvatarContextValue {
  avatarUrl: string | null;
  refresh: () => Promise<void>;
  loading: boolean;
}

const AvatarContext = createContext<AvatarContextValue | null>(null);

const getProviderAvatarUrl = (
  session: {
    user?: { user_metadata?: Record<string, unknown> };
  } | null,
): string | null => {
  const metadata = session?.user?.user_metadata;
  if (!metadata || typeof metadata !== 'object') return null;
  const candidates = [metadata.avatar_url, metadata.picture];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }
  return null;
};

const syncGoogleAvatarToProfile = async (userId: string, avatar: string) => {
  try {
    await supabase
      .from('profiles')
      .update({ avatar, use_weirdling_avatar: false })
      .eq('id', userId)
      .is('avatar', null);
  } catch {
    // Best effort: UI fallback still uses provider avatar even if persistence fails.
  }
};

export const AvatarProvider = ({ children }: { children: React.ReactNode }) => {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const providerAvatar = getProviderAvatarUrl(session);
    const fallbackAvatar = providerAvatar ?? DEFAULT_AVATAR_URL ?? null;

    if (!session?.access_token) {
      setAvatarUrl(DEFAULT_AVATAR_URL ?? null);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/me/avatar`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        credentials: 'include',
      });
      const json = (await res.json()) as {
        ok?: boolean;
        data?: { avatarUrl?: string | null };
      };
      if (json?.ok && json.data) {
        const serverAvatar =
          typeof json.data.avatarUrl === 'string' && json.data.avatarUrl.trim()
            ? json.data.avatarUrl.trim()
            : null;

        if (serverAvatar) {
          setAvatarUrl(serverAvatar);
        } else {
          setAvatarUrl(fallbackAvatar);
          if (providerAvatar) {
            void syncGoogleAvatarToProfile(session.user.id, providerAvatar);
          }
        }
      } else {
        setAvatarUrl(fallbackAvatar);
      }
    } catch {
      setAvatarUrl(fallbackAvatar);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      await refresh();
      if (!mounted) return;
      setLoading(false);
    };
    void init();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [refresh]);

  return (
    <AvatarContext.Provider value={{ avatarUrl, refresh, loading }}>
      {children}
    </AvatarContext.Provider>
  );
};

export function useCurrentUserAvatar(): AvatarContextValue {
  const ctx = useContext(AvatarContext);
  if (!ctx) {
    return {
      avatarUrl: null,
      refresh: async () => {},
      loading: false,
    };
  }
  return ctx;
}
