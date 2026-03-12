import { Box, CircularProgress } from '@mui/material';
import { Suspense, useEffect, useRef } from 'react';
import {
  Navigate,
  type Location as RouterLocation,
  useLocation,
  useParams,
} from 'react-router-dom';

import { AppOverlayRoutes, AppRouteTree } from './app/routing/AppRouteTree';
import { AvatarProvider } from './context/AvatarContext';
import { AppThemeProvider } from './context/AppThemeContext';
import { AppToastProvider } from './context/AppToastContext';
import { FeatureFlagsProvider } from './context/FeatureFlagsContext';
import { JoinProvider } from './context/JoinProvider';
import { supabase } from './lib/auth/supabaseClient';
const Loading = () => (
  <Box
    component="main"
    sx={{ display: 'flex', justifyContent: 'center', py: 10 }}
  >
    <CircularProgress aria-label="Loading application" />
  </Box>
);

const AuthBoot = () => {
  const lastVisibilityRefreshAtRef = useRef(0);

  useEffect(() => {
    void supabase.auth.getSession();
  }, []);

  useEffect(() => {
    const ua = navigator.userAgent || '';
    const isIOS =
      /iP(hone|ad|od)/i.test(ua) ||
      (/Macintosh/i.test(ua) && 'ontouchend' in window);
    const isWebKit = /AppleWebKit/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
    if (!(isIOS && isWebKit)) return;

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        if (now - lastVisibilityRefreshAtRef.current < 60_000) return;
        lastVisibilityRefreshAtRef.current = now;
        void supabase.auth.refreshSession();
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  return null;
};

const RedirectUToProfile = () => {
  const { handle } = useParams<{ handle: string }>();
  return <Navigate to={`/profile/${handle ?? ''}`} replace />;
};

const AppShell = () => {
  const location = useLocation();

  const backgroundLocation = (
    location.state as { backgroundLocation?: RouterLocation } | null
  )?.backgroundLocation;

  return (
    <AppThemeProvider>
      <AuthBoot />

      <AppToastProvider>
        <JoinProvider>
          <AvatarProvider>
            <FeatureFlagsProvider>
              <Suspense fallback={<Loading />}>
                <AppRouteTree
                  redirectUToProfile={<RedirectUToProfile />}
                  routesLocation={backgroundLocation ?? location}
                />
                {backgroundLocation ? <AppOverlayRoutes /> : null}
              </Suspense>
            </FeatureFlagsProvider>
          </AvatarProvider>
        </JoinProvider>
      </AppToastProvider>
    </AppThemeProvider>
  );
};

export default AppShell;
