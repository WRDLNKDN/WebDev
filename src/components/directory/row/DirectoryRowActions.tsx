import BlockIcon from '@mui/icons-material/Block';
import ChatIcon from '@mui/icons-material/Chat';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import {
  Button,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  useMediaQuery,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { Link as RouterLink } from 'react-router-dom';
import type { DirectoryMember } from '../../../lib/api/directoryApi';
import { connectionStateLabel } from '../../../lib/directory/connectionState';
import { denseMenuPaperSxFromTheme } from '../../../lib/ui/formSurface';
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
  onCancelRequest: (id: string) => void;
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
  onCancelRequest,
  onDisconnect,
  onBlock,
}: DirectoryRowActionsProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const pillHeight = { xs: 38, sm: 34 };
  const pillPadding = { xs: 1.25, sm: 1.4 };
  const pillBorderRadius = 1.5;

  const secondaryButtonSx = {
    border: '1px solid rgba(156,187,217,0.4)',
    color: theme.palette.text.primary,
    backgroundColor: 'transparent',
    minHeight: pillHeight,
    px: pillPadding,
    borderRadius: pillBorderRadius,
    cursor: 'pointer',
    '& .MuiButton-startIcon, & .MuiButton-endIcon': { mx: 0 },
    '&:hover': {
      backgroundColor: 'rgba(156,187,217,0.08)',
      borderColor: 'rgba(156,187,217,0.55)',
    },
    '&.Mui-disabled': {
      borderColor: 'rgba(156,187,217,0.25)',
      color: 'rgba(255,255,255,0.5)',
    },
  } as const;

  const primaryButtonSx = {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    minHeight: pillHeight,
    px: pillPadding,
    borderRadius: pillBorderRadius,
    boxShadow: 'none',
    cursor: 'pointer',
    '& .MuiButton-startIcon, & .MuiButton-endIcon': { mx: 0 },
    '&:hover': {
      backgroundColor: theme.palette.primary.dark,
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    },
    '&.Mui-disabled': {
      backgroundColor: 'rgba(156,187,217,0.35)',
      color: 'rgba(255,255,255,0.7)',
    },
  } as const;

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={0.9}
      flexShrink={0}
      alignItems={{ xs: 'stretch', sm: 'center' }}
      sx={{ width: { xs: '100%', sm: 'auto' } }}
    >
      {member.connection_state === 'pending_received' && (
        <Chip
          icon={<HourglassTopIcon fontSize="small" />}
          label={connectionStateLabel[member.connection_state]}
          sx={{
            height: pillHeight,
            fontWeight: 600,
            cursor: 'default',
            backgroundColor: alpha(theme.palette.warning.main, 0.12),
            color: theme.palette.warning.main,
            border: 'none',
            '& .MuiChip-icon': { color: 'inherit' },
          }}
        />
      )}
      {member.connection_state === 'not_connected' && (
        <Button
          variant="outlined"
          size="small"
          startIcon={<PersonAddIcon />}
          onClick={() => onConnect(member.id)}
          disabled={busy}
          sx={{
            ...secondaryButtonSx,
            borderColor: 'rgba(141,188,229,0.5)',
            color: 'white',
            '&:hover': {
              ...secondaryButtonSx['&:hover'],
              borderColor: 'rgba(141,188,229,0.7)',
              backgroundColor: 'rgba(141,188,229,0.1)',
            },
          }}
        >
          Connect
        </Button>
      )}
      {member.connection_state === 'pending' && (
        <>
          <Chip
            icon={<HourglassTopIcon fontSize="small" />}
            label={connectionStateLabel[member.connection_state]}
            sx={{
              height: pillHeight,
              fontWeight: 600,
              cursor: 'default',
              backgroundColor: alpha(theme.palette.warning.main, 0.12),
              color: theme.palette.warning.main,
              border: 'none',
              '& .MuiChip-icon': { color: 'inherit' },
            }}
          />
          <Button
            variant="outlined"
            size="small"
            onClick={() => onCancelRequest(member.id)}
            disabled={busy}
            aria-label="Cancel request"
            sx={secondaryButtonSx}
          >
            Cancel request
          </Button>
        </>
      )}
      {member.connection_state === 'pending_received' && (
        <>
          <Button
            variant="contained"
            size="small"
            startIcon={<CheckCircleOutlineIcon />}
            onClick={() => onAccept(member.id)}
            disabled={busy}
            sx={primaryButtonSx}
          >
            Accept
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<BlockIcon />}
            onClick={() => onDecline(member.id)}
            disabled={busy}
            sx={secondaryButtonSx}
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
            sx={{
              height: pillHeight,
              fontWeight: 600,
              cursor: 'default',
              backgroundColor: alpha(theme.palette.success.main, 0.12),
              color: theme.palette.success.main,
              border: 'none',
              '& .MuiChip-icon': { color: 'inherit' },
            }}
          />
          <Button
            variant="contained"
            size="small"
            component={RouterLink}
            to={`/chat?with=${encodeURIComponent(member.id)}&returnTo=${encodeURIComponent('/directory')}`}
            startIcon={<ChatIcon />}
            sx={primaryButtonSx}
          >
            Chat
          </Button>
          {isMobile ? (
            <IconButton
              size="small"
              onClick={(e) => onManageOpen(e.currentTarget)}
              disabled={busy}
              aria-haspopup="true"
              aria-expanded={Boolean(manageAnchor)}
              aria-pressed={Boolean(manageAnchor)}
              aria-label="Manage connection"
              sx={{
                border: '1px solid rgba(156,187,217,0.4)',
                borderRadius: pillBorderRadius,
                color: theme.palette.text.primary,
                minHeight: 38,
                minWidth: 38,
                '&:hover': {
                  backgroundColor: 'rgba(156,187,217,0.08)',
                  borderColor: 'rgba(156,187,217,0.55)',
                },
              }}
            >
              <MoreHorizIcon fontSize="small" />
            </IconButton>
          ) : (
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
              sx={secondaryButtonSx}
            >
              Manage
            </Button>
          )}
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
                  ...denseMenuPaperSxFromTheme(theme),
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
