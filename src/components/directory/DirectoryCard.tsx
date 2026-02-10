import PersonIcon from '@mui/icons-material/Person';
import {
  Avatar,
  Box,
  IconButton,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLinkedin } from '@fortawesome/free-brands-svg-icons';
import type { SocialLink } from '../../types/profile';
import { CARD_BG } from '../../theme/candyStyles';

interface DirectoryCardProps {
  id: string;
  handle: string | null;
  pronouns: string | null;
  tagline: string;
  /** When present, a visible LinkedIn link is shown so viewers can open their profile from the card */
  socials?: SocialLink[] | null;
}

function getLinkedInUrl(
  socials: SocialLink[] | null | undefined,
): string | null {
  if (!socials || !Array.isArray(socials)) return null;
  const link = socials.find(
    (s) =>
      s.platform?.toLowerCase() === 'linkedin' && s.isVisible && s.url?.trim(),
  );
  return link?.url?.trim() || null;
}

export const DirectoryCard = ({
  id,
  handle,
  pronouns,
  tagline,
  socials,
}: DirectoryCardProps) => {
  const profileLink = handle ? `/u/${handle}` : `/u/${id}`;
  const linkedInUrl = getLinkedInUrl(socials ?? null);

  return (
    <Paper
      component={RouterLink}
      to={profileLink}
      sx={{
        p: 3,
        borderRadius: 3,
        bgcolor: CARD_BG,
        textDecoration: 'none',
        color: 'inherit',
        border: '1px solid rgba(255,255,255,0.05)',
        transition: 'all 0.2s ease-in-out',
        display: 'block',
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
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'white' }}>
            {handle || '(Anonymous Entity)'}
          </Typography>
          {(pronouns || tagline) && (
            <Typography
              variant="body2"
              sx={{ color: 'text.secondary', mt: 0.5 }}
            >
              {[pronouns, tagline].filter(Boolean).join(' • ')}
            </Typography>
          )}
        </Box>
        {linkedInUrl && (
          <IconButton
            component="a"
            href={linkedInUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            sx={{
              color: '#0077b5',
              '&:hover': { color: '#00a0dc', bgcolor: 'rgba(0,119,181,0.12)' },
            }}
            size="small"
            aria-label="Open LinkedIn profile"
          >
            <FontAwesomeIcon icon={faLinkedin} />
          </IconButton>
        )}
      </Stack>
    </Paper>
  );
};
