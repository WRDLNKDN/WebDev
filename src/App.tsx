import { Box, CircularProgress } from '@mui/material';
import { Suspense, lazy, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { SignupProvider } from './context/SignupProvider';
import { supabase } from './lib/supabaseClient';

/**
 * All pages are lazy-loaded to keep the main bundle small.
 */

// 1. Core Pages
// LANDING PAGE: The Public Showroom (Replaces Home)
const LandingPage = lazy(() =>
  import('./pages/LandingPage').then((m) => ({ default: m.LandingPage })),
);

// SYSTEM UPGRADE: Dashboard Component (The "Workshop")
const Dashboard = lazy(() =>
  import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })),
);

const Directory = lazy(() =>
  import('./pages/Directory').then((m) => ({ default: m.Directory })),
);

const Home = lazy(() =>
  import('./pages/Home').then((m) => ({ default: m.Home })),
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
  return (
    <>
      <AuthBoot />

      <SignupProvider>
        <Suspense fallback={<Loading />}>
          <Routes>
            {/* --- Public Access --- */}
            {/* THE SHOWROOM: Open to everyone */}
            <Route path="/" element={<LandingPage />} />
            {/* Dynamic Vanity URL */}
            <Route path="/u/:handle" element={<LandingPage />} />
            <Route path="/home" element={<Home />} />
            <Route path="/directory" element={<Directory />} />

            {/* --- Authenticated User Zone --- */}
            {/* THE WORKSHOP: Private area for the owner */}
            <Route path="/dashboard" element={<Dashboard />} />

            {/* --- Authentication --- */}
            {/* 'login' is now the standard entry point, pointing to SignIn */}
            <Route path="/login" element={<SignIn />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/auth/callback" element={<AuthCallback />} />

            {/* --- Legal --- */}
            <Route path="/guidelines" element={<Guidelines />} />
            <Route path="/terms" element={<Terms />} />

            {/* --- Administration (Merged) --- */}
            <Route path="/admin" element={<AdminApp />} />
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
