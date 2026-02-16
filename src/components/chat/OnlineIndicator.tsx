import { Box, Typography } from '@mui/material';

type OnlineIndicatorProps = {
  otherUserId?: string;
  onlineUsers: Set<string>;
  typingUsers: Set<string>;
};

export const OnlineIndicator = ({
  otherUserId,
  onlineUsers,
  typingUsers,
}: OnlineIndicatorProps) => {
  if (!otherUserId) return null;

  const isOnline = onlineUsers.has(otherUserId);
  const isTyping = typingUsers.has(otherUserId);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      {isOnline && (
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: 'success.main',
            flexShrink: 0,
          }}
          aria-label="Online"
        />
      )}
      {isTyping && (
        <Typography variant="caption" color="text.secondary">
          typing…
        </Typography>
      )}
    </Box>
  );
};
