import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import LinkIcon from '@mui/icons-material/Link';
import {
  Dialog,
  DialogContent,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material';

const GLASS_MODAL = {
  bgcolor: '#141414',
  backgroundImage:
    'linear-gradient(rgba(255,255,255,0.05), rgba(255,255,255,0))',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'white',
  borderRadius: 3,
};

export type SettingsDialogProps = {
  open: boolean;
  onClose: () => void;
  onEditProfile: () => void;
  onManageLinks: () => void;
};

export const SettingsDialog = ({
  open,
  onClose,
  onEditProfile,
  onManageLinks,
}: SettingsDialogProps) => {
  const handleEditProfile = () => {
    onEditProfile();
    onClose();
  };

  const handleManageLinks = () => {
    onManageLinks();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-label="Settings"
      PaperProps={{ sx: GLASS_MODAL }}
    >
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
      <DialogContent sx={{ pt: 5, px: 0, pb: 0 }}>
        <List disablePadding>
          <ListItemButton
            onClick={handleEditProfile}
            sx={{ py: 2, borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <EditIcon sx={{ color: 'primary.main' }} />
            </ListItemIcon>
            <ListItemText
              primary="Edit profile"
              secondary="Handle, tagline, bio, avatar"
            />
          </ListItemButton>
          <ListItemButton onClick={handleManageLinks} sx={{ py: 2 }}>
            <ListItemIcon sx={{ minWidth: 40 }}>
              <LinkIcon sx={{ color: 'primary.main' }} />
            </ListItemIcon>
            <ListItemText
              primary="Manage links"
              secondary="Social and professional links"
            />
          </ListItemButton>
        </List>
      </DialogContent>
    </Dialog>
  );
};
