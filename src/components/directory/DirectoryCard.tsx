import PersonIcon from '@mui/icons-material/Person';
import { Avatar, Box, Paper, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { CARD_BG } from '../../theme/candyStyles';

interface DirectoryCardProps {
  id: string;
  handle: string | null;
  displayName?: string | null;
  pronouns: string | null;
}

export const DirectoryCard = ({
  id,
  handle,
  displayName,
  pronouns,
}: DirectoryCardProps) => {
  /** Canonical profile URL per IA (docs/architecture/information-architecture.md). */
  const profileLink = handle ? `/profile/${handle}` : `/profile/${id}`;
  const title = displayName || handle || '(Anonymous Entity)';

  return (
    <Paper
      component={RouterLink}
      to={profileLink}
      sx={{
        p: 3,
        borderRadius: 3,
        bgcolor: CARD_BG,
        textDecoration: 'none', // Remove link underline
        color: 'inherit',
        border: '1px solid rgba(255,255,255,0.05)',
        transition: 'all 0.2s ease-in-out',
        display: 'block', // Ensure the whole paper is clickable
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          borderColor: 'primary.main',
          background: 'rgba(40, 40, 40, 0.8)',
        },
      }}
    >
      <Stack direction="row" spacing={3} alignItems="center">
        <Avatar
          sx={{
            bgcolor: 'primary.dark',
            width: 56,
            height: 56,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}
        >
          <PersonIcon />
        </Avatar>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'white' }}>
            {title}
          </Typography>
          {pronouns && (
            <Typography
              variant="body2"
              sx={{ color: 'text.secondary', mt: 0.5 }}
            >
              {pronouns}
            </Typography>
          )}
        </Box>
      </Stack>
    </Paper>
  );
};
