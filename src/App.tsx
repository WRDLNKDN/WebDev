// src/App.tsx
//
// App routes:
// - /            splash / home
// - /register    registration request (creates pending profile)
// - /directory   public directory (approved-only via RLS)
// - /admin/...   admin tooling (token-gated UI)

import { Navigate, Route, Routes } from 'react-router-dom';
import { Home } from './pages/Home';
import { Directory } from './pages/Directory';
import { Register } from './pages/Register';

import { AdminApp } from './admin/AdminApp';
import { PendingProfiles } from './pages/PendingProfiles';
import { ApprovedProfiles } from './pages/ApprovedProfiles';
import { ProfileReview } from './pages/ProfileReview';

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/register" element={<Register />} />
      <Route path="/directory" element={<Directory />} />

      <Route path="/admin" element={<AdminApp />} />
      <Route path="/admin/pending" element={<PendingProfiles />} />
      <Route path="/admin/approved" element={<ApprovedProfiles />} />
      <Route path="/admin/review/:id" element={<ProfileReview />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
