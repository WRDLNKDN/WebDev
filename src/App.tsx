import { Suspense, lazy, useEffect } from 'react';
import {
  Navigate,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';

import { useKonamiCode } from './hooks/useKonamiCode';
import { registerAnalyticsSinks } from './lib/analytics/registerAnalyticsSinks';
const AppShell = lazy(async () => import('./AppShell'));
const PublicHomeSurface = lazy(async () => {
  const m = await import('./app/PublicHomeSurface');
  return { default: m.PublicHomeSurface };
});

const Loading = () => (
  <main
    data-testid="app-main"
    style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '4rem 1rem',
      background: '#121212',
      color: '#ffffff',
    }}
  >
    <div
      aria-label="Loading application"
      style={{ fontSize: '1rem', fontWeight: 600, letterSpacing: '0.02em' }}
    >
      Loading…
    </div>
  </main>
);

const App = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // --- SYSTEM SECRET: KONAMI CODE LISTENER ---
  useKonamiCode(() => {
    console.log('🎮 KONAMI CODE DETECTED: ACTIVATING DIVERGENCE PROTOCOL');
    navigate('/divergence');
  });

  // --- SYSTEM SECRET: QUERY STRING LISTENER ---
  // Usage: http://localhost:5173/?mode=glitch
  useEffect(() => {
    if (searchParams.get('mode') === 'glitch') {
      navigate('/divergence');
    }
  }, [searchParams, navigate]);

  // Normalize accidental repeated slashes in the URL path (e.g. //dashboard//settings).
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
  }, []);

  // Android UAT: scroll to top on initial load (history.scrollRestoration=manual set in main.tsx)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (location.pathname === '/home') {
    return <Navigate to="/" replace />;
  }

  const isPublicHome = location.pathname === '/';

  return (
    <Suspense fallback={<Loading />}>
      {isPublicHome ? <PublicHomeSurface /> : <AppShell />}
    </Suspense>
  );
};

export default App;
