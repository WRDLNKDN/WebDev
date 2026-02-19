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
const LandingPage = lazy(async () => {
  const m = await import('./pages/profile/LandingPage');
  return { default: m.LandingPage };
});

const Dashboard = lazy(async () => {
  const m = await import('./pages/dashboard/Dashboard');
  return { default: m.Dashboard };
});

const ChatRedirect = lazy(async () => {
  const m = await import('./pages/chat/ChatRedirect');
  return { default: m.ChatRedirect };
});

const ChatPopupPage = lazy(async () => {
  const m = await import('./pages/chat/ChatPopupPage');
  return { default: m.ChatPopupPage };
});

const ChatPage = lazy(async () => {
  const m = await import('./pages/chat/ChatPage');
  return { default: m.ChatPage };
});

const Feed = lazy(async () => {
  const m = await import('./pages/feed/Feed');
  return { default: m.Feed };
});

const Home = lazy(async () => {
  const m = await import('./pages/home/Home');
  return { default: m.Home };
});

const Store = lazy(async () => {
  const m = await import('./pages/marketing/Store');
  return { default: m.Store };
});

const About = lazy(async () => {
  const m = await import('./pages/marketing/About');
  return { default: m.About };
});

const Community = lazy(async () => {
  const m = await import('./pages/community/Community');
  return { default: m.Community };
});

const Platform = lazy(async () => {
  const m = await import('./pages/marketing/Platform');
  return { default: m.Platform };
});

const Directory = lazy(async () => {
  const m = await import('./pages/community/Directory');
  return { default: m.Directory };
});

const WeirdlingCreate = lazy(async () => {
  const m = await import('./pages/weirdling/WeirdlingCreate');
  return { default: m.WeirdlingCreate };
});

const BumperPage = lazy(async () => {
  const m = await import('./pages/misc/BumperPage');
  return { default: m.BumperPage };
});

const ContentSubmitPage = lazy(async () => {
  const m = await import('./pages/content/ContentSubmitPage');
  return { default: m.ContentSubmitPage };
});

const PlaylistsPage = lazy(async () => {
  const m = await import('./pages/content/PlaylistsPage');
  return { default: m.PlaylistsPage };
});

const PlaylistDetailPage = lazy(async () => {
  const m = await import('./pages/content/PlaylistDetailPage');
  return { default: m.PlaylistDetailPage };
});

const ProjectPage = lazy(async () => {
  const m = await import('./pages/profile/ProjectPage');
  return { default: m.ProjectPage };
});

// --- SYSTEM UPGRADE: THE DIVERGENCE SECTOR ---
// The dedicated Game Page (Easter Egg)
const DivergencePage = lazy(async () => {
  const m = await import('./pages/misc/DivergencePage');
  return { default: m.DivergencePage };
});

const EventsPage = lazy(async () => {
  const m = await import('./pages/community/EventsPage');
  return { default: m.EventsPage };
});

const EventDetailPage = lazy(async () => {
  const m = await import('./pages/community/EventDetailPage');
  return { default: m.EventDetailPage };
});

const NotificationsPage = lazy(async () => {
  const m = await import('./pages/dashboard/NotificationsPage');
  return { default: m.NotificationsPage };
});

const ForumsPage = lazy(async () => {
  const m = await import('./pages/community/ForumsPage');
  return { default: m.ForumsPage };
});

const SavedPage = lazy(async () => {
  const m = await import('./pages/community/SavedPage');
  return { default: m.SavedPage };
});

const AdvertisePage = lazy(async () => {
  const m = await import('./pages/marketing/AdvertisePage');
  return { default: m.AdvertisePage };
});

const HelpPage = lazy(async () => {
  const m = await import('./pages/misc/HelpPage');
  return { default: m.HelpPage };
});

const CommunityPartnersPage = lazy(async () => {
  const m = await import('./pages/community/CommunityPartnersPage');
  return { default: m.CommunityPartnersPage };
});

const UnsubscribePage = lazy(async () => {
  const m = await import('./pages/misc/UnsubscribePage');
  return { default: m.UnsubscribePage };
});

// The Professional 404 Page (Standard Error)
const NotFoundPage = lazy(async () => {
  const m = await import('./pages/misc/NotFoundPage');
  return { default: m.NotFoundPage };
});

// 2. Auth Pages
const SignIn = lazy(async () => {
  const m = await import('./pages/auth/SignIn');
  return { default: m.SignIn };
});

const AuthCallback = lazy(async () => {
  const m = await import('./pages/auth/AuthCallback');
  return { default: m.AuthCallback };
});

const Signup = lazy(async () => {
  const m = await import('./pages/auth/Signup');
  return { default: m.Signup };
});

// 3. Legal Pages
const Guidelines = lazy(async () => {
  const m = await import('./pages/legal/Guidelines');
  return { default: m.Guidelines };
});

const Terms = lazy(async () => {
  const m = await import('./pages/legal/Terms');
  return { default: m.Terms };
});

const Privacy = lazy(async () => {
  const m = await import('./pages/legal/Privacy');
  return { default: m.Privacy };
});

// 4. Admin Ecosystem
const AdminApp = lazy(async () => {
  const m = await import('./pages/admin/AdminApp');
  return { default: m.AdminApp };
});

const AdminDashboard = lazy(async () => {
  const m = await import('./pages/admin/AdminDashboard');
  return { default: m.AdminDashboard };
});

const AdminContentModerationPage = lazy(async () => {
  const m = await import('./pages/admin/AdminContentModerationPage');
  return { default: m.AdminContentModerationPage };
});

const ChatReportsPage = lazy(async () => {
  const m = await import('./pages/admin/ChatReportsPage');
  return { default: m.ChatReportsPage };
});

const AdminAdvertisersPage = lazy(async () => {
  const m = await import('./pages/admin/AdminAdvertisersPage');
  return { default: m.AdminAdvertisersPage };
});

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
              <Route
                path="/chat-popup/:roomId"
                element={
                  <RequireOnboarded>
                    <ChatPopupPage />
                  </RequireOnboarded>
                }
              />

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
                <Route
                  path="/events"
                  element={
                    <RequireOnboarded>
                      <EventsPage />
                    </RequireOnboarded>
                  }
                />
                <Route
                  path="/events/:id"
                  element={
                    <RequireOnboarded>
                      <EventDetailPage />
                    </RequireOnboarded>
                  }
                />
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
                  element={
                    <RequireOnboarded>
                      <NotificationsPage />
                    </RequireOnboarded>
                  }
                />
                <Route
                  path="/dashboard/settings"
                  element={<Navigate to="/dashboard" replace />}
                />
                <Route
                  path="/chat"
                  element={
                    <RequireOnboarded>
                      <ChatRedirect />
                    </RequireOnboarded>
                  }
                />
                <Route
                  path="/chat/:roomId"
                  element={
                    <RequireOnboarded>
                      <ChatRedirect />
                    </RequireOnboarded>
                  }
                />
                <Route
                  path="/chat-full"
                  element={
                    <RequireOnboarded>
                      <ChatPage />
                    </RequireOnboarded>
                  }
                />
                <Route
                  path="/chat-full/:roomId"
                  element={
                    <RequireOnboarded>
                      <ChatPage />
                    </RequireOnboarded>
                  }
                />
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
