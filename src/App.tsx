import { Navigate, Route, Routes } from 'react-router-dom';
import { Home } from './pages/Home';
import { Directory } from './pages/Directory';

import { AdminApp } from './admin/AdminApp';
import { PendingProfiles } from './pages/PendingProfiles';
import { ApprovedProfiles } from './pages/ApprovedProfiles';
import { ProfileReview } from './pages/ProfileReview';

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
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
