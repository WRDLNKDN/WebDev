import { Avatar, Box, Chip, Paper, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  getProfileLink,
  type DirectoryMember,
} from '../../lib/api/directoryApi';
import { CARD_BG } from '../../theme/candyStyles';
import { DirectoryRowActions } from './row/DirectoryRowActions';

const DIRECTORY_TEXT_SECONDARY = 'rgba(255,255,255,0.82)';
const DIRECTORY_TEXT_MUTED = 'rgba(255,255,255,0.72)';

interface DirectoryRowProps {
  member: DirectoryMember;
  onConnect: (id: string) => void;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  onDisconnect: (member: DirectoryMember) => void;
  onBlock: (member: DirectoryMember) => void;
  onSkillClick: (skill: string) => void;
  busy?: boolean;
}

export const DirectoryRow = ({
  member,
  onConnect,
  onAccept,
  onDecline,
  onDisconnect,
  onBlock,
  onSkillClick,
  busy = false,
}: DirectoryRowProps) => {
  const [manageAnchor, setManageAnchor] = useState<HTMLElement | null>(null);
  const profileLink = getProfileLink(member);
  const displayName = member.display_name || member.handle || '(Anonymous)';

  const avatarUrl = member.avatar;

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 1.5, md: 2 },
        borderRadius: 2,
        bgcolor: CARD_BG,
        border: '1px solid rgba(156,187,217,0.18)',
        overflow: 'hidden',
        transition: 'border-color 140ms ease, transform 140ms ease',
        '&:hover': {
          borderColor: 'rgba(141,188,229,0.38)',
          transform: 'translateY(-1px)',
        },
      }}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={{ xs: 1.5, md: 2 }}
        alignItems="flex-start"
      >
        <Box
          component={RouterLink}
          to={profileLink}
          sx={{ textDecoration: 'none', flexShrink: 0 }}
          aria-label={`View ${displayName}'s profile`}
        >
          <Avatar
            src={avatarUrl ?? undefined}
            alt={displayName}
            sx={{
              width: 60,
              height: 60,
              bgcolor: 'primary.dark',
              border: '2px solid rgba(156,187,217,0.22)',
            }}
          />
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            component={RouterLink}
            to={profileLink}
            variant="h6"
            sx={{
              fontWeight: 700,
              color: 'white',
              textDecoration: 'none',
              width: 'fit-content',
              '&:hover': { color: 'primary.light' },
            }}
          >
            {displayName}
          </Typography>
          {member.handle && (
            <Typography
              variant="caption"
              sx={{ color: DIRECTORY_TEXT_SECONDARY }}
              display="block"
            >
              @{member.handle}
            </Typography>
          )}
          {member.pronouns && (
            <Typography
              variant="body2"
              sx={{ color: DIRECTORY_TEXT_SECONDARY }}
            >
              {member.pronouns}
            </Typography>
          )}
          {member.tagline && (
            <Typography
              variant="body2"
              color="primary.main"
              sx={{ fontWeight: 600 }}
            >
              {member.tagline}
            </Typography>
          )}
          {(member.industry ||
            member.secondary_industry ||
            member.location) && (
            <Typography
              variant="caption"
              sx={{ color: DIRECTORY_TEXT_MUTED }}
              display="block"
            >
              {[member.industry, member.secondary_industry, member.location]
                .filter(Boolean)
                .join(' • ')}
            </Typography>
          )}
          {member.skills?.length > 0 && (
            <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 1 }}>
              {member.skills.slice(0, 3).map((skill) => (
                <Chip
                  key={skill}
                  label={skill}
                  size="small"
                  onClick={() => onSkillClick(skill)}
                  sx={{
                    height: 24,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'primary.dark' },
                  }}
                />
              ))}
            </Stack>
          )}
          {member.bio_snippet && (
            <Typography
              variant="body2"
              sx={{
                color: DIRECTORY_TEXT_SECONDARY,
                mt: 1,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {member.bio_snippet}
            </Typography>
          )}
        </Box>

        <DirectoryRowActions
          member={member}
          busy={busy}
          manageAnchor={manageAnchor}
          onManageOpen={(anchor) => setManageAnchor(anchor)}
          onManageClose={() => setManageAnchor(null)}
          onConnect={onConnect}
          onAccept={onAccept}
          onDecline={onDecline}
          onDisconnect={onDisconnect}
          onBlock={onBlock}
        />
      </Stack>
    </Paper>
  );
};
