/** Feed grid alpha on dark shell (slightly softer on feed route). */
export function layoutFeedGridAlpha(isLight: boolean, isFeedRoute: boolean) {
  return !isLight && isFeedRoute ? 0.032 : 0.06;
}

export function buildDarkShellBackground(feedGridAlpha: number) {
  return {
    backgroundImage: {
      xs: 'url("/assets/background-mobile.png")',
      md: 'url("/assets/background-desktop.png")',
    },
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: { xs: 'scroll', md: 'fixed' },
    position: 'relative' as const,
    '&::before': {
      content: '""',
      position: 'absolute',
      inset: 0,
      backgroundImage: `
                  linear-gradient(rgba(56,132,210,${feedGridAlpha}) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(56,132,210,${feedGridAlpha}) 1px, transparent 1px)
                `,
      backgroundSize: '24px 24px',
      pointerEvents: 'none',
      zIndex: 0,
    },
  };
}

const HOME_SHELL_REVEAL_TRANSITION =
  'opacity 1500ms cubic-bezier(0.33, 1, 0.68, 1) 120ms';

type RootShellArgs = {
  isHome: boolean;
  isLight: boolean;
  homeMatteFeatureEnabled: boolean;
  matteDuringHomeVideo: boolean;
  feedGridAlpha: number;
};

export function buildRootShellSx({
  isHome,
  isLight,
  homeMatteFeatureEnabled,
  matteDuringHomeVideo,
  feedGridAlpha,
}: RootShellArgs) {
  const darkShellBg = buildDarkShellBackground(feedGridAlpha);

  if (isHome && homeMatteFeatureEnabled && !isLight) {
    return {
      ...darkShellBg,
      '&::after': {
        content: '""',
        position: 'absolute',
        inset: 0,
        backgroundColor: '#000000',
        opacity: matteDuringHomeVideo ? 1 : 0,
        pointerEvents: 'none',
        transition: HOME_SHELL_REVEAL_TRANSITION,
        zIndex: 0,
      },
    };
  }

  if (isLight) {
    return { backgroundImage: 'none' };
  }

  return darkShellBg;
}

type ScrollContainerSxArgs = {
  isJoin: boolean;
  isHome: boolean;
  isFeedRoute: boolean;
  isLight: boolean;
};

export function buildAppScrollContainerSx({
  isJoin,
  isHome,
  isFeedRoute,
  isLight,
}: ScrollContainerSxArgs) {
  let overflowY: 'hidden' | 'scroll' | 'auto';
  if (isJoin) {
    overflowY = 'hidden';
  } else if (isHome) {
    overflowY = 'scroll';
  } else {
    overflowY = 'auto';
  }

  return {
    position: 'relative',
    zIndex: 1,
    flex: 1,
    minHeight: 0,
    overflowY,
    overflowX: 'hidden',
    WebkitOverflowScrolling: 'touch',
    willChange: 'scroll-position',
    contain: 'layout style paint',
    ...(isFeedRoute && !isLight
      ? {
          '&::after': {
            content: '""',
            position: 'absolute',
            inset: 0,
            minHeight: '100%',
            pointerEvents: 'none',
            zIndex: 0,
            background: [
              'radial-gradient(ellipse 95% 55% at 50% 0%, rgba(6,10,20,0.78) 0%, transparent 58%)',
              'linear-gradient(180deg, rgba(5,7,15,0.55) 0%, rgba(5,7,15,0.35) 45%, rgba(5,7,15,0.2) 100%)',
            ].join(','),
          },
          '& > *': {
            position: 'relative',
            zIndex: 1,
          },
        }
      : {}),
  };
}
