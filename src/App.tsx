// src/App.tsx
import { Navigate, Route, Routes } from 'react-router-dom';
import { Suspense, lazy, useEffect } from 'react';
import { Box, CircularProgress } from '@mui/material';

import { supabase } from './lib/supabaseClient';
import { SignupProvider } from './context/SignupProvider';

/**
 * All pages are lazy-loaded to keep the main bundle small.
 */

// Public
const Home = lazy(() =>
  import('./pages/Home').then((m) => ({ default: m.Home })),
);

// Auth
const SignIn = lazy(() =>
  import('./pages/auth/SignIn').then((m) => ({ default: m.SignIn })),
);

const AuthCallback = lazy(() =>
  import('./pages/auth/AuthCallback').then((m) => ({
    default: m.AuthCallback,
  })),
);

// Signup
const Signup = lazy(() =>
  import('./pages/Signup').then((m) => ({ default: m.Signup })),
);

// Legal
const Guidelines = lazy(() =>
  import('./pages/legal/Guidelines').then((m) => ({ default: m.Guidelines })),
);

const Terms = lazy(() =>
  import('./pages/legal/Terms').then((m) => ({ default: m.Terms })),
);

// App pages
const Directory = lazy(() =>
  import('./pages/Directory').then((m) => ({ default: m.Directory })),
);

// Admin - UPDATED PATH
const AdminApp = lazy(() =>
  import('./pages/admin/AdminApp').then((m) => ({ default: m.AdminApp })),
);

const Loading = () => (
  <Box
    component="main"
    sx={{ display: 'flex', justifyContent: 'center', py: 10 }}
  >
    <CircularProgress aria-label="Loading application" />
  </Box>
);

/**
 * Small boot-time auth sync.
 * This helps ensure the in-memory client state matches persisted storage quickly,
 * especially after redirects or hard reloads.
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
            {/* Public */}
            <Route path="/" element={<Home />} />

            {/* Auth */}
            <Route path="/signin" element={<SignIn />} />
            <Route path="/auth/callback" element={<AuthCallback />} />

            {/* Signup */}
            <Route path="/signup" element={<Signup />} />

            {/* Legal */}
            <Route path="/guidelines" element={<Guidelines />} />
            <Route path="/terms" element={<Terms />} />

            {/* Directory */}
            <Route path="/directory" element={<Directory />} />

            {/* Admin */}
            <Route path="/admin" element={<AdminApp />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </SignupProvider>
    </>
  );
};

export default App;
