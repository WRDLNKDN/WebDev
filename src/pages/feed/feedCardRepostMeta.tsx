import RepeatOutlinedIcon from '@mui/icons-material/RepeatOutlined';
import { Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

type FeedCardRepostMetaProps = {
  repostDisplayName: string;
  repostOriginalHandle: string | null;
  repostOriginalName: string | null;
};

export const FeedCardRepostMeta = ({
  repostDisplayName,
  repostOriginalHandle,
  repostOriginalName,
}: FeedCardRepostMetaProps) => (
  <Stack spacing={0.35} sx={{ mt: 0.55 }}>
    <Stack direction="row" spacing={0.55} alignItems="center">
      <RepeatOutlinedIcon sx={{ fontSize: 15, color: 'primary.light' }} />
      <Typography
        variant="caption"
        sx={{
          color: 'primary.light',
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      >
        {repostDisplayName} reposted
      </Typography>
    </Stack>
    <Stack direction="row" spacing={0.55} alignItems="center" sx={{ pl: 0.1 }}>
      <Typography
        variant="caption"
        sx={{ color: 'rgba(255,255,255,0.68)', fontWeight: 600 }}
      >
        From
      </Typography>
      {repostOriginalHandle ? (
        <Typography
          component={RouterLink}
          to={`/profile/${repostOriginalHandle}`}
          variant="caption"
          sx={{
            color: 'text.primary',
            textDecoration: 'none',
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
    </Stack>
  </Stack>
);
