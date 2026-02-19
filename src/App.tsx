import { Box, CircularProgress } from '@mui/material';
import { Suspense, lazy, useEffect } from 'react';
import {
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';

// HOOKS & CONTEXT
import { AvatarProvider } from './context/AvatarContext';
import { SignupProvider } from './context/SignupProvider';
import { useKonamiCode } from './hooks/useKonamiCode';

// LAYOUT & UTILS
import { RequireOnboarded } from './components/auth/RequireOnboarded';
import { Layout } from './components/layout/Layout';
import { supabase } from './lib/auth/supabaseClient';

/**
 * All pages are lazy-loaded to keep the main bundle small.
 */

// 1. Core Pages
const LandingPage = lazy(() =>
  import('./pages/profile/LandingPage').then((m) => ({
    default: m.LandingPage,
  })),
);

const Dashboard = lazy(() =>
  import('./pages/dashboard/Dashboard').then((m) => ({
    default: m.Dashboard,
  })),
);

const ChatRedirect = lazy(() =>
  import('./pages/chat/ChatRedirect').then((m) => ({
    default: m.ChatRedirect,
  })),
);

const ChatPopupPage = lazy(() =>
  import('./pages/chat/ChatPopupPage').then((m) => ({
    default: m.ChatPopupPage,
  })),
);

const Feed = lazy(() =>
  import('./pages/feed/Feed').then((m) => ({ default: m.Feed })),
);

const Home = lazy(() =>
  import('./pages/home/Home').then((m) => ({ default: m.Home })),
);

const Store = lazy(() =>
  import('./pages/marketing/Store').then((m) => ({ default: m.Store })),
);

const About = lazy(() =>
  import('./pages/marketing/About').then((m) => ({ default: m.About })),
);

const Community = lazy(() =>
  import('./pages/community/Community').then((m) => ({
    default: m.Community,
  })),
);

const Platform = lazy(() =>
  import('./pages/marketing/Platform').then((m) => ({
    default: m.Platform,
  })),
);

const Directory = lazy(() =>
  import('./pages/community/Directory').then((m) => ({
    default: m.Directory,
  })),
);

const WeirdlingCreate = lazy(() =>
  import('./pages/weirdling/WeirdlingCreate').then((m) => ({
    default: m.WeirdlingCreate,
  })),
);

const BumperPage = lazy(() =>
  import('./pages/misc/BumperPage').then((m) => ({
    default: m.BumperPage,
  })),
);

const ContentSubmitPage = lazy(() =>
  import('./pages/content/ContentSubmitPage').then((m) => ({
    default: m.ContentSubmitPage,
  })),
);

const PlaylistsPage = lazy(() =>
  import('./pages/content/PlaylistsPage').then((m) => ({
    default: m.PlaylistsPage,
  })),
);

const PlaylistDetailPage = lazy(() =>
  import('./pages/content/PlaylistDetailPage').then((m) => ({
    default: m.PlaylistDetailPage,
  })),
);

const ProjectPage = lazy(() =>
  import('./pages/profile/ProjectPage').then((m) => ({
    default: m.ProjectPage,
  })),
);

// --- SYSTEM UPGRADE: THE DIVERGENCE SECTOR ---
// The dedicated Game Page (Easter Egg)
const DivergencePage = lazy(() =>
  import('./pages/misc/DivergencePage').then((m) => ({
    default: m.DivergencePage,
  })),
);

const EventsPage = lazy(() =>
  import('./pages/community/EventsPage').then((m) => ({
    default: m.EventsPage,
  })),
);

const ForumsPage = lazy(() =>
  import('./pages/community/ForumsPage').then((m) => ({
    default: m.ForumsPage,
  })),
);

const SavedPage = lazy(() =>
  import('./pages/community/SavedPage').then((m) => ({
    default: m.SavedPage,
  })),
);

const AdvertisePage = lazy(() =>
  import('./pages/marketing/AdvertisePage').then((m) => ({
    default: m.AdvertisePage,
  })),
);

const HelpPage = lazy(() =>
  import('./pages/misc/HelpPage').then((m) => ({ default: m.HelpPage })),
);

const CommunityPartnersPage = lazy(() =>
  import('./pages/community/CommunityPartnersPage').then((m) => ({
    default: m.CommunityPartnersPage,
  })),
);

const UnsubscribePage = lazy(() =>
  import('./pages/misc/UnsubscribePage').then((m) => ({
    default: m.UnsubscribePage,
  })),
);

// The Professional 404 Page (Standard Error)
const NotFoundPage = lazy(() =>
  import('./pages/misc/NotFoundPage').then((m) => ({
    default: m.NotFoundPage,
  })),
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
  import('./pages/auth/Signup').then((m) => ({ default: m.Signup })),
);

// 3. Legal Pages
const Guidelines = lazy(() =>
  import('./pages/legal/Guidelines').then((m) => ({ default: m.Guidelines })),
);

const Terms = lazy(() =>
  import('./pages/legal/Terms').then((m) => ({ default: m.Terms })),
);

const Privacy = lazy(() =>
  import('./pages/legal/Privacy').then((m) => ({ default: m.Privacy })),
);

// 4. Admin Ecosystem
const AdminApp = lazy(() =>
  import('./pages/admin/AdminApp').then((m) => ({ default: m.AdminApp })),
);

const AdminDashboard = lazy(() =>
  import('./pages/admin/AdminDashboard').then((m) => ({
    default: m.AdminDashboard,
  })),
);

const AdminContentModerationPage = lazy(() =>
  import('./pages/admin/AdminContentModerationPage').then((m) => ({
    default: m.AdminContentModerationPage,
  })),
);

const ChatReportsPage = lazy(() =>
  import('./pages/admin/ChatReportsPage').then((m) => ({
    default: m.ChatReportsPage,
  })),
);

const AdminAdvertisersPage = lazy(() =>
  import('./pages/admin/AdminAdvertisersPage').then((m) => ({
    default: m.AdminAdvertisersPage,
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

/** Legacy: redirect /u/:handle to canonical /profile/:handle (IA) */
const RedirectUToProfile = () => {
  const { handle } = useParams<{ handle: string }>();
  return <Navigate to={`/profile/${handle ?? ''}`} replace />;
};

const App = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // --- SYSTEM SECRET: KONAMI CODE LISTENER ---
  useKonamiCode(() => {
    console.log('🎮 KONAMI CODE DETECTED: ACTIVATING DIVERGENCE PROTOCOL');
    navigate('/divergence');
  });

  // --- SYSTEM SECRET: QUERY STRING LISTENER ---
  // Usage: http://localhost:5173/?mode=glitch
  useEffect(() => {
    if (searchParams.get('mode') === 'glitch') {
      navigate('/divergence');
    }
  }, [searchParams, navigate]);

  return (
    <>
      <AuthBoot />

      <SignupProvider>
        <AvatarProvider>
          <Suspense fallback={<Loading />}>
            <Routes>
              {/* Bumper: full-screen, no nav/footer (for recording) */}
              <Route path="/bumper" element={<BumperPage />} />

              {/* Popout chat: standalone window (LinkedIn-style) */}
              <Route path="/chat-popup/:roomId" element={<ChatPopupPage />} />

              <Route element={<Layout />}>
                {/* --- Public Access (see docs/architecture/information-architecture.md) --- */}
                <Route path="/" element={<Home />} />
                <Route path="/profile/:handle" element={<LandingPage />} />
                <Route path="/projects/:id" element={<ProjectPage />} />
                <Route path="/u/:handle" element={<RedirectUToProfile />} />
                <Route path="/home" element={<Home />} />
                <Route
                  path="/directory"
                  element={
                    <RequireOnboarded>
                      <Directory />
                    </RequireOnboarded>
                  }
                />
                <Route
                  path="/feed"
                  element={
                    <RequireOnboarded>
                      <Feed />
                    </RequireOnboarded>
                  }
                />
                <Route path="/store" element={<Store />} />
                <Route path="/about" element={<About />} />
                <Route path="/community" element={<Community />} />
                <Route path="/platform" element={<Platform />} />
                <Route path="/events" element={<EventsPage />} />
                <Route path="/forums" element={<ForumsPage />} />
                <Route path="/saved" element={<SavedPage />} />
                <Route path="/advertise" element={<AdvertisePage />} />
                <Route path="/games" element={<DivergencePage />} />
                <Route path="/help" element={<HelpPage />} />
                <Route
                  path="/community-partners"
                  element={<CommunityPartnersPage />}
                />

                {/* --- Authenticated User Zone --- */}
                <Route
                  path="/dashboard"
                  element={
                    <RequireOnboarded>
                      <Dashboard />
                    </RequireOnboarded>
                  }
                />
                <Route
                  path="/dashboard/profile"
                  element={<Navigate to="/dashboard" replace />}
                />
                <Route
                  path="/dashboard/activity"
                  element={<Navigate to="/dashboard" replace />}
                />
                <Route
                  path="/dashboard/intent"
                  element={<Navigate to="/dashboard" replace />}
                />
                <Route
                  path="/dashboard/notifications"
                  element={<Navigate to="/dashboard" replace />}
                />
                <Route
                  path="/dashboard/settings"
                  element={<Navigate to="/dashboard" replace />}
                />
                <Route path="/chat" element={<ChatRedirect />} />
                <Route path="/chat/:roomId" element={<ChatRedirect />} />
                <Route path="/weirdling/create" element={<WeirdlingCreate />} />
                <Route
                  path="/submit"
                  element={
                    <RequireOnboarded>
                      <ContentSubmitPage />
                    </RequireOnboarded>
                  }
                />
                <Route path="/playlists" element={<PlaylistsPage />} />
                <Route
                  path="/playlists/:slug"
                  element={<PlaylistDetailPage />}
                />

                {/* --- Authentication --- */}
                <Route path="/login" element={<SignIn />} />
                <Route path="/signin" element={<SignIn />} />
                <Route path="/join" element={<Signup />} />
                <Route
                  path="/signup"
                  element={<Navigate to="/join" replace />}
                />
                <Route path="/auth/callback" element={<AuthCallback />} />

                {/* --- Legal --- */}
                <Route path="/guidelines" element={<Guidelines />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/unsubscribe" element={<UnsubscribePage />} />

                {/* --- Administration --- */}
                <Route path="/admin" element={<AdminApp />}>
                  <Route index element={<AdminDashboard />} />
                  <Route
                    path="moderation"
                    element={<Navigate to="/admin" replace />}
                  />
                  <Route
                    path="content"
                    element={<AdminContentModerationPage />}
                  />
                  <Route path="chat-reports" element={<ChatReportsPage />} />
                  <Route
                    path="advertisers"
                    element={<AdminAdvertisersPage />}
                  />
                </Route>
                <Route
                  path="/admin/pending"
                  element={<Navigate to="/admin" replace />}
                />
                <Route
                  path="/admin/approved"
                  element={<Navigate to="/admin" replace />}
                />
                <Route
                  path="/admin/review/:id"
                  element={<Navigate to="/admin" replace />}
                />

                {/* --- SYSTEM UPGRADE: SEPARATION OF CONCERNS --- */}

                {/* 1. The Game (Konami Code Target) */}
                <Route path="/divergence" element={<DivergencePage />} />

                {/* 2. The Professional 404 (Catch-All) */}
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </Suspense>
        </AvatarProvider>
      </SignupProvider>
    </>
  );
};

export default App;
