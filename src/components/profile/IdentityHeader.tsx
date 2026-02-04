import { Avatar, Box, Chip, Paper, Stack, Typography } from '@mui/material';
import React from 'react';

interface IdentityHeaderProps {
  displayName: string;
  tagline: string;
  bio: string;
  avatarUrl: string;
  statusEmoji: string;
  statusMessage: string;
  actions?: React.ReactNode; // For the Edit/Settings buttons in Dashboard
}

const CARD_BG = 'rgba(30, 30, 30, 0.65)';

export const IdentityHeader = ({
  displayName,
  tagline,
  bio,
  avatarUrl,
  statusEmoji,
  statusMessage,
  actions,
}: IdentityHeaderProps) => (
  <Paper
    elevation={24}
    sx={{
      p: 4,
      borderRadius: 4,
      bgcolor: CARD_BG,
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255,255,255,0.1)',
      mb: 4,
      position: 'relative',
    }}
  >
    <Chip
      label={`${statusEmoji} ${statusMessage}`}
      color="primary"
      sx={{
        position: 'absolute',
        top: -16,
        right: 32,
        fontWeight: 600,
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      }}
    />
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={4}
      alignItems="center"
      sx={{ textAlign: { xs: 'center', md: 'left' } }}
    >
      <Avatar
        src={avatarUrl}
        alt={displayName}
        sx={{
          width: 140,
          height: 140,
          border: '4px solid rgba(255,255,255,0.1)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}
      />
      <Box sx={{ flexGrow: 1 }}>
        <Typography
          variant="h3"
          sx={{ fontWeight: 700, mb: 1, letterSpacing: -0.5 }}
        >
          {displayName}
        </Typography>
        <Typography
          variant="h6"
          color="primary.light"
          sx={{ mb: 2, fontWeight: 500 }}
        >
          {tagline}
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ maxWidth: 700, mx: { xs: 'auto', md: 0 }, lineHeight: 1.6 }}
        >
          {bio}
        </Typography>
      </Box>
      {actions && <Stack spacing={2}>{actions}</Stack>}
    </Stack>
  </Paper>
);
