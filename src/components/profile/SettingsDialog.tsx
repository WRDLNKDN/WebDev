import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import LinkIcon from '@mui/icons-material/Link';
import SettingsIcon from '@mui/icons-material/Settings';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
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
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: GLASS_MODAL }}
    >
      <DialogTitle
        sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)', p: 2 }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <SettingsIcon /> Settings
          </Typography>
          <IconButton
            onClick={onClose}
            sx={{ color: 'white' }}
            aria-label="Close"
          >
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ p: 0 }}>
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
