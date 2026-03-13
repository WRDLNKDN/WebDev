import { Avatar, Box, Chip, Paper, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  getProfileLink,
  type DirectoryMember,
} from '../../lib/api/directoryApi';
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
        p: { xs: 1.05, md: 1.1 },
        borderRadius: 1.25,
        bgcolor: 'rgba(18, 22, 36, 0.74)',
        border: '1px solid rgba(255,255,255,0.08)',
        overflow: 'hidden',
        transition: 'border-color 140ms ease, background-color 140ms ease',
        '&:hover': {
          borderColor: 'rgba(255,255,255,0.16)',
          bgcolor: 'rgba(18, 22, 36, 0.82)',
        },
      }}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={{ xs: 1, md: 1.1 }}
        alignItems={{ xs: 'flex-start', md: 'center' }}
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
              width: { xs: 54, md: 48 },
              height: { xs: 54, md: 48 },
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
              fontSize: { xs: '1.08rem', md: '0.98rem' },
              lineHeight: 1.15,
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
              sx={{ color: DIRECTORY_TEXT_SECONDARY, lineHeight: 1.25 }}
            >
              {member.pronouns}
            </Typography>
          )}
          {member.tagline && (
            <Typography
              variant="body2"
              color="primary.main"
              sx={{ fontWeight: 600, lineHeight: 1.3, mt: 0.15 }}
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
            <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 0.75 }}>
              {member.skills.slice(0, 3).map((skill) => (
                <Chip
                  key={skill}
                  label={skill}
                  size="small"
                  onClick={() => onSkillClick(skill)}
                  sx={{
                    height: 22,
                    fontSize: '0.72rem',
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
                mt: 0.75,
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
