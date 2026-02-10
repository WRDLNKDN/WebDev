import { Box, CircularProgress } from '@mui/material';
import { Suspense, lazy, useEffect } from 'react';
import { Route, Routes, useNavigate, useSearchParams } from 'react-router-dom';

// HOOKS & CONTEXT
import { SignupProvider } from './context/SignupProvider';
import { useKonamiCode } from './hooks/useKonamiCode';

// LAYOUT & UTILS
import { Layout } from './components/layout/Layout';
import { supabase } from './lib/supabaseClient';

/**
 * All pages are lazy-loaded to keep the main bundle small.
 */

// 1. Core Pages
const LandingPage = lazy(() =>
  import('./pages/LandingPage').then((m) => ({ default: m.LandingPage })),
);

const Dashboard = lazy(() =>
  import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })),
);

const Directory = lazy(() =>
  import('./pages/Directory').then((m) => ({ default: m.Directory })),
);

const Home = lazy(() =>
  import('./pages/Home').then((m) => ({ default: m.Home })),
);

const Store = lazy(() =>
  import('./pages/Store').then((m) => ({ default: m.Store })),
);

const About = lazy(() =>
  import('./pages/About').then((m) => ({ default: m.About })),
);

const Community = lazy(() =>
  import('./pages/Community').then((m) => ({ default: m.Community })),
);

const Platform = lazy(() =>
  import('./pages/Platform').then((m) => ({ default: m.Platform })),
);

const WeirdlingCreate = lazy(() =>
  import('./pages/weirdling/WeirdlingCreate').then((m) => ({
    default: m.WeirdlingCreate,
  })),
);

// --- SYSTEM UPGRADE: THE DIVERGENCE SECTOR ---
// The dedicated Game Page (Easter Egg)
const DivergencePage = lazy(() =>
  import('./pages/DivergencePage').then((m) => ({ default: m.DivergencePage })),
);

// The Professional 404 Page (Standard Error)
const NotFoundPage = lazy(() =>
  import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
);

// 2. Auth Pages
const SignIn = lazy(() =>
  import('./pages/auth/SignIn').then((m) => ({ default: m.SignIn })),
);

const AuthCallback = lazy(() =>
  import('./pages/auth/AuthCallback').then((m) => ({
    default: m.AuthCallback,
  })),
);

const Signup = lazy(() =>
  import('./pages/Signup').then((m) => ({ default: m.Signup })),
);

// 3. Legal Pages
const Guidelines = lazy(() =>
  import('./pages/legal/Guidelines').then((m) => ({ default: m.Guidelines })),
);

const Terms = lazy(() =>
  import('./pages/legal/Terms').then((m) => ({ default: m.Terms })),
);

// 4. Admin Ecosystem
const AdminApp = lazy(() =>
  import('./pages/admin/AdminApp').then((m) => ({ default: m.AdminApp })),
);

const PendingProfiles = lazy(() =>
  import('./pages/admin/PendingProfiles').then((m) => ({
    default: m.PendingProfiles,
  })),
);

const ApprovedProfiles = lazy(() =>
  import('./pages/admin/ApprovedProfiles').then((m) => ({
    default: m.ApprovedProfiles,
  })),
);

const ProfileReview = lazy(() =>
  import('./pages/admin/ProfileReview').then((m) => ({
    default: m.ProfileReview,
  })),
);

// 5. System Components
const Loading = () => (
  <Box
    component="main"
    sx={{ display: 'flex', justifyContent: 'center', py: 10 }}
  >
    <CircularProgress aria-label="Loading application" />
  </Box>
);

const AuthBoot = () => {
  useEffect(() => {
    void supabase.auth.getSession();
  }, []);

  return null;
};

const App = () => {
  const navigate = useNavigate();
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

  return (
    <>
      <AuthBoot />

      <SignupProvider>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route element={<Layout />}>
              {/* --- Public Access --- */}
              <Route path="/" element={<Home />} />
              <Route path="/u/:handle" element={<LandingPage />} />
              <Route path="/home" element={<Home />} />
              <Route path="/directory" element={<Directory />} />
              <Route path="/store" element={<Store />} />
              <Route path="/about" element={<About />} />
              <Route path="/community" element={<Community />} />
              <Route path="/platform" element={<Platform />} />

              {/* --- Authenticated User Zone --- */}
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/weirdling/create" element={<WeirdlingCreate />} />

              {/* --- Authentication --- */}
              <Route path="/login" element={<SignIn />} />
              <Route path="/signin" element={<SignIn />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/auth/callback" element={<AuthCallback />} />

              {/* --- Legal --- */}
              <Route path="/guidelines" element={<Guidelines />} />
              <Route path="/terms" element={<Terms />} />

              {/* --- Administration --- */}
              <Route path="/admin" element={<AdminApp />} />
              <Route path="/admin/pending" element={<PendingProfiles />} />
              <Route path="/admin/approved" element={<ApprovedProfiles />} />
              <Route path="/admin/review/:id" element={<ProfileReview />} />

              {/* --- SYSTEM UPGRADE: SEPARATION OF CONCERNS --- */}

              {/* 1. The Game (Konami Code Target) */}
              <Route path="/divergence" element={<DivergencePage />} />

              {/* 2. The Professional 404 (Catch-All) */}
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </Suspense>
      </SignupProvider>
    </>
  );
};

export default App;
