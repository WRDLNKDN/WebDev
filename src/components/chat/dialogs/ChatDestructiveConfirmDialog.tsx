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
import type { ReactNode } from 'react';
import {
  dialogActionsSafeAreaSx,
  mergeFullScreenDialogPaperSx,
} from '../../../lib/ui/fullScreenDialogSx';

export type ChatDestructiveConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  /** Shown inside `DialogContentText`. */
  body: ReactNode;
  cancelLabel?: string;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
};

export const ChatDestructiveConfirmDialog = ({
  open,
  onClose,
  title,
  body,
  cancelLabel = 'Cancel',
  confirmLabel,
  onConfirm,
}: ChatDestructiveConfirmDialogProps) => {
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
        {title}
        <Tooltip title="Close">
          <span>
            <IconButton
              aria-label="Close"
              onClick={onClose}
              sx={{ color: 'rgba(255,255,255,0.75)' }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </DialogTitle>
      <DialogContent>
        <DialogContentText component="div">{body}</DialogContentText>
      </DialogContent>
      <DialogActions sx={dialogActionsSafeAreaSx(isSmDown)}>
        <Button onClick={onClose}>{cancelLabel}</Button>
        <Button
          onClick={() => void handleConfirm()}
          color="error"
          variant="contained"
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
