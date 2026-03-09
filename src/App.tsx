import { Box, CircularProgress } from '@mui/material';
import { Suspense, useEffect, useRef } from 'react';
import {
  Navigate,
  type Location as RouterLocation,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { AppOverlayRoutes, AppRouteTree } from './app/routing/AppRouteTree';
import { AvatarProvider } from './context/AvatarContext';
import { FeatureFlagsProvider } from './context/FeatureFlagsContext';
import { JoinProvider } from './context/JoinProvider';
import { useKonamiCode } from './hooks/useKonamiCode';
import { registerAnalyticsSinks } from './lib/analytics/registerAnalyticsSinks';
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

const App = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const backgroundLocation = (
    location.state as { backgroundLocation?: RouterLocation } | null
  )?.backgroundLocation;

  useKonamiCode(() => {
    navigate('/divergence');
  });

  useEffect(() => {
    if (searchParams.get('mode') === 'glitch') {
      navigate('/divergence');
    }
  }, [searchParams, navigate]);

  useEffect(() => {
    const normalizedPath = location.pathname.replace(/\/{2,}/g, '/');
    if (normalizedPath !== location.pathname) {
      navigate(
        {
          pathname: normalizedPath,
          search: location.search,
          hash: location.hash,
        },
        { replace: true },
      );
    }
  }, [location.hash, location.pathname, location.search, navigate]);

  useEffect(() => {
    registerAnalyticsSinks();
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <AuthBoot />

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
    </>
  );
};

export default App;
