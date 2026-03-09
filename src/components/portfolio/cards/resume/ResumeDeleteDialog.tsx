import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';

type ResumeDeleteDialogProps = {
  open: boolean;
  deleteBusy?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export const ResumeDeleteDialog = ({
  open,
  deleteBusy = false,
  onClose,
  onConfirm,
}: ResumeDeleteDialogProps) => (
  <Dialog
    open={open}
    onClose={() => !deleteBusy && onClose()}
    aria-labelledby="resume-delete-dialog-title"
    aria-describedby="resume-delete-dialog-description"
  >
    <DialogTitle id="resume-delete-dialog-title">Delete resume</DialogTitle>
    <DialogContent id="resume-delete-dialog-description">
      <Typography>Are you sure you want to delete your resume?</Typography>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} disabled={deleteBusy}>
        Cancel
      </Button>
      <Button
        color="error"
        variant="contained"
        onClick={onConfirm}
        disabled={deleteBusy}
      >
        {deleteBusy ? 'Deleting…' : 'Delete'}
      </Button>
    </DialogActions>
  </Dialog>
);
