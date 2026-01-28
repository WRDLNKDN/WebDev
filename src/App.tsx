// src/App.tsx
import React, { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { SignupProvider } from './context/SignupProvider';

/**
 * All pages are lazy-loaded to keep the main bundle small.
 *
 * IMPORTANT:
 * We load by export name first, then fall back to default export.
 * This avoids TS errors when a module switches between named vs default exports.
 */
const lazyExport = <T extends React.ComponentType<unknown>>(
  importer: () => Promise<unknown>,
  exportName: string,
) =>
  lazy(async () => {
    const mod = (await importer()) as Record<string, unknown> & {
      default?: unknown;
    };
    const picked = mod[exportName] ?? mod.default;

    if (!picked) {
      throw new Error(
        `Lazy import failed: export "${exportName}" (or default) not found.`,
      );
    }

    return { default: picked as T };
  });

// Public
const Home = lazyExport(() => import('./pages/Home'), 'Home');

// Main user pages
const Directory = lazyExport(() => import('./pages/Directory'), 'Directory');
const Signup = lazyExport(() => import('./pages/Signup'), 'Signup');
const AuthCallback = lazyExport(
  () => import('./pages/auth/AuthCallback'),
  'AuthCallback',
);

// Admin
const AdminApp = lazyExport(() => import('./admin/AdminApp'), 'AdminApp');
const PendingProfiles = lazyExport(
  () => import('./pages/admin/PendingProfiles'),
  'PendingProfiles',
);
const ApprovedProfiles = lazyExport(
  () => import('./pages/admin/ApprovedProfiles'),
  'ApprovedProfiles',
);
const ProfileReview = lazyExport(
  () => import('./pages/admin/ProfileReview'),
  'ProfileReview',
);

const Loading = () => (
  <Box
    component="main"
    role="main"
    sx={{ display: 'flex', justifyContent: 'center', py: 10 }}
  >
    <CircularProgress aria-label="Loading application" />
  </Box>
);

const App = () => {
  return (
    <SignupProvider>
      <Suspense fallback={<Loading />}>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />

          {/* Signup */}
          <Route path="/signup" element={<Signup />} />

          {/* Directory */}
          <Route path="/directory" element={<Directory />} />

          {/* Auth */}
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* Admin */}
          <Route path="/admin" element={<AdminApp />} />
          <Route path="/admin/pending" element={<PendingProfiles />} />
          <Route path="/admin/approved" element={<ApprovedProfiles />} />
          <Route path="/admin/review/:id" element={<ProfileReview />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </SignupProvider>
  );
};

export default App;
