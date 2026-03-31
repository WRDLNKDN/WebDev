import type { ReactNode } from 'react';
import { ListSubheader } from '@mui/material';

const SUBHEADER_BASE = {
  bgcolor: 'transparent',
  color: 'text.secondary',
  fontWeight: 600,
  fontSize: '0.7rem',
  py: 0.5,
  px: 2,
} as const;

const EXPLORE_SUBHEADER_SX = {
  bgcolor: 'transparent',
  color: 'text.secondary',
  fontWeight: 700,
  fontSize: '0.75rem',
  letterSpacing: 1,
  pt: 2,
  pb: 0.5,
  px: 2,
} as const;

const SECTION_SUBHEADER_SPACED_SX = {
  bgcolor: 'transparent',
  color: 'text.secondary',
  fontWeight: 600,
  fontSize: '0.7rem',
  px: 2,
  pt: 1.5,
  pb: 0.5,
} as const;

type DrawerNavSubheaderProps = {
  children: ReactNode;
  /** Top section uses extra top padding (e.g. Legal list). */
  paddedTop?: boolean;
  /** Primary drawer title row (Explore). */
  variant?: 'explore' | 'section';
  /** Section after prior content: extra top spacing (Community → Your stuff, etc.). */
  sectionTopSpacing?: boolean;
};

export const DrawerNavSubheader = ({
  children,
  paddedTop,
  variant = 'section',
  sectionTopSpacing,
}: DrawerNavSubheaderProps) => {
  if (variant === 'explore') {
    return (
      <ListSubheader component="div" sx={EXPLORE_SUBHEADER_SX}>
        {children}
      </ListSubheader>
    );
  }
  if (sectionTopSpacing) {
    return (
      <ListSubheader component="div" sx={SECTION_SUBHEADER_SPACED_SX}>
        {children}
      </ListSubheader>
    );
  }
  return (
    <ListSubheader
      component="div"
      sx={{
        ...SUBHEADER_BASE,
        ...(paddedTop ? { pt: 2, pb: 0.5 } : {}),
      }}
    >
      {children}
    </ListSubheader>
  );
};

export const drawerNavListSx = { py: 0 } as const;

export const drawerNavRowButtonSx = { minHeight: 44, py: 0.5 } as const;
