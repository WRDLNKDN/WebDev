/**
 * FeatureFlagsContext — reads feature_flags from Supabase; admin can toggle in Admin panel.
 * Use useFeatureFlag(key) to gate nav and routes. Defaults to true while loading so UI does not flash.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { supabase } from '../lib/auth/supabaseClient';
import { COMING_SOON_FLAG } from '../lib/featureFlags/keys';
import { isProduction, isUat, isUatHostname } from '../lib/utils/env';

export type FeatureFlagsMap = Record<string, boolean>;
const DEFAULT_FLAG_VALUES: FeatureFlagsMap = {
  [COMING_SOON_FLAG]: true,
};

export interface FeatureFlagsContextValue {
  flags: FeatureFlagsMap;
  loading: boolean;
  setFlag: (key: string, enabled: boolean) => Promise<void>;
  refetch: () => Promise<void>;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextValue | null>(
  null,
);

export const FeatureFlagsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [flags, setFlags] = useState<FeatureFlagsMap>({});
  const [loading, setLoading] = useState(true);

  const fetchFlags = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('key, enabled');
      if (error) {
        console.warn('[FeatureFlags] fetch error:', error.message);
        setFlags({});
        return;
      }
      const map: FeatureFlagsMap = {};
      for (const row of data ?? []) {
        map[row.key] = row.enabled === true;
      }
      setFlags(map);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchFlags();
  }, [fetchFlags]);

  const setFlag = useCallback(async (key: string, enabled: boolean) => {
    // Upsert ensures missing keys are created (important for newly introduced flags).
    const { data, error } = await supabase
      .from('feature_flags')
      .upsert({ key, enabled }, { onConflict: 'key' })
      .select('key, enabled')
      .single();
    if (error) throw error;
    if (!data) throw new Error('No feature flag row returned after save.');
    setFlags((prev) => ({ ...prev, [data.key]: data.enabled === true }));
  }, []);

  const value: FeatureFlagsContextValue = {
    flags,
    loading,
    setFlag,
    refetch: fetchFlags,
  };

  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  );
};

export function useFeatureFlags(): FeatureFlagsContextValue {
  const ctx = useContext(FeatureFlagsContext);
  if (!ctx) {
    throw new Error('useFeatureFlags must be used within FeatureFlagsProvider');
  }
  return ctx;
}

/**
 * Returns true if the feature is enabled. While loading, most flags default to true (safe for nav).
 * `coming_soon` defaults to ON while loading or if missing from DB; only explicit `enabled: false` turns it off.
 */
export function useFeatureFlag(key: string): boolean {
  const { flags, loading } = useFeatureFlags();
  return getFeatureFlagValue(flags, loading, key);
}

export function getFeatureFlagValue(
  flags: FeatureFlagsMap,
  loading: boolean,
  key: string,
): boolean {
  if (loading) return true;
  const explicitValue = flags[key];
  if (explicitValue !== undefined) return explicitValue === true;
  const defaultValue = DEFAULT_FLAG_VALUES[key];
  if (defaultValue !== undefined) return defaultValue === true;
  return true;
}

/**
 * **Marketing home shell** (video-first hero, matte, same layout as prod “coming soon”):
 * `coming_soon` flag on **UAT or production** builds. Local dev = always off.
 */
export function useMarketingHomeMode(): boolean {
  const flagOn = useFeatureFlag(COMING_SOON_FLAG);
  if (!isProduction && !isUat) {
    return false;
  }
  return flagOn;
}

/**
 * **Production-only** “gates closed”: COMING SOON copy (no Join/Sign-in on home),
 * `/join` blocked, minimal home navbar, no messenger. Same DB flag as
 * {@link useMarketingHomeMode}, but **only on real production** (not UAT).
 *
 * UAT keeps Join/Sign-in everywhere when `VITE_APP_ENV=uat`. If UAT is built with
 * `VITE_APP_ENV=production` (common on Vercel’s “Production” slot), we still treat
 * known UAT hosts as non-prod for these gates (see `isUatHostname`).
 */
export function useProductionComingSoonMode(): boolean {
  const flagOn = useFeatureFlag(COMING_SOON_FLAG);
  if (!flagOn || !isProduction) return false;
  if (isUatHostname()) return false;
  return true;
}
