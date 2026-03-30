import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

type Props = {
  open: boolean;
  title: string;
  text: string;
  onClose: () => void;
};

export const PolicyDialog = ({ open, title, text, onClose }: Props) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {title}
        <Tooltip title="Close">
          <span>
            <IconButton aria-label="Close" onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </span>
        </Tooltip>
      </DialogTitle>

      <DialogContent dividers>
        <Typography
          component="div"
          sx={{
            whiteSpace: 'pre-wrap',
            lineHeight: 1.6,
            fontSize: '0.95rem',
          }}
        >
          {text.trim()}
        </Typography>
      </DialogContent>
    </Dialog>
  );
};

export default PolicyDialog;
