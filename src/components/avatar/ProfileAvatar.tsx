/**
 * ProfileAvatar — circular avatars with consistent sizing and fallback.
 * Spec: profile header 160px, feed/comments/nav 48px.
 */
import { Avatar, Box } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';

/** Resolve width/height from sx so initials scale when size is overridden (e.g. nav 24px). */
const resolveDimPx = (value: unknown, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const m = /^(\d+(?:\.\d+)?)px$/.exec(value.trim());
    if (m) return Number(m[1]);
  }
  return fallback;
};

export type ProfileAvatarSize = 'header' | 'small';

const SIZE_PX: Record<ProfileAvatarSize, number> = {
  header: 160,
  small: 48,
};

export interface ProfileAvatarProps {
  /** Resolved avatar URL (photo, preset, or AI Weirdling). */
  src?: string | null;
  /** Display name for alt text and fallback initial. */
  alt: string;
  /** header = 160px, small = 48px. */
  size?: ProfileAvatarSize;
  /** Optional MUI sx overrides. */
  sx?: SxProps<Theme>;
  /** When used as link. */
  component?: React.ElementType;
  to?: string;
}

export const ProfileAvatar = ({
  src,
  alt,
  size = 'small',
  sx = {},
  component,
  to,
}: ProfileAvatarProps) => {
  const px = SIZE_PX[size];
  const initial = (alt || '?').charAt(0).toUpperCase();
  const flatSx =
    typeof sx === 'object' && sx !== null && !Array.isArray(sx)
      ? (sx as Record<string, unknown>)
      : {};
  const dim = Math.min(
    resolveDimPx(flatSx.width, px),
    resolveDimPx(flatSx.height, px),
  );
  const initialFontPx = Math.max(11, Math.round(dim * 0.48));
  const linkProps =
    component && to
      ? ({ component, to } as { component: React.ElementType; to: string })
      : {};

  return (
    <Avatar
      src={src ?? undefined}
      alt={alt}
      {...linkProps}
      sx={{
        width: px,
        height: px,
        borderRadius: '50%',
        bgcolor: 'primary.dark',
        fontSize: `${initialFontPx}px`,
        fontWeight: 600,
        lineHeight: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...flatSx,
      }}
      slotProps={{
        img: {
          loading: size === 'header' ? 'eager' : 'lazy',
          fetchPriority: size === 'header' ? 'high' : 'auto',
          decoding: 'async',
          onError: (e: React.SyntheticEvent<HTMLImageElement>) => {
            (e.target as HTMLImageElement).style.display = 'none';
          },
        },
      }}
    >
      <Box
        component="span"
        sx={{
          display: 'grid',
          placeItems: 'center',
          width: '100%',
          height: '100%',
          lineHeight: 1,
          font: 'inherit',
        }}
      >
        {initial}
      </Box>
    </Avatar>
  );
};
