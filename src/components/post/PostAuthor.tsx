/**
 * PostAuthor — shared author line for Feed and Chat (avatar, name, handle, time, edited).
 * Used by FeedCard and MessageList (group messages).
 */
import { Box, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { ProfileAvatar } from '../avatar/ProfileAvatar';

export type PostAuthorProps = {
  /** Avatar image URL */
  avatarUrl?: string | null;
  /** Display name (e.g. "Jane Doe") */
  displayName: string;
  /** Handle for profile link and @mention (optional; no link if missing) */
  handle?: string | null;
  /** Timestamp string (ISO or formatted) */
  createdAt: string;
  /** When set, show "Edited" after time */
  editedAt?: string | null;
  /** Compact: no avatar, just text (e.g. chat group sender line) */
  compact?: boolean;
  /** Size of avatar when not compact */
  avatarSize?: 'small' | 'header';
  /** Formatter for createdAt (default: identity) */
  formatTime?: (iso: string) => string;
  /** Optional extra content below the name row (e.g. "Reposted from ...") */
  children?: React.ReactNode;
};

export const PostAuthor = ({
  avatarUrl,
  displayName,
  handle,
  createdAt,
  editedAt,
  compact = false,
  avatarSize = 'small',
  formatTime = (s) => s,
  children,
}: PostAuthorProps) => {
  const timeStr = formatTime(createdAt);

  if (compact) {
    return (
      <Typography variant="caption" color="primary" sx={{ mb: 0.25 }}>
        {handle ? `@${handle}` : displayName}
      </Typography>
    );
  }

  return (
    <Stack direction="row" spacing={{ xs: 1, sm: 2 }} alignItems="flex-start">
      <ProfileAvatar
        src={avatarUrl ?? undefined}
        alt={displayName || '?'}
        size={avatarSize}
        component={handle ? RouterLink : 'div'}
        to={handle ? `/profile/${handle}` : undefined}
      />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" alignItems="center" flexWrap="wrap" gap={0.5}>
          {handle ? (
            <Typography
              component={RouterLink}
              to={`/profile/${handle}`}
              variant="subtitle1"
              fontWeight={600}
              sx={{
                color: 'text.primary',
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              {displayName}
            </Typography>
          ) : (
            <Typography variant="subtitle1" fontWeight={600}>
              {displayName}
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary">
            • {timeStr}
          </Typography>
          {editedAt && (
            <Typography variant="caption" color="text.secondary">
              • Edited
            </Typography>
          )}
        </Stack>
        {children}
      </Box>
    </Stack>
  );
};
