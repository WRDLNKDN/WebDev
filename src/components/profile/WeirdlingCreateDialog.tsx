import { Dialog, DialogContent, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { WeirdlingCreate } from '../../pages/weirdling/WeirdlingCreate';

interface WeirdlingCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const WeirdlingCreateDialog = ({
  open,
  onClose,
  onSuccess,
}: WeirdlingCreateDialogProps) => {
  const handleSuccess = () => {
    onSuccess?.();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      scroll="paper"
      aria-label="Add my Weirdling"
      PaperProps={{
        sx: {
          bgcolor: 'background.default',
          maxHeight: '90vh',
          borderRadius: 2,
        },
      }}
    >
      <IconButton
        aria-label="Close"
        onClick={onClose}
        size="small"
        sx={{
          position: 'absolute',
          right: 8,
          top: 8,
          zIndex: 1,
        }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>
      <DialogContent sx={{ pt: 4, px: 2.5, pb: 2.5 }}>
        <WeirdlingCreate onClose={onClose} onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
};
