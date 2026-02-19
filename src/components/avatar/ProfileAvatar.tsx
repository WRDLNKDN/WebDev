/**
 * ProfileAvatar — circular avatars with consistent sizing and fallback.
 * Spec: profile header 160px, feed/comments/nav 48px.
 */
import { Avatar } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';

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
        ...((typeof sx === 'object' && !Array.isArray(sx) ? sx : {}) as object),
      }}
      slotProps={{
        img: {
          onError: (e: React.SyntheticEvent<HTMLImageElement>) => {
            (e.target as HTMLImageElement).style.display = 'none';
          },
        },
      }}
    >
      {initial}
    </Avatar>
  );
};
