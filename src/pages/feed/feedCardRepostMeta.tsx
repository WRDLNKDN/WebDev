import { Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

type FeedCardRepostMetaProps = {
  repostOriginalHandle: string | null;
  repostOriginalName: string | null;
  repostOriginalId: string | null;
};

export const FeedCardRepostMeta = ({
  repostOriginalHandle,
  repostOriginalName,
  repostOriginalId,
}: FeedCardRepostMetaProps) => (
  <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.25 }}>
    <Typography variant="caption" color="text.secondary">
      Reposted from
    </Typography>
    {repostOriginalHandle ? (
      <Typography
        component={RouterLink}
        to={`/profile/${repostOriginalHandle}`}
        variant="caption"
        sx={{
          color: 'text.secondary',
          textDecoration: 'underline',
          '&:hover': { color: 'text.primary' },
        }}
      >
        {repostOriginalName || `@${repostOriginalHandle}`}
      </Typography>
    ) : (
      <Typography variant="caption" color="text.secondary">
        original member
      </Typography>
    )}
    {repostOriginalId && (
      <Typography
        component={RouterLink}
        to={`/feed?post=${encodeURIComponent(repostOriginalId)}`}
        variant="caption"
        sx={{
          color: 'text.secondary',
          textDecoration: 'underline',
          '&:hover': { color: 'text.primary' },
        }}
      >
        original post
      </Typography>
    )}
  </Stack>
);
