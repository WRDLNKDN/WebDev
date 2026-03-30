import { useSyncExternalStore } from 'react';
import {
  useFeatureFlag,
  useProductionComingSoonMode,
} from '../../context/FeatureFlagsContext';
import { useMessenger } from '../../context/MessengerContext';
import {
  getHomeHeroPhaseSnapshot,
  subscribeHomeHeroPhase,
} from '../../lib/utils/homeHeroPhaseStore';
import { chatUiForMember } from '../../lib/utils/chatUiForMember';
import { homeMatteUntilContentRevealEnabled } from '../../lib/utils/homeMatteUntilReveal';
import {
  shouldShowChatPopover,
  shouldShowDockedFooter,
} from './layoutMessengerVisibility';
import {
  buildAppScrollContainerSx,
  buildRootShellSx,
  layoutFeedGridAlpha,
} from './layoutShellSx';
import { useLayoutChromeState } from './useLayoutChromeState';
import { useLayoutSupabaseSession } from './useLayoutLifecycleEffects';

/**
 * Derived layout shell state (keeps `LayoutContent` shallow for cognitive-complexity rules).
 */
export function useLayoutShellModel() {
  const {
    hideFooterForDockedChat,
    isJoin,
    isAdmin,
    isHome,
    isFeedRoute,
    isLight,
  } = useLayoutChromeState();
  const messenger = useMessenger();
  const session = useLayoutSupabaseSession();
  const chatEnabled = useFeatureFlag('chat');
  const productionComingSoon = useProductionComingSoonMode();

  const showMessengerUi =
    !isAdmin &&
    !productionComingSoon &&
    chatUiForMember(chatEnabled, session?.user?.id);

  const showFooter = shouldShowDockedFooter(
    isJoin,
    isAdmin,
    hideFooterForDockedChat,
  );
  const showPopover = shouldShowChatPopover(
    showMessengerUi,
    session,
    messenger,
  );

  const homeHeroShellPhase = useSyncExternalStore(
    subscribeHomeHeroPhase,
    getHomeHeroPhaseSnapshot,
    () => 'video' as const,
  );

  const matteDuringHomeVideo =
    isHome &&
    homeMatteUntilContentRevealEnabled() &&
    homeHeroShellPhase === 'video';

  const homeMatteFeatureEnabled = homeMatteUntilContentRevealEnabled();
  const feedGridAlpha = layoutFeedGridAlpha(isLight, isFeedRoute);
  const rootShellSx = buildRootShellSx({
    isHome,
    isLight,
    homeMatteFeatureEnabled,
    matteDuringHomeVideo,
    feedGridAlpha,
  });

  const rootBgcolor = 'background.default' as const;

  const scrollContainerSx = buildAppScrollContainerSx({
    isJoin,
    isHome,
    isFeedRoute,
    isLight,
  });

  return {
    session,
    messenger,
    rootShellSx,
    rootBgcolor,
    scrollContainerSx,
    showFooter,
    showMessengerUi,
    showPopover,
  };
}
