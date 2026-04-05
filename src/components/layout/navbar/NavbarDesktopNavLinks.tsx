/**
 * NavbarDesktopNavLinks — desktop authenticated primary nav buttons.
 *
 * Renders nav items from AUTHED_PRIMARY_NAV config in IA order.
 * Feature-flagged items are omitted entirely — no placeholder, no layout shift.
 * Active state is derived from config isActive() — never ad-hoc inline.
 */
import { Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useFeatureFlag } from '../../../context/FeatureFlagsContext';
import { AUTHED_PRIMARY_NAV, type NavItem } from './navConfig';

type NavbarDesktopNavLinksProps = {
  path: string;
  showAuthedHeader: boolean;
  isCompactDesktop: boolean;
};

const NavLink = ({
  item,
  path,
  isCompactDesktop,
}: {
  item: NavItem;
  path: string;
  isCompactDesktop: boolean;
}) => {
  // Each item reads its own flag — hook rules satisfied by stable config order.
  const flagEnabled = useFeatureFlag(item.flagKey ?? '__always_true__');
  if (item.flagKey && !flagEnabled) return null;

  const isActive = item.isActive(path);

  return (
    <Button
      component={RouterLink}
      to={item.to}
      aria-current={isActive ? 'page' : undefined}
      sx={{
        color: isActive ? 'white' : 'rgba(255,255,255,0.85)',
        textTransform: 'none',
        fontSize: isCompactDesktop ? '0.92rem' : '1rem',
        minWidth: 0,
        px: isCompactDesktop ? 1 : 1.25,
        py: 0.625,
        whiteSpace: 'nowrap',
        borderRadius: 1,
        fontWeight: isActive ? 700 : 400,
        bgcolor: isActive ? 'rgba(156,187,217,0.16)' : 'transparent',
        '&:hover': {
          bgcolor: 'rgba(56,132,210,0.14)',
          color: 'white',
        },
        '&:visited': {
          color: isActive ? 'white' : 'rgba(255,255,255,0.85)',
        },
      }}
    >
      {item.label}
    </Button>
  );
};

export const NavbarDesktopNavLinks = ({
  path,
  showAuthedHeader,
  isCompactDesktop,
}: NavbarDesktopNavLinksProps) => {
  if (!showAuthedHeader) return null;

  return (
    <>
      {AUTHED_PRIMARY_NAV.map((item) => (
        <NavLink
          key={item.to}
          item={item}
          path={path}
          isCompactDesktop={isCompactDesktop}
        />
      ))}
    </>
  );
};
