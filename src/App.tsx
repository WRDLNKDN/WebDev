import React, { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { SignupProvider } from './context/SignupProvider';

const lazyExport = <T extends React.ComponentType<any>>(
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
const SignIn = lazyExport(() => import('./pages/auth/SignIn'), 'SignIn');

// Main user pages
const Directory = lazyExport(() => import('./pages/Directory'), 'Directory');
const Signup = lazyExport(() => import('./pages/Signup'), 'Signup');
const AuthCallback = lazyExport(
  () => import('./pages/auth/AuthCallback'),
  'AuthCallback',
);

// Terms and Guidelines
const Terms = lazyExport(() => import('./pages/legal/Terms'), 'Terms');
const Guidelines = lazyExport(
  () => import('./pages/legal/Guidelines'),
  'Guidelines',
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
          <Route path="/signin" element={<SignIn />} />

          {/* Signup flow */}
          <Route path="/signup" element={<Signup />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* Directory */}
          <Route path="/directory" element={<Directory />} />

          {/* Admin */}
          <Route path="/admin" element={<AdminApp />} />
          <Route path="/admin/pending" element={<PendingProfiles />} />
          <Route path="/admin/approved" element={<ApprovedProfiles />} />
          <Route path="/admin/review/:id" element={<ProfileReview />} />

          {/* TOS and guildlines */}
          <Route path="/terms" element={<Terms />} />
          <Route path="/guidelines" element={<Guidelines />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </SignupProvider>
  );
};

export default App;
