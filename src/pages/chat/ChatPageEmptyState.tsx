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
    }}
  >
    <Typography variant="h6" color="text.secondary">
      Select a conversation or start a new chat
    </Typography>
    <Box sx={{ display: 'flex', gap: 2 }}>
      <Button variant="contained" onClick={onStartDm}>
        New 1:1 chat
      </Button>
      <Button variant="outlined" onClick={onCreateGroup}>
        New group
      </Button>
    </Box>
  </Box>
);
