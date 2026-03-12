import { Box, Button, Typography } from '@mui/material';

type ChatPageEmptyStateProps = {
  onStartDm: () => void;
  onCreateGroup: () => void;
};

export const ChatPageEmptyState = ({
  onStartDm,
  onCreateGroup,
}: ChatPageEmptyStateProps) => (
  <Box
    sx={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: 2,
      px: 2,
      textAlign: 'center',
    }}
  >
    <Typography
      variant="overline"
      sx={{ letterSpacing: 1.6, color: 'text.secondary' }}
    >
      Messaging
    </Typography>
    <Typography variant="h5" sx={{ maxWidth: 420 }}>
      Pick a conversation or start one that actually matters.
    </Typography>
    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 480 }}>
      Direct messages stay quick, and groups are better when you need to pull in
      more weirdlings.
    </Typography>
    <Box
      sx={{
        display: 'flex',
        gap: 1.25,
        flexDirection: { xs: 'column', sm: 'row' },
        width: { xs: '100%', sm: 'auto' },
        maxWidth: 420,
      }}
    >
      <Button
        variant="contained"
        onClick={onStartDm}
        sx={{ width: { xs: '100%', sm: 'auto' }, textTransform: 'none' }}
      >
        New 1:1 chat
      </Button>
      <Button
        variant="outlined"
        onClick={onCreateGroup}
        sx={{ width: { xs: '100%', sm: 'auto' }, textTransform: 'none' }}
      >
        New group
      </Button>
    </Box>
  </Box>
);
