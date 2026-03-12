import type { ReactElement } from 'react';
import { Navigate, Route, Routes, type Location } from 'react-router-dom';
import { RequireFeatureFlag } from '../../components/auth/RequireFeatureFlag';
import { RequireOnboarded } from '../../components/auth/RequireOnboarded';
import { Layout } from '../../components/layout/Layout';
import {
  DASHBOARD_FLAG,
  FEED_FLAG,
  GROUPS_FLAG,
  SETTINGS_PRIVACY_MARKETING_CONSENT_FLAG,
} from '../../lib/featureFlags/keys';
import {
  About,
  AdminAdvertisersPage,
  AdminApp,
  AdminAuthCallbackHealthPage,
  AdminContentModerationPage,
  AdminDashboard,
  AdminFeatureFlagsPage,
  AdminPartnersPage,
  AdvertisePage,
  AuthCallback,
  BumperPage,
  ChatPage,
  ChatPopupPage,
  ChatRedirect,
  ChatReportsPage,
  Community,
  CommunityPartnersPage,
  ContentSubmitPage,
  Dashboard,
  Directory,
  DivergencePage,
  EventDetailPage,
  EventsPage,
  Feed,
  GroupsPage,
  Guidelines,
  HelpPage,
  Home,
  Join,
  LandingPage,
  NotFoundPage,
  NotificationsPage,
  Platform,
  PlaylistDetailPage,
  PlaylistsPage,
  Privacy,
  ProjectPage,
  PublicProfilePage,
  SavedPage,
  SettingsLayout,
  SettingsAppearancePage,
  SettingsNotificationsPage,
  SettingsPrivacyPage,
  SignIn,
  Store,
  Terms,
  UnsubscribePage,
  WeirdlingCreate,
} from './lazyPages';
type AppRouteTreeProps = {
  redirectUToProfile: ReactElement;
  routesLocation?: Location;
};

export const AppRouteTree = ({
  redirectUToProfile,
  routesLocation,
}: AppRouteTreeProps) => (
  <Routes location={routesLocation}>
    <Route path="/bumper" element={<BumperPage />} />
    <Route
      path="/chat-popup/:roomId"
      element={
        <RequireOnboarded>
          <ChatPopupPage />
        </RequireOnboarded>
      }
    />

    <Route path="/signin" element={<SignIn />} />
    <Route path="/join" element={<Join />} />
    <Route path="/auth/callback" element={<AuthCallback />} />

    <Route element={<Layout />}>
      <Route
        path="admin/resume-thumbnails"
        element={<Navigate to="/admin" replace />}
      />
      <Route path="/" element={<Home />} />
      <Route path="/profile/:handle" element={<LandingPage />} />
      <Route path="/p/:shareToken" element={<PublicProfilePage />} />
      <Route path="/projects/:id" element={<ProjectPage />} />
      <Route path="/u/:handle" element={redirectUToProfile} />
      <Route path="/home" element={<Home />} />
      <Route
        path="/directory"
        element={
          <RequireFeatureFlag flagKey="directory">
            <RequireOnboarded>
              <Directory />
            </RequireOnboarded>
          </RequireFeatureFlag>
        }
      />
      <Route
        path="/feed"
        element={
          <RequireFeatureFlag flagKey={FEED_FLAG} fallbackTo="/">
            <RequireOnboarded>
              <Feed />
            </RequireOnboarded>
          </RequireFeatureFlag>
        }
      />
      <Route
        path="/store"
        element={
          <RequireFeatureFlag flagKey="store">
            <Store />
          </RequireFeatureFlag>
        }
      />
      <Route path="/about" element={<About />} />
      <Route path="/community" element={<Community />} />
      <Route path="/platform" element={<Platform />} />
      <Route
        path="/events"
        element={
          <RequireFeatureFlag flagKey="events">
            <RequireOnboarded>
              <EventsPage />
            </RequireOnboarded>
          </RequireFeatureFlag>
        }
      />
      <Route
        path="/events/:id"
        element={
          <RequireFeatureFlag flagKey="events">
            <RequireOnboarded>
              <EventDetailPage />
            </RequireOnboarded>
          </RequireFeatureFlag>
        }
      />
      <Route
        path="/groups"
        element={
          <RequireFeatureFlag flagKey={GROUPS_FLAG}>
            <GroupsPage />
          </RequireFeatureFlag>
        }
      />
      <Route
        path="/forums"
        element={
          <RequireFeatureFlag flagKey={GROUPS_FLAG}>
            <Navigate to="/groups" replace />
          </RequireFeatureFlag>
        }
      />
      <Route path="/saved" element={<SavedPage />} />
      <Route path="/advertise" element={<AdvertisePage />} />
      <Route
        path="/games"
        element={
          <RequireFeatureFlag flagKey="games">
            <DivergencePage />
          </RequireFeatureFlag>
        }
      />
      <Route path="/help" element={<HelpPage />} />
      <Route path="/community-partners" element={<CommunityPartnersPage />} />

      <Route
        path="/dashboard"
        element={
          <RequireFeatureFlag flagKey={DASHBOARD_FLAG} fallbackTo="/">
            <RequireOnboarded>
              <Dashboard />
            </RequireOnboarded>
          </RequireFeatureFlag>
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
          <RequireFeatureFlag flagKey={DASHBOARD_FLAG} fallbackTo="/">
            <RequireOnboarded>
              <NotificationsPage />
            </RequireOnboarded>
          </RequireFeatureFlag>
        }
      />
      <Route
        path="/dashboard/settings"
        element={
          <RequireFeatureFlag flagKey={DASHBOARD_FLAG} fallbackTo="/">
            <RequireOnboarded>
              <SettingsLayout />
            </RequireOnboarded>
          </RequireFeatureFlag>
        }
      >
        <Route path="appearance" element={<SettingsAppearancePage />} />
        <Route
          index
          element={<Navigate to="/dashboard/settings/appearance" replace />}
        />
        <Route path="notifications" element={<SettingsNotificationsPage />} />
        <Route
          path="privacy"
          element={
            <RequireFeatureFlag
              flagKey={SETTINGS_PRIVACY_MARKETING_CONSENT_FLAG}
              fallbackTo="/dashboard/settings/notifications"
            >
              <SettingsPrivacyPage />
            </RequireFeatureFlag>
          }
        />
      </Route>

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
      <Route path="/playlists/:slug" element={<PlaylistDetailPage />} />

      <Route path="/login" element={<Navigate to="/signin" replace />} />

      <Route path="/guidelines" element={<Guidelines />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/unsubscribe" element={<UnsubscribePage />} />

      <Route path="/admin" element={<AdminApp />}>
        <Route index element={<AdminDashboard />} />
        <Route
          path="auth-callback-health"
          element={<AdminAuthCallbackHealthPage />}
        />
        <Route path="moderation" element={<Navigate to="/admin" replace />} />
        <Route path="content" element={<AdminContentModerationPage />} />
        <Route path="chat-reports" element={<ChatReportsPage />} />
        <Route path="advertisers" element={<AdminAdvertisersPage />} />
        <Route path="community-partners" element={<AdminPartnersPage />} />
        <Route path="feature-flags" element={<AdminFeatureFlagsPage />} />
        <Route
          path="resume-thumbnails"
          element={<Navigate to="/admin" replace />}
        />
        <Route
          path="partners"
          element={<Navigate to="/admin/community-partners" replace />}
        />
      </Route>
      <Route path="/admin/pending" element={<Navigate to="/admin" replace />} />
      <Route
        path="/admin/approved"
        element={<Navigate to="/admin" replace />}
      />
      <Route
        path="/admin/review/:id"
        element={<Navigate to="/admin" replace />}
      />

      <Route path="/divergence" element={<DivergencePage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>
);

export const AppOverlayRoutes = () => (
  <Routes>
    <Route path="/advertise" element={<AdvertisePage />} />
  </Routes>
);
