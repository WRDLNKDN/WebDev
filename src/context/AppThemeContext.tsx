import { ThemeProvider } from '@mui/material';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from '../lib/auth/supabaseClient';
import { toMessage } from '../lib/utils/errors';
import { createAppTheme } from '../theme/theme';
import { THEME_PRESETS, type AppThemeId } from '../theme/themeConstants';

const STORAGE_KEY = 'wrdlnkdn:app-theme';
const DEFAULT_THEME_ID: AppThemeId = 'ocean';

function isAppThemeId(value: unknown): value is AppThemeId {
  return typeof value === 'string' && value in THEME_PRESETS;
}

function readStoredThemeId(): AppThemeId {
  if (typeof window === 'undefined') return DEFAULT_THEME_ID;
  const value = window.localStorage.getItem(STORAGE_KEY);
  return isAppThemeId(value) ? value : DEFAULT_THEME_ID;
}

function writeStoredThemeId(themeId: AppThemeId) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, themeId);
}

type AppThemeContextValue = {
  themeId: AppThemeId;
  setThemePreference: (themeId: AppThemeId) => Promise<void>;
  themeOptions: typeof THEME_PRESETS;
  isSaving: boolean;
  error: string | null;
  clearError: () => void;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

async function fetchProfileThemePreference(): Promise<AppThemeId | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('nerd_creds')
    .eq('id', session.user.id)
    .maybeSingle();
  if (error) throw error;

  const nerdCreds =
    data?.nerd_creds && typeof data.nerd_creds === 'object'
      ? (data.nerd_creds as Record<string, unknown>)
      : {};
  const themeId = nerdCreds.app_theme;
  return isAppThemeId(themeId) ? themeId : null;
}

async function persistThemePreference(themeId: AppThemeId) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return;

  const { data, error: loadError } = await supabase
    .from('profiles')
    .select('nerd_creds')
    .eq('id', session.user.id)
    .maybeSingle();
  if (loadError) throw loadError;

  const currentCreds =
    data?.nerd_creds && typeof data.nerd_creds === 'object'
      ? (data.nerd_creds as Record<string, unknown>)
      : {};

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      nerd_creds: {
        ...currentCreds,
        app_theme: themeId,
      },
    })
    .eq('id', session.user.id);
  if (updateError) throw updateError;
}

export const AppThemeProvider = ({ children }: { children: ReactNode }) => {
  const [themeId, setThemeId] = useState<AppThemeId>(readStoredThemeId);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    writeStoredThemeId(themeId);
  }, [themeId]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const persistedThemeId = await fetchProfileThemePreference();
        if (!active || !persistedThemeId) return;
        setThemeId(persistedThemeId);
      } catch (cause) {
        if (!active) return;
        setError(toMessage(cause));
      }
    };

    void load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) return;
      void load();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const setThemePreference = useCallback(
    async (nextThemeId: AppThemeId) => {
      const previousThemeId = themeId;
      setThemeId(nextThemeId);
      setError(null);
      setIsSaving(true);
      try {
        await persistThemePreference(nextThemeId);
      } catch (cause) {
        setThemeId(previousThemeId);
        setError(toMessage(cause));
        throw cause;
      } finally {
        setIsSaving(false);
      }
    },
    [themeId],
  );

  const muiTheme = useMemo(() => createAppTheme(themeId), [themeId]);
  const value = useMemo<AppThemeContextValue>(
    () => ({
      themeId,
      setThemePreference,
      themeOptions: THEME_PRESETS,
      isSaving,
      error,
      clearError: () => setError(null),
    }),
    [error, isSaving, setThemePreference, themeId],
  );

  return (
    <AppThemeContext.Provider value={value}>
      <ThemeProvider theme={muiTheme}>{children}</ThemeProvider>
    </AppThemeContext.Provider>
  );
};

export const useAppTheme = () => {
  const context = useContext(AppThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within AppThemeProvider');
  }
  return context;
};
