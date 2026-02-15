import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  Typography,
} from '@mui/material';

interface WeirdlingDeleteConfirmDialogProps {
  open: boolean;
  weirdlingName?: string;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

/**
 * Confirmation modal before deleting a Weirdling. Ensures no accidental removal.
 */
export const WeirdlingDeleteConfirmDialog = ({
  open,
  weirdlingName = 'this Weirdling',
  onClose,
  onConfirm,
  loading = false,
}: WeirdlingDeleteConfirmDialogProps) => (
  <Dialog
    open={open}
    onClose={onClose}
    maxWidth="xs"
    fullWidth
    PaperProps={{
      sx: {
        bgcolor: 'background.paper',
        borderRadius: 2,
        border: '1px solid rgba(255,255,255,0.1)',
      },
    }}
  >
    <DialogTitle>Delete Weirdling?</DialogTitle>
    <DialogContent>
      <Typography variant="body2" color="text.secondary">
        This will remove {weirdlingName} from your profile. Your avatar will
        revert to your profile photo or default.
      </Typography>
    </DialogContent>
    <DialogActions sx={{ px: 3, pb: 2 }}>
      <Button
        onClick={onClose}
        disabled={loading}
        sx={{ textTransform: 'none' }}
      >
        Cancel
      </Button>
      <Button
        variant="contained"
        color="error"
        onClick={onConfirm}
        disabled={loading}
        sx={{ textTransform: 'none' }}
      >
        {loading ? 'Deleting…' : 'Delete'}
      </Button>
    </DialogActions>
  </Dialog>
);
