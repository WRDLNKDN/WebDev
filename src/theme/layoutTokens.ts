import type { SxProps, Theme } from '@mui/material/styles';

/**
 * Named layout widths — prefer these over magic numbers so feed, directory,
 * and dialogs stay aligned when we tune the column.
 */

/** Main feed stream column (desktop); matches a readable phone-sized column when centered. */
export const LAYOUT_FEED_STREAM_MAX_WIDTH_PX = 680;

/** Short intro / subhead measure (feed hero, directory blurb). */
export const LAYOUT_INTRO_COPY_MAX_WIDTH_PX = 520;

/** Join / narrow form column (single-field flows). */
export const LAYOUT_NARROW_FORM_MAX_WIDTH_PX = 520;

/** MUI `Container` maxWidth for long-form reading (legal, marketing, community hubs). */
export const LAYOUT_READING_CONTAINER_MAX_WIDTH = 'md' as const;

/**
 * Horizontal padding for page-level wrappers (theme spacing units).
 * Use on outer `Box` when not using `Container`.
 */
export const layoutPagePaddingX: SxProps<Theme> = {
  px: { xs: 2, sm: 2.5 },
};

/**
 * Bottom inset for the primary app scroll region so the last content clears
 * the iOS home indicator and Android gesture bar.
 */
export const layoutScrollSafeBottomSx: SxProps<Theme> = {
  paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
};
