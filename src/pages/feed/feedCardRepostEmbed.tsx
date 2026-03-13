import RepeatOutlinedIcon from '@mui/icons-material/RepeatOutlined';
import { Box, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { ProfileAvatar } from '../../components/avatar/ProfileAvatar';
import { formatPostTime } from '../../lib/post/formatPostTime';
import { linkifyBody } from './feedRenderUtils';

type FeedCardRepostEmbedProps = {
  originalAvatarUrl?: string | null;
  originalHandle: string | null;
  originalName: string | null;
  originalBody: string;
  originalCreatedAt?: string | null;
  repostOriginalId: string | null;
};

export const FeedCardRepostEmbed = ({
  originalAvatarUrl,
  originalHandle,
  originalName,
  originalBody,
  originalCreatedAt,
  repostOriginalId,
}: FeedCardRepostEmbedProps) => {
  const displayName = originalName || originalHandle || 'Original member';
  const hasBody = Boolean(originalBody.trim());

  return (
    <Box
      sx={{
        mt: 1.35,
        borderRadius: 2.25,
        border: '1px solid rgba(156,187,217,0.26)',
        bgcolor: 'rgba(7,12,21,0.7)',
        boxShadow: '0 0 0 1px rgba(56,132,210,0.04) inset',
        px: { xs: 1.15, sm: 1.35 },
        py: { xs: 1.1, sm: 1.25 },
      }}
    >
      <Stack
        direction="row"
        spacing={0.75}
        alignItems="center"
        sx={{ mb: 0.95, color: 'text.secondary' }}
      >
        <RepeatOutlinedIcon sx={{ fontSize: 16, color: 'primary.light' }} />
        <Typography
          variant="caption"
          sx={{
            fontSize: '0.76rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: 'primary.light',
          }}
        >
          Original Post
        </Typography>
      </Stack>

      <Stack direction="row" spacing={1} alignItems="flex-start">
        <ProfileAvatar
          src={originalAvatarUrl ?? undefined}
          alt={displayName}
          size="small"
          component={originalHandle ? RouterLink : 'div'}
          to={originalHandle ? `/profile/${originalHandle}` : undefined}
        />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack
            direction="row"
            spacing={0.5}
            alignItems="center"
            flexWrap="wrap"
          >
            {originalHandle ? (
              <Typography
                component={RouterLink}
                to={`/profile/${originalHandle}`}
                variant="body2"
                sx={{
                  color: 'text.primary',
                  textDecoration: 'none',
                  fontWeight: 700,
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                {displayName}
              </Typography>
            ) : (
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {displayName}
              </Typography>
            )}
            {originalCreatedAt ? (
              <Typography variant="caption" color="text.secondary">
                • {formatPostTime(originalCreatedAt)}
              </Typography>
            ) : null}
          </Stack>

          {hasBody ? (
            <Typography
              variant="body2"
              component="div"
              sx={{
                mt: 0.7,
                color: 'text.primary',
                whiteSpace: 'pre-wrap',
                overflowWrap: 'break-word',
                wordBreak: 'break-word',
              }}
            >
              {linkifyBody(originalBody)}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.7 }}>
              Original post content unavailable.
            </Typography>
          )}

          {repostOriginalId ? (
            <Typography
              component={RouterLink}
              to={`/feed?post=${encodeURIComponent(repostOriginalId)}`}
              variant="caption"
              sx={{
                mt: 0.95,
                display: 'inline-flex',
                color: 'primary.light',
                textDecoration: 'none',
                fontWeight: 600,
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              View original post
            </Typography>
          ) : null}
        </Box>
      </Stack>
    </Box>
  );
};
