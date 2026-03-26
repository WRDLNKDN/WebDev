import CloseIcon from '@mui/icons-material/Close';
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
import {
  dialogActionsSafeAreaSx,
  mergeFullScreenDialogPaperSx,
} from '../../../lib/ui/fullScreenDialogSx';

type RemoveChatConfirmDialogProps = {
  open: boolean;
  roomLabel: string;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
};

export const RemoveChatConfirmDialog = ({
  open,
  roomLabel,
  onClose,
  onConfirm,
}: RemoveChatConfirmDialogProps) => {
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
        Remove conversation
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
          Are you sure you want to remove{' '}
          <strong>{roomLabel || 'this conversation'}</strong> from your
          messages? It will disappear from your list; you can start a new chat
          with the same people later if you need to.
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={dialogActionsSafeAreaSx(isSmDown)}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => void handleConfirm()}
          color="error"
          variant="contained"
        >
          Remove
        </Button>
      </DialogActions>
    </Dialog>
  );
};
