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

export const AvatarProvider = ({ children }: { children: React.ReactNode }) => {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setAvatarUrl(null);
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
        setAvatarUrl(json.data.avatarUrl ?? null);
      } else {
        setAvatarUrl(null);
      }
    } catch {
      setAvatarUrl(null);
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
