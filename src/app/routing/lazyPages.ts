import { lazy, type ComponentType } from 'react';

const RETRY_DELAY_MS = 500;
const MAX_ATTEMPTS = 3;

/**
 * Lazy load with retry for dynamic imports. Mitigates chunk load failures
 * on client-side navigation (e.g. Dashboard → Directory) where a full refresh
 * would succeed. Retries with backoff so transient network/cache issues often resolve.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- lazy pages have varying prop types
function lazyWithRetry<T extends { default: ComponentType<any> }>(
  importFn: () => Promise<T>,
) {
  return lazy(async () => {
    let lastError: unknown;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        return await importFn();
      } catch (e) {
        lastError = e;
        if (attempt < MAX_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
        }
      }
    }
    throw lastError;
  });
}

export const LandingPage = lazy(async () => {
  const m = await import('../../pages/profile/LandingPage');
  return { default: m.LandingPage };
});

export const Dashboard = lazyWithRetry(async () => {
  const m = await import('../../pages/dashboard/Dashboard');
  return { default: m.Dashboard };
});

export const ChatRedirect = lazy(async () => {
  const m = await import('../../pages/chat/ChatRedirect');
  return { default: m.ChatRedirect };
});

export const ChatPopupPage = lazy(async () => {
  const m = await import('../../pages/chat/ChatPopupPage');
  return { default: m.ChatPopupPage };
});

export const ChatPage = lazy(async () => {
  const m = await import('../../pages/chat/ChatPage');
  return { default: m.ChatPage };
});

export const Feed = lazyWithRetry(async () => {
  const m = await import('../../pages/feed/Feed');
  return { default: m.Feed };
});

export const Home = lazyWithRetry(async () => {
  const m = await import('../../pages/home/Home');
  return { default: m.Home };
});

export const Store = lazy(async () => {
  const m = await import('../../pages/marketing/Store');
  return { default: m.Store };
});

export const About = lazy(async () => {
  const m = await import('../../pages/marketing/About');
  return { default: m.About };
});

export const Community = lazy(async () => {
  const m = await import('../../pages/community/Community');
  return { default: m.Community };
});

export const Platform = lazy(async () => {
  const m = await import('../../pages/marketing/Platform');
  return { default: m.Platform };
});

export const Directory = lazyWithRetry(async () => {
  const m = await import('../../pages/community/Directory');
  return { default: m.Directory };
});

export const WeirdlingCreate = lazy(async () => {
  const m = await import('../../pages/weirdling/WeirdlingCreate');
  return { default: m.WeirdlingCreate };
});

export const BumperPage = lazy(async () => {
  const m = await import('../../pages/misc/BumperPage');
  return { default: m.BumperPage };
});

export const ContentSubmitPage = lazy(async () => {
  const m = await import('../../pages/content/ContentSubmitPage');
  return { default: m.ContentSubmitPage };
});

export const PlaylistsPage = lazy(async () => {
  const m = await import('../../pages/content/PlaylistsPage');
  return { default: m.PlaylistsPage };
});

export const PlaylistDetailPage = lazy(async () => {
  const m = await import('../../pages/content/PlaylistDetailPage');
  return { default: m.PlaylistDetailPage };
});

export const ProjectPage = lazy(async () => {
  const m = await import('../../pages/profile/ProjectPage');
  return { default: m.ProjectPage };
});

export const PublicProfilePage = lazy(async () => {
  const m = await import('../../pages/profile/PublicProfilePage');
  return { default: m.PublicProfilePage };
});

export const DivergencePage = lazy(async () => {
  const m = await import('../../pages/misc/DivergencePage');
  return { default: m.DivergencePage };
});

export const EventsPage = lazy(async () => {
  const m = await import('../../pages/community/EventsPage');
  return { default: m.EventsPage };
});

export const EventDetailPage = lazy(async () => {
  const m = await import('../../pages/community/EventDetailPage');
  return { default: m.EventDetailPage };
});

export const NotificationsPage = lazy(async () => {
  const m = await import('../../pages/dashboard/NotificationsPage');
  return { default: m.NotificationsPage };
});

export const GamesPage = lazy(async () => {
  const m = await import('../../pages/dashboard/GamesPage');
  return { default: m.GamesPage };
});

export const PhuzzlePlayPage = lazy(async () => {
  const m = await import('../../pages/dashboard/PhuzzlePlayPage');
  return { default: m.PhuzzlePlayPage };
});

export const TicTacToePlayPage = lazy(async () => {
  const m = await import('../../pages/dashboard/TicTacToePlayPage');
  return { default: m.TicTacToePlayPage };
});

export const HangmanPlayPage = lazy(async () => {
  const m = await import('../../pages/dashboard/HangmanPlayPage');
  return { default: m.HangmanPlayPage };
});

export const ConnectFourPlayPage = lazy(async () => {
  const m = await import('../../pages/dashboard/ConnectFourPlayPage');
  return { default: m.ConnectFourPlayPage };
});

export const SnakePlayPage = lazy(async () => {
  const m = await import('../../pages/dashboard/SnakePlayPage');
  return { default: m.SnakePlayPage };
});

export const SlotsPlayPage = lazy(async () => {
  const m = await import('../../pages/dashboard/SlotsPlayPage');
  return { default: m.SlotsPlayPage };
});

export const CheckersPlayPage = lazy(async () => {
  const m = await import('../../pages/dashboard/CheckersPlayPage');
  return { default: m.CheckersPlayPage };
});

export const TriviaPlayPage = lazy(async () => {
  const m = await import('../../pages/dashboard/TriviaPlayPage');
  return { default: m.TriviaPlayPage };
});

export const Game2048PlayPage = lazy(async () => {
  const m = await import('../../pages/dashboard/Game2048PlayPage');
  return { default: m.Game2048PlayPage };
});

export const TwoTruthsLiePlayPage = lazy(async () => {
  const m = await import('../../pages/dashboard/TwoTruthsLiePlayPage');
  return { default: m.TwoTruthsLiePlayPage };
});

export const WouldYouRatherPlayPage = lazy(async () => {
  const m = await import('../../pages/dashboard/WouldYouRatherPlayPage');
  return { default: m.WouldYouRatherPlayPage };
});

export const DartsPlayPage = lazy(async () => {
  const m = await import('../../pages/dashboard/DartsPlayPage');
  return { default: m.DartsPlayPage };
});

export const CaptionGamePlayPage = lazy(async () => {
  const m = await import('../../pages/dashboard/CaptionGamePlayPage');
  return { default: m.CaptionGamePlayPage };
});

export const WordSearchPlayPage = lazy(async () => {
  const m = await import('../../pages/dashboard/WordSearchPlayPage');
  return { default: m.WordSearchPlayPage };
});

export const BattleshipPlayPage = lazy(async () => {
  const m = await import('../../pages/dashboard/BattleshipPlayPage');
  return { default: m.BattleshipPlayPage };
});

export const ReversiPlayPage = lazy(async () => {
  const m = await import('../../pages/dashboard/ReversiPlayPage');
  return { default: m.ReversiPlayPage };
});

export const BreakoutPlayPage = lazy(async () => {
  const m = await import('../../pages/dashboard/BreakoutPlayPage');
  return { default: m.BreakoutPlayPage };
});

export const ScrabblePlayPage = lazy(async () => {
  const m = await import('../../pages/dashboard/ScrabblePlayPage');
  return { default: m.ScrabblePlayPage };
});

export const TetrisPlayPage = lazy(async () => {
  const m = await import('../../pages/dashboard/TetrisPlayPage');
  return { default: m.TetrisPlayPage };
});

export const MazeChasePlayPage = lazy(async () => {
  const m = await import('../../pages/dashboard/MazeChasePlayPage');
  return { default: m.MazeChasePlayPage };
});

export const ChessPlayPage = lazy(async () => {
  const m = await import('../../pages/dashboard/ChessPlayPage');
  return { default: m.ChessPlayPage };
});

export const BlackjackPlayPage = lazy(async () => {
  const m = await import('../../pages/dashboard/BlackjackPlayPage');
  return { default: m.BlackjackPlayPage };
});

export const DailyWordPlayPage = lazy(async () => {
  const m = await import('../../pages/dashboard/DailyWordPlayPage');
  return { default: m.DailyWordPlayPage };
});

export const SettingsLayout = lazy(async () => {
  const m = await import('../../pages/dashboard/SettingsLayout');
  return { default: m.SettingsLayout };
});

export const SettingsAppearancePage = lazy(async () => {
  const m = await import('../../pages/dashboard/SettingsAppearancePage');
  return { default: m.SettingsAppearancePage };
});

export const SettingsNotificationsPage = lazy(async () => {
  const m = await import('../../pages/dashboard/SettingsNotificationsPage');
  return { default: m.SettingsNotificationsPage };
});

export const SettingsPrivacyPage = lazy(async () => {
  const m = await import('../../pages/dashboard/SettingsPrivacyPage');
  return { default: m.SettingsPrivacyPage };
});

export const GroupsPage = lazy(async () => {
  const m = await import('../../pages/community/GroupsPage');
  return { default: m.GroupsPage };
});

export const SavedPage = lazy(async () => {
  const m = await import('../../pages/community/SavedPage');
  return { default: m.SavedPage };
});

export const AdvertisePage = lazy(async () => {
  const m = await import('../../pages/marketing/AdvertisePage');
  return { default: m.AdvertisePage };
});

export const HelpPage = lazy(async () => {
  const m = await import('../../pages/misc/HelpPage');
  return { default: m.HelpPage };
});

export const CommunityPartnersPage = lazy(async () => {
  const m = await import('../../pages/community/CommunityPartnersPage');
  return { default: m.CommunityPartnersPage };
});

export const UnsubscribePage = lazy(async () => {
  const m = await import('../../pages/misc/UnsubscribePage');
  return { default: m.UnsubscribePage };
});

export const PayRedirectPage = lazy(async () => {
  const m = await import('../../pages/misc/PayRedirectPage');
  return { default: m.PayRedirectPage };
});

export const NotFoundPage = lazy(async () => {
  const m = await import('../../pages/misc/NotFoundPage');
  return { default: m.NotFoundPage };
});

export const AuthCallback = lazy(async () => {
  const m = await import('../../pages/auth/AuthCallback');
  return { default: m.AuthCallback };
});

export const Join = lazy(async () => {
  const m = await import('../../pages/auth/Join');
  return { default: m.Join };
});

export const SignIn = lazy(async () => {
  const m = await import('../../pages/auth/SignIn');
  return { default: m.SignIn };
});

export const Guidelines = lazy(async () => {
  const m = await import('../../pages/legal/Guidelines');
  return { default: m.Guidelines };
});

export const Terms = lazy(async () => {
  const m = await import('../../pages/legal/Terms');
  return { default: m.Terms };
});

export const Privacy = lazy(async () => {
  const m = await import('../../pages/legal/Privacy');
  return { default: m.Privacy };
});

export const AdminApp = lazy(async () => {
  const m = await import('../../pages/admin/core/AdminApp');
  return { default: m.AdminApp };
});

export const AdminDashboard = lazy(async () => {
  const m = await import('../../pages/admin/core/AdminDashboard');
  return { default: m.AdminDashboard };
});

export const AdminAuthCallbackHealthPage = lazy(async () => {
  const m =
    await import('../../pages/admin/auth-callback/AdminAuthCallbackHealthPage');
  return { default: m.AdminAuthCallbackHealthPage };
});

export const AdminContentModerationPage = lazy(async () => {
  const m =
    await import('../../pages/admin/content/AdminContentModerationPage');
  return { default: m.AdminContentModerationPage };
});

export const ChatReportsPage = lazy(async () => {
  const m = await import('../../pages/admin/content/ChatReportsPage');
  return { default: m.ChatReportsPage };
});

export const AdminAdvertisersPage = lazy(async () => {
  const m = await import('../../pages/admin/ads/AdminAdvertisersPage');
  return { default: m.AdminAdvertisersPage };
});

export const AdminPartnersPage = lazy(async () => {
  const m = await import('../../pages/admin/ads/AdminPartnersPage');
  return { default: m.AdminPartnersPage };
});

export const AdminFeatureFlagsPage = lazy(async () => {
  const m = await import('../../pages/admin/ops/AdminFeatureFlagsPage');
  return { default: m.AdminFeatureFlagsPage };
});
