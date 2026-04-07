import type { SxProps, Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';

/**
 * Tighter PostCard padding for the main feed (reference: compact social post shells).
 * Chat and other surfaces keep PostCard defaults.
 */
export const feedPostCardContentSx: SxProps<Theme> = {
  pt: { xs: 1, sm: 1.15 },
  pb: { xs: 0.35, sm: 0.5 },
  '&:last-child': { pb: { xs: 1, sm: 1.35 } },
  px: { xs: 1.35, sm: 1.65 },
  pr: { xs: 5.5, sm: 6 },
};

/**
 * Pulls media / link previews out to the card content horizontal edges (aligned with
 * avatar column), matching a full-bleed strip under the text column.
 */
export function feedMediaBleedSx(theme: Theme): SystemStyleObject<Theme> {
  return {
    ml: { xs: -5.75, sm: -6.5 },
    width: {
      xs: `calc(100% + ${theme.spacing(5.75)})`,
      sm: `calc(100% + ${theme.spacing(6.5)})`,
    },
    maxWidth: 'none',
    boxSizing: 'border-box',
  };
}

/** Flush media corners inside a card that already has border-radius + overflow hidden. */
export const feedMediaFlushRadiusSx: SystemStyleObject<Theme> = {
  borderRadius: 0,
  border: 'none',
};
