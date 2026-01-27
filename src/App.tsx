// src/App.tsx
import { Navigate, Route, Routes } from 'react-router-dom';
import { Suspense, lazy, useEffect } from 'react';
import { Box, CircularProgress } from '@mui/material';

import { supabase } from './lib/supabaseClient';

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

// App pages
const Directory = lazy(() =>
  import('./pages/Directory').then((m) => ({ default: m.Directory })),
);

// Admin
const AdminApp = lazy(() =>
  import('./admin/AdminApp').then((m) => ({ default: m.AdminApp })),
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

          {/* Directory */}
          <Route path="/directory" element={<Directory />} />

          {/* Admin */}
          <Route path="/admin" element={<AdminApp />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
};

export default App;
