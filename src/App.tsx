import { Navigate, Route, Routes } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { Box, CircularProgress } from '@mui/material';

const Home = lazy(() =>
  import('./pages/Home').then((m) => ({ default: m.Home })),
);

const Directory = lazy(() =>
  import('./pages/Directory').then((m) => ({ default: m.Directory })),
);

const Signup = lazy(() =>
  import('./pages/Signup').then((m) => ({ default: m.Signup })),
);

const AuthCallback = lazy(() =>
  import('./pages/AuthCallback').then((m) => ({ default: m.AuthCallback })),
);

const AdminApp = lazy(() =>
  import('./admin/AdminApp').then((m) => ({ default: m.AdminApp })),
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

const Loading = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
    <CircularProgress />
  </Box>
);

const App = () => {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/directory" element={<Directory />} />
        <Route path="/signup" element={<Signup />} />

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
  );
};

export default App;
