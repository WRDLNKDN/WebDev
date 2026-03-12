import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import EmailIcon from '@mui/icons-material/Email';
import LinkIcon from '@mui/icons-material/Link';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useEffect, useRef } from 'react';
import { shouldCloseDialogFromReason } from '../../../lib/ui/dialogFormUtils';

const GLASS_MODAL = {
  bgcolor: '#141414',
  backgroundImage:
    'linear-gradient(rgba(56,132,210,0.12), rgba(255,255,255,0))',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(156,187,217,0.22)',
  color: 'white',
  borderRadius: 3,
};

export type SettingsDialogProps = {
  open: boolean;
  onClose: () => void;
  onEditProfile: () => void;
  onManageLinks: () => void;
  onEmailPreferences?: () => void;
};

export const SettingsDialog = ({
  open,
  onClose,
  onEditProfile,
  onManageLinks,
  onEmailPreferences,
}: SettingsDialogProps) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const primaryActionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const focusHandle = window.setTimeout(() => {
      primaryActionRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(focusHandle);
  }, [open]);

  const handleEditProfile = () => {
    onEditProfile();
    onClose();
  };

  const handleManageLinks = () => {
    onManageLinks();
    onClose();
  };

  const handleEmailPreferences = () => {
    onEmailPreferences?.();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={(_event, reason) => {
        if (shouldCloseDialogFromReason(reason)) onClose();
      }}
      maxWidth="sm"
      fullWidth
      fullScreen={fullScreen}
      aria-label="Settings"
      PaperProps={{ sx: GLASS_MODAL }}
    >
      <Tooltip title="Close">
        <IconButton
          aria-label="Close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            zIndex: 1,
            color: 'white',
          }}
        >
          <CloseIcon />
        </IconButton>
      </Tooltip>
      <DialogTitle sx={{ pr: 6, pb: 0.5 }}>Settings</DialogTitle>
      <DialogContent sx={{ pt: 1.5, px: 0, pb: 0 }}>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ px: 3, pb: 1.5 }}
        >
          Use Esc to close, or jump straight into the next edit flow.
        </Typography>
        <List disablePadding>
          <ListItemButton
            ref={primaryActionRef}
            onClick={handleEditProfile}
            sx={{ py: 2, borderBottom: '1px solid rgba(56,132,210,0.14)' }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <EditIcon sx={{ color: 'primary.main' }} />
            </ListItemIcon>
            <ListItemText
              primary="Edit profile"
              secondary="Handle, tagline, bio, avatar"
            />
          </ListItemButton>
          <ListItemButton
            onClick={handleManageLinks}
            sx={{ py: 2, borderBottom: '1px solid rgba(56,132,210,0.14)' }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <LinkIcon sx={{ color: 'primary.main' }} />
            </ListItemIcon>
            <ListItemText
              primary="Manage links"
              secondary="Social and professional links"
            />
          </ListItemButton>
          {onEmailPreferences && (
            <ListItemButton onClick={handleEmailPreferences} sx={{ py: 2 }}>
              <ListItemIcon sx={{ minWidth: 40 }}>
                <EmailIcon sx={{ color: 'primary.main' }} />
              </ListItemIcon>
              <ListItemText
                primary="Email preferences"
                secondary="Marketing, product updates, events"
              />
            </ListItemButton>
          )}
        </List>
      </DialogContent>
    </Dialog>
  );
};
