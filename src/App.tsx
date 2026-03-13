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

const Loading = () => (
  <main
    data-testid="app-main"
    style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '4rem 1rem',
      background: '#05070F',
      color: '#FFFFFF',
    }}
  >
    <div
      aria-label="Loading application"
      style={{ fontSize: '1rem', fontWeight: 600, letterSpacing: '0.02em' }}
    >
      Loading...
    </div>
  </main>
);

const App = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

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
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (location.pathname === '/home') {
    return <Navigate to="/" replace />;
  }

  return (
    <Suspense fallback={<Loading />}>
      <AppShell />
    </Suspense>
  );
};

export default App;
