import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import EmailIcon from '@mui/icons-material/Email';
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
import { dialogPaperSxFromTheme } from '../../../lib/ui/formSurface';
import { mergeFullScreenDialogPaperSx } from '../../../lib/ui/fullScreenDialogSx';

export type SettingsDialogProps = {
  open: boolean;
  onClose: () => void;
  onEditProfile: () => void;
  onEmailPreferences?: () => void;
};

export const SettingsDialog = ({
  open,
  onClose,
  onEditProfile,
  onEmailPreferences,
}: SettingsDialogProps) => {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
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
      PaperProps={{
        sx: mergeFullScreenDialogPaperSx(
          fullScreen,
          dialogPaperSxFromTheme(theme, { borderRadius: 3 }),
        ),
      }}
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
            color: isLight ? 'text.secondary' : 'white',
          }}
        >
          <CloseIcon />
        </IconButton>
      </Tooltip>
      <DialogTitle sx={{ pr: 6, pb: 0.5 }}>Settings</DialogTitle>
      <DialogContent
        sx={{
          pt: 1.5,
          px: 0,
          pb: fullScreen ? 'calc(12px + env(safe-area-inset-bottom, 0px))' : 0,
        }}
      >
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
            sx={{
              py: 2,
              borderBottom: `1px solid ${isLight ? theme.palette.divider : 'rgba(56,132,210,0.14)'}`,
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <EditIcon sx={{ color: 'primary.main' }} />
            </ListItemIcon>
            <ListItemText
              primary="Edit profile"
              secondary="User name, bio, pronouns, avatar"
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
