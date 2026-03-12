import BlockIcon from '@mui/icons-material/Block';
import ChatIcon from '@mui/icons-material/Chat';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import { Button, Chip, Menu, MenuItem, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import type { DirectoryMember } from '../../../lib/api/directoryApi';
import { connectionStateLabel } from '../../../lib/directory/connectionState';
import { INTERACTION_COLORS } from '../../../theme/themeConstants';

type DirectoryRowActionsProps = {
  member: DirectoryMember;
  busy: boolean;
  manageAnchor: HTMLElement | null;
  onManageOpen: (anchor: HTMLElement) => void;
  onManageClose: () => void;
  onConnect: (id: string) => void;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  onDisconnect: (member: DirectoryMember) => void;
  onBlock: (member: DirectoryMember) => void;
};

export const DirectoryRowActions = ({
  member,
  busy,
  manageAnchor,
  onManageOpen,
  onManageClose,
  onConnect,
  onAccept,
  onDecline,
  onDisconnect,
  onBlock,
}: DirectoryRowActionsProps) => {
  const actionButtonSx = {
    borderColor: 'rgba(141,188,229,0.50)',
    color: 'white',
    minHeight: { xs: 40, sm: 32 },
    '& .MuiButton-startIcon, & .MuiButton-endIcon': { mx: 0 },
  } as const;

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1}
      flexShrink={0}
      alignItems={{ xs: 'stretch', sm: 'center' }}
      sx={{ width: { xs: '100%', sm: 'auto' } }}
    >
      {member.connection_state === 'pending_received' && (
        <Typography
          variant="caption"
          sx={{
            color: 'warning.main',
            fontWeight: 700,
            textDecoration: 'underline',
            textUnderlineOffset: '4px',
          }}
        >
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
          sx={actionButtonSx}
        >
          Connect
        </Button>
      )}
      {member.connection_state === 'pending' && (
        <Chip
          icon={<HourglassTopIcon fontSize="small" />}
          label="Pending approval"
          variant="outlined"
          sx={{
            height: { xs: 40, sm: 32 },
            color: 'warning.main',
            borderColor: 'warning.main',
            fontWeight: 700,
            textDecoration: 'underline',
            textUnderlineOffset: '4px',
            '& .MuiChip-icon': { color: 'inherit' },
          }}
        />
      )}
      {member.connection_state === 'pending_received' && (
        <>
          <Button
            variant="contained"
            size="small"
            startIcon={<CheckCircleOutlineIcon />}
            onClick={() => onAccept(member.id)}
            disabled={busy}
            sx={{ minHeight: { xs: 40, sm: 32 } }}
          >
            Accept
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<BlockIcon />}
            onClick={() => onDecline(member.id)}
            disabled={busy}
            sx={actionButtonSx}
          >
            Decline
          </Button>
        </>
      )}
      {member.connection_state === 'connected' && (
        <>
          <Chip
            icon={<CheckCircleOutlineIcon fontSize="small" />}
            label="Connected"
            variant="outlined"
            sx={{
              height: { xs: 40, sm: 32 },
              color: 'success.main',
              borderColor: 'success.main',
              fontWeight: 700,
              textDecoration: 'underline',
              textUnderlineOffset: '4px',
              '& .MuiChip-icon': { color: 'inherit' },
            }}
          />
          <Button
            variant="outlined"
            size="small"
            component={RouterLink}
            to={`/chat?with=${member.id}`}
            startIcon={<ChatIcon />}
            sx={actionButtonSx}
          >
            Chat
          </Button>
          <Button
            variant="outlined"
            size="small"
            endIcon={<ExpandMoreIcon />}
            onClick={(e) => onManageOpen(e.currentTarget)}
            disabled={busy}
            aria-haspopup="true"
            aria-expanded={Boolean(manageAnchor)}
            aria-pressed={Boolean(manageAnchor)}
            aria-label="Manage connection"
            sx={actionButtonSx}
          >
            Manage
          </Button>
          <Menu
            anchorEl={manageAnchor}
            open={Boolean(manageAnchor)}
            onClose={onManageClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            slotProps={{
              paper: {
                sx: {
                  minWidth: 160,
                  mt: 1.25,
                  borderRadius: 2,
                  bgcolor: 'rgba(30,30,30,0.98)',
                  border: '1px solid rgba(156,187,217,0.26)',
                },
              },
            }}
          >
            <MenuItem
              onClick={() => {
                onManageClose();
                onDisconnect(member);
              }}
              sx={{ gap: 1, py: 1.25 }}
            >
              <PersonRemoveIcon fontSize="small" />
              Disconnect
            </MenuItem>
            <MenuItem
              onClick={() => {
                onManageClose();
                onBlock(member);
              }}
              sx={{
                gap: 1,
                py: 1.25,
                color: INTERACTION_COLORS.love,
                fontWeight: 700,
              }}
            >
              <BlockIcon fontSize="small" />
              Block
            </MenuItem>
          </Menu>
        </>
      )}
    </Stack>
  );
};
