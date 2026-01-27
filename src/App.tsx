import { Navigate, Route, Routes } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { Box, CircularProgress } from '@mui/material';

/**
 * All pages are lazy-loaded to keep the main bundle small.
 */

const Home = lazy(() =>
  import('./pages/Home').then((m) => ({ default: m.Home })),
);

const Signup = lazy(() =>
  import('./pages/Signup').then((m) => ({ default: m.Signup })),
);

const Directory = lazy(() =>
  import('./pages/Directory').then((m) => ({ default: m.Directory })),
);

const AuthCallback = lazy(() =>
  import('./pages/auth/AuthCallback').then((m) => ({
    default: m.AuthCallback,
  })),
);

const AdminApp = lazy(() =>
  import('./admin/AdminApp').then((m) => ({ default: m.AdminApp })),
);

const SignIn = lazy(() =>
  import('./pages/auth/SignIn').then((m) => ({ default: m.SignIn })),
);

const Guidelines = lazy(() =>
  import('./pages/legal/Guidelines').then((m) => ({ default: m.Guidelines })),
);

const Loading = () => (
  <Box
    component="main"
    sx={{ display: 'flex', justifyContent: 'center', py: 10 }}
  >
    <CircularProgress aria-label="Loading application" />
  </Box>
);

const App = () => {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<Signup />} />

        <Route path="/guidelines" element={<Guidelines />} />

        <Route path="/directory" element={<Directory />} />

        <Route path="/auth/callback" element={<AuthCallback />} />

        <Route path="/admin" element={<AdminApp />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default App;
