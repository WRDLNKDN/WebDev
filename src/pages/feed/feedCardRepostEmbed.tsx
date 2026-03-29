import { Box, Link, Stack, Typography } from '@mui/material';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { ProfileAvatar } from '../../components/avatar/ProfileAvatar';
import { scrollToFeedPost } from '../../lib/feed/deepLink';
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
  const location = useLocation();
  const navigate = useNavigate();
  const displayName = originalName || originalHandle || 'Original member';
  const hasBody = Boolean(originalBody.trim());
  const handleViewOriginalPost = () => {
    if (!repostOriginalId) return;
    if (location.pathname === '/feed' && scrollToFeedPost(repostOriginalId)) {
      return;
    }
    navigate(`/feed?post=${encodeURIComponent(repostOriginalId)}`);
  };

  return (
    <Box
      sx={{
        mt: 1.35,
        borderRadius: 2.25,
        border: '1px solid rgba(156,187,217,0.26)',
        borderLeft: '3px solid rgba(141,188,229,0.42)',
        bgcolor: 'rgba(7,12,21,0.78)',
        boxShadow:
          '0 0 0 1px rgba(56,132,210,0.05) inset, 0 16px 28px rgba(0,0,0,0.16)',
        px: { xs: 1.15, sm: 1.35 },
        py: { xs: 1.1, sm: 1.25 },
      }}
    >
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
            <Link
              component="button"
              type="button"
              variant="caption"
              onClick={handleViewOriginalPost}
              sx={{
                mt: 0.95,
                display: 'inline-flex',
                color: 'primary.light',
                textDecoration: 'none',
                fontWeight: 600,
                p: 0,
                border: 0,
                background: 'transparent',
                cursor: 'pointer',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              View Original Post
            </Link>
          ) : !repostOriginalId ? (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 0.95 }}
            >
              Original post unavailable.
            </Typography>
          ) : null}
        </Box>
      </Stack>
    </Box>
  );
};
