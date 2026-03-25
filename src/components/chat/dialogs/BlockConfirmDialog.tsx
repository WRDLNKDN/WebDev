import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Tooltip,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import {
  dialogActionsSafeAreaSx,
  mergeFullScreenDialogPaperSx,
} from '../../../lib/ui/fullScreenDialogSx';

type BlockConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  displayName?: string;
};

export const BlockConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  displayName = 'this member',
}: BlockConfirmDialogProps) => {
  const theme = useTheme();
  const isSmDown = useMediaQuery(theme.breakpoints.down('sm'));

  const handleConfirm = async () => {
    await onConfirm();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={isSmDown}
      PaperProps={{
        sx: mergeFullScreenDialogPaperSx(isSmDown, {}),
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pr: 1,
        }}
      >
        Block {displayName}
        <Tooltip title="Close">
          <IconButton
            aria-label="Close"
            onClick={onClose}
            sx={{ color: 'rgba(255,255,255,0.75)' }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          Blocking will remove your connection with {displayName} and prevent
          future interactions. You can unblock later in Settings.
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={dialogActionsSafeAreaSx(isSmDown)}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => void handleConfirm()}
          color="error"
          variant="contained"
        >
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
};
