import { Box, CircularProgress } from '@mui/material';
import { Suspense, lazy, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { SignupProvider } from './context/SignupProvider';
import { supabase } from './lib/supabaseClient';

/**
 * All pages are lazy-loaded to keep the main bundle small.
 * This ensures high performance on mobile devices (Human OS Requirement).
 */

// 1. Core Pages
const Home = lazy(() =>
  import('./pages/Home').then((m) => ({ default: m.Home })),
);

// NOTE: Dashboard component is next on our build list.
// For now, we handle the route via redirect or placeholder in the Routes block.
const Directory = lazy(() =>
  import('./pages/Directory').then((m) => ({ default: m.Directory })),
);

// 2. Auth Pages (Nick's Structure)
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

// 3. Legal Pages (Nick's Additions)
const Guidelines = lazy(() =>
  import('./pages/legal/Guidelines').then((m) => ({ default: m.Guidelines })),
);

const Terms = lazy(() =>
  import('./pages/legal/Terms').then((m) => ({ default: m.Terms })),
);

// 4. Admin Ecosystem (Merging Our Granular Routes with Nick's Base)
const AdminApp = lazy(() =>
  import('./pages/admin/AdminApp').then((m) => ({ default: m.AdminApp })),
);

const PendingProfiles = lazy(() =>
  import('./pages/PendingProfiles').then((m) => ({
    default: m.PendingProfiles,
  })),
);

const ApprovedProfiles = lazy(() =>
  import('./pages/ApprovedProfiles').then((m) => ({
    default: m.ApprovedProfiles,
  })),
);

const ProfileReview = lazy(() =>
  import('./pages/ProfileReview').then((m) => ({
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

/**
 * AuthBoot: Ensures Supabase session is synced with React state
 * immediately upon application mount.
 */
const AuthBoot = () => {
  useEffect(() => {
    void supabase.auth.getSession();
  }, []);

  return null;
};

const App = () => {
  return (
    <>
      <AuthBoot />

      <SignupProvider>
        <Suspense fallback={<Loading />}>
          <Routes>
            {/* --- Public Access --- */}
            <Route path="/" element={<Home />} />
            <Route path="/directory" element={<Directory />} />

            {/* TEMPORARY: Redirect Dashboard to Directory until we build the component
                This prevents 404s from the Home.tsx redirect we just built. */}
            <Route
              path="/directory"
              element={<Navigate to="/directory" replace />}
            />

            {/* --- Authentication --- */}
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/auth/callback" element={<AuthCallback />} />

            {/* --- Legal --- */}
            <Route path="/guidelines" element={<Guidelines />} />
            <Route path="/terms" element={<Terms />} />

            {/* --- Administration (Merged) --- */}
            {/* Main Admin Hub */}
            <Route path="/admin" element={<AdminApp />} />

            {/* Granular Admin Workflows */}
            <Route path="/admin/pending" element={<PendingProfiles />} />
            <Route path="/admin/approved" element={<ApprovedProfiles />} />
            <Route path="/admin/review/:id" element={<ProfileReview />} />

            {/* --- Fallback --- */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </SignupProvider>
    </>
  );
};

export default App;
