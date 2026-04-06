/**
 * PostAuthor — shared author line for Feed and Chat (avatar, name, handle, time, edited).
 * Used by FeedCard and MessageList (group messages).
 */
import LinkedInIcon from '@mui/icons-material/LinkedIn';
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
  /** Show small "in" (LinkedIn-style) icon after time (chat UI) */
  inIcon?: boolean;
  /** Optional extra content below the name row (e.g. "Reposted from ...") */
  children?: React.ReactNode;
  /** Optional profile description shown under the author line */
  description?: string | null;
  /** Chat: consecutive message from same sender — omit avatar/header row */
  continuation?: boolean;
  /** Feed: slightly tighter header spacing (avatar + name block) */
  tightHeader?: boolean;
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
  inIcon = false,
  children,
  description,
  continuation = false,
  tightHeader = false,
}: PostAuthorProps) => {
  const timeStr = formatTime(createdAt);
  const trimmedDescription =
    typeof description === 'string' && description.trim()
      ? description.trim()
      : null;

  if (continuation) {
    return null;
  }

  if (compact) {
    return (
      <Typography variant="caption" color="primary" sx={{ mb: 0.25 }}>
        {handle ? `@${handle}` : displayName}
      </Typography>
    );
  }

  return (
    <Stack
      direction="row"
      spacing={tightHeader ? 0.75 : 1}
      alignItems="flex-start"
    >
      <ProfileAvatar
        src={avatarUrl ?? undefined}
        alt={displayName || '?'}
        size={avatarSize}
        component={handle ? RouterLink : 'div'}
        to={handle ? `/profile/${handle}` : undefined}
      />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack
          direction="row"
          alignItems="center"
          flexWrap="wrap"
          gap={0.5}
          sx={{ pr: tightHeader ? 0.75 : 1 }}
        >
          {handle ? (
            <Typography
              component={RouterLink}
              to={`/profile/${handle}`}
              variant="subtitle1"
              fontWeight={700}
              sx={{
                color: 'text.primary',
                textDecoration: 'none',
                fontSize: { xs: '1.02rem', sm: '1.08rem' },
                lineHeight: 1.15,
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              {displayName}
            </Typography>
          ) : (
            <Typography
              variant="subtitle1"
              fontWeight={700}
              sx={{
                fontSize: { xs: '1.02rem', sm: '1.08rem' },
                lineHeight: 1.15,
              }}
            >
              {displayName}
            </Typography>
          )}
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontSize: '0.82rem', lineHeight: 1.15 }}
          >
            • {timeStr}
          </Typography>
          {inIcon && (
            <LinkedInIcon
              sx={{ fontSize: 14, color: '#f59e0b', opacity: 0.95 }}
              aria-hidden
            />
          )}
          {editedAt && (
            <Typography variant="caption" color="text.secondary">
              • Edited
            </Typography>
          )}
        </Stack>
        {trimmedDescription ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: tightHeader ? 0.15 : 0.2,
              lineHeight: 1.2,
              fontSize: '0.82rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 1,
              WebkitBoxOrient: 'vertical',
              maxWidth: '100%',
              opacity: 0.92,
            }}
          >
            {trimmedDescription}
          </Typography>
        ) : null}
        {children}
      </Box>
    </Stack>
  );
};
