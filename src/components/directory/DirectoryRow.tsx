import BlockIcon from '@mui/icons-material/Block';
import ChatIcon from '@mui/icons-material/Chat';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import type { DirectoryMember } from '../../lib/api/directoryApi';
import { connectionStateLabel } from '../../lib/directory/connectionState';
import { CARD_BG } from '../../theme/candyStyles';

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
  const profileLink = member.handle
    ? `/profile/${member.handle}`
    : `/profile/${member.id}`;
  const displayName = member.display_name || member.handle || '(Anonymous)';

  const avatarUrl = member.avatar;

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 1.25, md: 2 },
        borderRadius: 2,
        bgcolor: CARD_BG,
        border: '1px solid rgba(255,255,255,0.08)',
        overflow: 'hidden',
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
        >
          <Avatar
            src={avatarUrl ?? undefined}
            alt={displayName}
            sx={{
              width: 56,
              height: 56,
              bgcolor: 'primary.dark',
              border: '2px solid rgba(255,255,255,0.1)',
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
              '&:hover': { color: 'primary.light' },
            }}
          >
            {displayName}
          </Typography>
          {member.pronouns && (
            <Typography variant="body2" color="text.secondary">
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
              color="text.secondary"
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
              color="text.secondary"
              sx={{
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

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          flexShrink={0}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          {member.connection_state === 'pending_received' && (
            <Typography variant="caption" sx={{ color: 'warning.main' }}>
              {connectionStateLabel[member.connection_state]}
            </Typography>
          )}
          {member.connection_state === 'not_connected' && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<PersonAddIcon />}
              onClick={() => onConnect(member.id)}
              disabled={busy}
              sx={{
                borderColor: 'rgba(255,255,255,0.3)',
                color: 'white',
                minHeight: { xs: 40, sm: 32 },
              }}
            >
              Connect
            </Button>
          )}
          {member.connection_state === 'pending' && (
            <Button
              variant="outlined"
              size="small"
              disabled
              sx={{
                minHeight: { xs: 40, sm: 32 },
                color: 'warning.main',
                borderColor: 'warning.main',
              }}
            >
              Pending approval
            </Button>
          )}
          {member.connection_state === 'pending_received' && (
            <>
              <Button
                variant="contained"
                size="small"
                onClick={() => onAccept(member.id)}
                disabled={busy}
                sx={{ minHeight: { xs: 40, sm: 32 } }}
              >
                Accept
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => onDecline(member.id)}
                disabled={busy}
                sx={{
                  borderColor: 'rgba(255,255,255,0.3)',
                  color: 'white',
                  minHeight: { xs: 40, sm: 32 },
                }}
              >
                Decline
              </Button>
            </>
          )}
          {member.connection_state === 'connected' && (
            <>
              <Button
                variant="outlined"
                size="small"
                component={RouterLink}
                to={`/chat?with=${member.id}`}
                startIcon={<ChatIcon />}
                sx={{
                  borderColor: 'rgba(255,255,255,0.3)',
                  color: 'white',
                  minHeight: { xs: 40, sm: 32 },
                }}
              >
                Chat
              </Button>
              <Button
                variant="outlined"
                size="small"
                endIcon={<ExpandMoreIcon />}
                onClick={(e) => setManageAnchor(e.currentTarget)}
                disabled={busy}
                aria-haspopup="true"
                aria-expanded={Boolean(manageAnchor)}
                aria-label="Manage connection"
                sx={{
                  borderColor: 'rgba(255,255,255,0.3)',
                  color: 'white',
                  minHeight: { xs: 40, sm: 32 },
                }}
              >
                Manage
              </Button>
              <Menu
                anchorEl={manageAnchor}
                open={Boolean(manageAnchor)}
                onClose={() => setManageAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{
                  paper: {
                    sx: {
                      minWidth: 160,
                      mt: 1.25,
                      borderRadius: 2,
                      bgcolor: 'rgba(30,30,30,0.98)',
                      border: '1px solid rgba(255,255,255,0.12)',
                    },
                  },
                }}
              >
                <MenuItem
                  onClick={() => {
                    setManageAnchor(null);
                    onDisconnect(member);
                  }}
                  sx={{ gap: 1, py: 1.25 }}
                >
                  <PersonRemoveIcon fontSize="small" />
                  Disconnect
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    setManageAnchor(null);
                    onBlock(member);
                  }}
                  sx={{ gap: 1, py: 1.25, color: 'error.main' }}
                >
                  <BlockIcon fontSize="small" />
                  Block
                </MenuItem>
              </Menu>
            </>
          )}
        </Stack>
      </Stack>
    </Paper>
  );
};
